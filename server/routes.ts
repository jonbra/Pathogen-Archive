import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import fs from "fs";
import path from "path";
import { runMSAAnalysis, runPhylogenyAnalysis, runBlastAnalysis } from "./analyses";
import microreactRoutes from "./routes-microreact";
import searchRoutes from "./routes-search";
import { parseFASTA, parseCSV, csvToMetadata } from "./utils/fasta-parser";

const upload = multer({
  dest: '/tmp/uploads',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
    files: 2, // Max 2 files (FASTA + metadata)
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Sequences
  app.get(api.sequences.list.path, async (req, res) => {
    const sequences = await storage.getSequences();
    res.json(sequences);
  });

  app.get("/api/sequences/genotypes", async (_req, res) => {
    const genotypes = await storage.getUniqueGenotypes();
    res.json(genotypes);
  });

  app.get("/api/sequences/countries", async (_req, res) => {
    const countries = await storage.getUniqueCountries();
    res.json(countries);
  });

  app.get(api.sequences.search.path, async (req, res) => {
    const { sequenceId, samplingDate, country, genotype, outbreak, requireComplete } = req.query;
    const result = await storage.searchSequences({
      sequenceId: sequenceId as string | undefined,
      samplingDate: samplingDate as string | undefined,
      country: country as string | undefined,
      genotype: genotype as string | undefined,
      outbreak: outbreak as string | undefined,
      requireComplete: requireComplete === 'true'
    });
    res.json(result);
  });

  app.post(api.sequences.upload.path, upload.fields([{ name: 'fasta' }, { name: 'metadata' }]), async (req, res) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const fastaFile = files['fasta']?.[0];
    const metadataFile = files['metadata']?.[0];

    // Cleanup helper
    const cleanup = async () => {
      try {
        if (fastaFile?.path) await fs.promises.unlink(fastaFile.path).catch(() => {});
        if (metadataFile?.path) await fs.promises.unlink(metadataFile.path).catch(() => {});
      } catch (e) {
        console.error("[CLEANUP] Error removing temp files:", e);
      }
    };

    try {
      if (!fastaFile) {
        await cleanup();
        return res.status(400).json({ error: 'Missing FASTA file' });
      }

      const fastaContent = await fs.promises.readFile(fastaFile.path, 'utf-8');
      let metadata: Record<string, any>[] = [];

      if (metadataFile) {
        const metadataContent = await fs.promises.readFile(metadataFile.path, 'utf-8');
        const csvRows = parseCSV(metadataContent);
        metadata = csvToMetadata(csvRows);
      }

      // Parse FASTA with validation
      const fastaEntries = parseFASTA(fastaContent);
      if (fastaEntries.length === 0) {
        await cleanup();
        return res.status(400).json({ error: 'No valid sequences found in FASTA file' });
      }

      // Map FASTA to sequences with metadata
      const sequencesList = fastaEntries.map(entry => {
        const meta = metadata.find(m => {
          const metaAccession = m.accession || m['sequence_id'] || m.sequenceid || '';
          return metaAccession.toLowerCase() === entry.accession.toLowerCase();
        }) || {};

        return {
          accession: entry.accession,
          sequence: entry.sequence,
          sequenceId: meta['sequence_id'] || meta.sequenceid || undefined,
          samplingDate: meta['sampling_date'] || meta['samplingdate'] || undefined,
          country: meta.country || undefined,
          genotype: meta.genotype || undefined,
          outbreak: meta.outbreak || undefined,
          metadata: meta,
          filename: fastaFile.originalname
        };
      });

      let count = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const seq of sequencesList) {
        try {
          await storage.createSequence(seq);
          count++;
        } catch (err: any) {
          if (err?.code === 'DUPLICATE_ACCESSION') {
            skipped++;
          } else {
            errors.push(`${seq.accession}: ${err.message}`);
          }
        }
      }

      await cleanup();

      const message = skipped > 0 
        ? `Uploaded ${count} sequences, skipped ${skipped} duplicates` 
        : `Uploaded ${count} sequences`;

      res.status(201).json({ count, skipped, message, ...(errors.length && { errors }) });
    } catch (err) {
      await cleanup();
      console.error("[UPLOAD]", err);
      console.error(err);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });

  app.delete(api.sequences.delete.path, async (req, res) => {
    await storage.deleteSequence(Number(req.params.id));
    res.status(204).send();
  });

  // Analyses
  app.get(api.analyses.list.path, async (req, res) => {
    const analyses = await storage.getAnalyses();
    res.json(analyses);
  });

  app.get(api.analyses.get.path, async (req, res) => {
    const analysis = await storage.getAnalysis(Number(req.params.id));
    if (!analysis) return res.status(404).json({ message: 'Not found' });
    res.json(analysis);
  });

  app.post(api.analyses.create.path, async (req, res) => {
    try {
      const input = api.analyses.create.input.parse(req.body) as any;
      const analysis = await storage.createAnalysis({
        type: input.type,
        parameters: input.parameters,
        status: 'pending',
        results: {}
      });

      // Run analysis in background
      runAnalysis(analysis.id, input.type, input.sequenceIds, input.parameters);

      res.status(201).json(analysis);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Register Microreact routes
  app.use("/api", microreactRoutes);
  app.use("/api", searchRoutes);

  return httpServer;
}

async function runAnalysis(analysisId: number, type: string, sequenceIds: number[], parameters: Record<string, any> = {}) {
  const startTime = Date.now();
  const TIMEOUT = 5 * 60 * 1000; // 5 minute timeout for analyses

  const timeout = setTimeout(async () => {
    console.error(`[ANALYSIS] Timeout for analysis ${analysisId}`);
    await storage.updateAnalysisStatus(analysisId, 'failed', { error: 'Analysis timeout (5 minutes)' }).catch(e => console.error(e));
  }, TIMEOUT);

  try {
    await storage.updateAnalysisStatus(analysisId, 'running');
    console.log(`[ANALYSIS] Started ${type} analysis ${analysisId}`);

    if (type === 'Phylogeny') {
      await runPhylogenyAnalysis(analysisId, [], storage, parameters);
    } else if (type === 'blastn') {
      const sequences = await storage.getSequencesByIds(sequenceIds);
      await runBlastAnalysis(analysisId, sequences, storage, parameters);
    } else if (type === 'msa' || type === 'MSA' || type === 'Multiple Sequence Alignment') {
      const sequences = await storage.getSequencesByIds(sequenceIds);
      await runMSAAnalysis(analysisId, sequences, storage);
    } else {
      throw new Error(`Unknown analysis type: ${type}`);
    }

    clearTimeout(timeout);
    const duration = Date.now() - startTime;
    console.log(`[ANALYSIS] Completed ${type} analysis ${analysisId} in ${duration}ms`);

  } catch (err: any) {
    clearTimeout(timeout);
    console.error(`[ANALYSIS] Failed ${type} analysis ${analysisId}:`, err.message);
    await storage.updateAnalysisStatus(analysisId, 'failed', { error: err.message }).catch(e => console.error(e));
  }
}
