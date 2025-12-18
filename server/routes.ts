import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
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
        // Simple CSV parser
        const lines = metadataContent.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        metadata = lines.slice(1).filter(l => l.trim()).map(line => {
          const values = line.split(',');
          const obj: Record<string, any> = {};
          headers.forEach((h, i) => {
            obj[h] = values[i]?.trim();
          });
          return obj;
        });
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
        const meta = metadata.find(m => m.Accession === accession || m.id === accession) || {};
        
        return {
          accession,
          sequence: seq,
          metadata: meta,
          filename: fastaFile.originalname
        };
      });

      let count = 0;
      for (const seq of sequencesList) {
        await storage.createSequence(seq);
        count++;
      }

      // Cleanup
      await fs.promises.unlink(fastaFile.path);
      if (metadataFile) await fs.promises.unlink(metadataFile.path);

      res.status(201).json({ count, message: `Uploaded ${count} sequences` });
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

    if (type === 'GC Content') {
      await runGCContentAnalysis(analysisId, sequences);
    } else if (type === 'MSA' || type === 'Multiple Sequence Alignment') {
      await runMSAAnalysis(analysisId, sequences);
    } else if (type === 'Phylogeny') {
      await runPhylogenyAnalysis(analysisId, sequences);
    } else {
      throw new Error(`Unknown analysis type: ${type}`);
    }

  } catch (err) {
    console.error("Analysis failed", err);
    await storage.updateAnalysisStatus(analysisId, 'failed', { error: String(err) });
  }
}

async function runGCContentAnalysis(analysisId: number, sequences: any[]) {
  const results = {
    type: 'GC Content',
    data: sequences.map(s => ({
      accession: s.accession,
      gcContent: ((s.sequence.match(/[GCgc]/g) || []).length / s.sequence.length) * 100
    }))
  };
  const summary = results.data.map(d => d.gcContent);
  results['mean'] = summary.reduce((a, b) => a + b, 0) / summary.length;
  await storage.updateAnalysisStatus(analysisId, 'completed', results);
}

async function runMSAAnalysis(analysisId: number, sequences: any[]) {
  const workdir = `/tmp/msa_${analysisId}`;
  const inputFasta = path.join(workdir, 'input.fasta');
  const outputFasta = path.join(workdir, 'output.fasta');

  try {
    await fs.promises.mkdir(workdir, { recursive: true });

    // Write input FASTA
    const fastaContent = sequences.map(s => `>${s.accession}\n${s.sequence}`).join('\n');
    await fs.promises.writeFile(inputFasta, fastaContent);

    // Run MAFFT
    await execAsync(`mafft --auto ${inputFasta} > ${outputFasta}`, { cwd: workdir });

    // Parse aligned sequences
    const alignedContent = await fs.promises.readFile(outputFasta, 'utf-8');
    const alignedSequences = alignedContent.split('>').slice(1).map(block => {
      const lines = block.split('\n');
      const accession = lines[0].trim();
      const sequence = lines.slice(1).join('').replace(/\s/g, '');
      return { accession, sequence };
    });

    const results = {
      type: 'Multiple Sequence Alignment',
      alignmentLength: alignedSequences[0]?.sequence.length || 0,
      sequenceCount: alignedSequences.length,
      sequences: alignedSequences
    };

    await storage.updateAnalysisStatus(analysisId, 'completed', results);

    // Cleanup
    await fs.promises.rm(workdir, { recursive: true, force: true });
  } catch (err) {
    console.error("MSA failed:", err);
    await fs.promises.rm(workdir, { recursive: true, force: true });
    throw err;
  }
}

async function runPhylogenyAnalysis(analysisId: number, sequences: any[]) {
  const workdir = `/tmp/phylo_${analysisId}`;
  const inputFasta = path.join(workdir, 'input.fasta');
  const msaFasta = path.join(workdir, 'msa.fasta');
  const treeFile = path.join(workdir, 'tree.treefile');

  try {
    await fs.promises.mkdir(workdir, { recursive: true });

    // Write input FASTA
    const fastaContent = sequences.map(s => `>${s.accession}\n${s.sequence}`).join('\n');
    await fs.promises.writeFile(inputFasta, fastaContent);

    // Step 1: MSA with MAFFT
    await execAsync(`mafft --auto ${inputFasta} > ${msaFasta}`, { cwd: workdir });

    // Step 2: Phylogeny with IQ-TREE
    await execAsync(`iqtree2 -s ${msaFasta} -m GTR+G -nt AUTO -quiet`, { cwd: workdir, timeout: 60000 });

    // Parse tree file
    let treeContent = '';
    const possibleTreeFiles = [
      path.join(workdir, 'msa.fasta.treefile'),
      treeFile
    ];

    for (const file of possibleTreeFiles) {
      if (fs.existsSync(file)) {
        treeContent = await fs.promises.readFile(file, 'utf-8');
        break;
      }
    }

    const results = {
      type: 'Phylogeny',
      sequenceCount: sequences.length,
      tree: treeContent.trim(),
      method: 'GTR+G model with IQ-TREE',
      timestamp: new Date().toISOString()
    };

    await storage.updateAnalysisStatus(analysisId, 'completed', results);

    // Cleanup
    await fs.promises.rm(workdir, { recursive: true, force: true });
  } catch (err) {
    console.error("Phylogeny analysis failed:", err);
    await fs.promises.rm(workdir, { recursive: true, force: true });
    throw err;
  }
}
