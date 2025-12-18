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
    const inputData = {
      type,
      sequences: sequences.map(s => ({
        id: s.id,
        accession: s.accession,
        sequence: s.sequence
      }))
    };

    // Write input to temp file
    const inputPath = path.resolve(`/tmp/analysis_${analysisId}_input.json`);
    const outputPath = path.resolve(`/tmp/analysis_${analysisId}_output.json`);
    await fs.promises.writeFile(inputPath, JSON.stringify(inputData));

    // Run R script
    // Ensure R is installed and script exists
    const scriptPath = path.resolve('server/scripts/analyze.R');
    
    // Check if script exists, if not write a dummy one
    if (!fs.existsSync(scriptPath)) {
        await fs.promises.mkdir(path.dirname(scriptPath), { recursive: true });
        await fs.promises.writeFile(scriptPath, `
library(jsonlite)
args <- commandArgs(trailingOnly = TRUE)
input_path <- args[1]
output_path <- args[2]

data <- fromJSON(input_path)
results <- list()

if (data$type == "GC Content") {
  # Calculate GC content
  results$data <- lapply(data$sequences$sequence, function(seq) {
    len <- nchar(seq)
    gc <- sum(charToRaw(seq) %in% charToRaw("GCgc"))
    return(gc / len * 100)
  })
  results$summary <- summary(unlist(results$data))
} else {
  results$message <- "Unknown analysis type"
}

write_json(results, output_path, auto_unbox = TRUE)
        `);
    }

    try {
        await execAsync(`Rscript ${scriptPath} ${inputPath} ${outputPath}`);
        
        if (fs.existsSync(outputPath)) {
            const results = JSON.parse(await fs.promises.readFile(outputPath, 'utf-8'));
            await storage.updateAnalysisStatus(analysisId, 'completed', results);
            // cleanup
            await fs.promises.unlink(outputPath);
        } else {
            throw new Error("Output file not generated");
        }
    } catch (rError) {
        console.error("R Execution Error:", rError);
        // Fallback to JS analysis if R fails or not installed
        // Simple GC calc in JS
        const results = {
            data: sequences.map(s => {
                const gc = (s.sequence.match(/[GCgc]/g) || []).length;
                return (gc / s.sequence.length) * 100;
            })
        };
        await storage.updateAnalysisStatus(analysisId, 'completed', { 
            message: "R analysis failed, fell back to JS", 
            ...results 
        });
    }

    await fs.promises.unlink(inputPath);

  } catch (err) {
    console.error("Analysis failed", err);
    await storage.updateAnalysisStatus(analysisId, 'failed', { error: String(err) });
  }
}
