import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import fs from "fs";
import path from "path";
import { runGCContentAnalysis, runMSAAnalysis, runPhylogenyAnalysis } from "./analyses";

const upload = multer({ dest: '/tmp/uploads' });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Sequences
  app.get(api.sequences.list.path, async (req, res) => {
    const sequences = await storage.getSequences();
    res.json(sequences);
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
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const fastaFile = files['fasta']?.[0];
      const metadataFile = files['metadata']?.[0];

      if (!fastaFile) {
        return res.status(400).json({ message: 'Missing FASTA file' });
      }

      const fastaContent = await fs.promises.readFile(fastaFile.path, 'utf-8');
      let metadata: Record<string, any>[] = [];

      if (metadataFile) {
        const metadataContent = await fs.promises.readFile(metadataFile.path, 'utf-8');
        // Lightweight CSV parser that normalizes headers and strips quotes
        const lines = metadataContent.split(/\r?\n/).filter(l => l.trim());
        if (lines.length > 0) {
          const rawHeaders = lines[0].split(',');
          const headers = rawHeaders.map(h => h.trim().replace(/^\"|\"$/g, '').toLowerCase());
          metadata = lines.slice(1).map(line => {
            const values = line.split(',');
            const obj: Record<string, any> = {};
            headers.forEach((h, i) => {
              const raw = values[i] ?? '';
              obj[h] = String(raw).trim().replace(/^\"|\"$/g, '');
            });
            return obj;
          }).filter(m => Object.keys(m).length > 0);
        }
      }

      // Parse FASTA
      // >Accession
      // ACGT...
      const sequencesList = fastaContent.split('>').slice(1).map(block => {
        const lines = block.split('\n');
        const header = lines[0].trim();
        const accession = header.split(' ')[0]; // simple logic
        const seq = lines.slice(1).join('').replace(/\s/g, '');
        
        // Find metadata
        // metadata keys are normalized to lowercase in parser
        const meta = metadata.find(m => {
          return (
            m.accession === accession ||
            m['sequence_id'] === accession ||
            m.sequenceid === accession ||
            m['sequence id'] === accession
          );
        }) || {};

        return {
          accession,
          sequence: seq,
          sequenceId: meta['sequence_id'] || meta.sequenceid || undefined,
          samplingDate: meta['sampling_date'] || meta['samplingdate'] || meta['sampling date'] || undefined,
          country: meta.country || undefined,
          genotype: meta.genotype || undefined,
          outbreak: meta.outbreak || undefined,
          metadata: meta,
          filename: fastaFile.originalname
        };
      });

      let count = 0;
      let skipped = 0;
      for (const seq of sequencesList) {
        try {
          await storage.createSequence(seq);
          count++;
        } catch (err: any) {
          // Skip duplicates, report others
          if (err && err.code === 'DUPLICATE_ACCESSION') {
            skipped++;
            continue;
          }
          throw err;
        }
      }

      // Cleanup
      await fs.promises.unlink(fastaFile.path);
      if (metadataFile) await fs.promises.unlink(metadataFile.path);

      const message = skipped > 0 ? `Uploaded ${count} sequences, skipped ${skipped} duplicates` : `Uploaded ${count} sequences`;
      res.status(201).json({ count, skipped, message });
    } catch (err) {
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
      const input = api.analyses.create.input.parse(req.body);
      const analysis = await storage.createAnalysis({
        ...input,
        status: 'pending',
        results: {}
      });

      // Run analysis in background
      runAnalysis(analysis.id, input.type, input.sequenceIds);

      res.status(201).json(analysis);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  return httpServer;
}

async function runAnalysis(analysisId: number, type: string, sequenceIds: number[]) {
  try {
    await storage.updateAnalysisStatus(analysisId, 'running');

    // Fetch sequences
    const sequences = await storage.getSequencesByIds(sequenceIds);

    // Dispatch to appropriate analysis handler
    if (type === 'GC Content') {
      await runGCContentAnalysis(analysisId, sequences, storage);
    } else if (type === 'MSA' || type === 'Multiple Sequence Alignment' || type === 'msa') {
      await runMSAAnalysis(analysisId, sequences, storage);
    } else if (type === 'Phylogeny') {
      await runPhylogenyAnalysis(analysisId, sequences, storage);
    } else {
      throw new Error(`Unknown analysis type: ${type}`);
    }

  } catch (err) {
    console.error("Analysis failed", err);
    await storage.updateAnalysisStatus(analysisId, 'failed', { error: String(err) });
  }
}
