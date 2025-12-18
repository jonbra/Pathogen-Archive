import { type AnalysisSequence, type AnalysisHandler } from "./types";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

/**
 * Multiple Sequence Alignment using MAFFT.
 * 
 * Aligns input sequences using MAFFT with automatic algorithm selection.
 * 
 * Results:
 * - type: "Multiple Sequence Alignment"
 * - alignmentLength: Length of aligned sequences (with gaps)
 * - sequenceCount: Number of sequences aligned
 * - sequences: Array of aligned sequences {accession, sequence}
 */
export const runMSAAnalysis: AnalysisHandler = async (analysisId, sequences, storage) => {
  const workdir = `/tmp/msa_${analysisId}`;
  const inputFasta = path.join(workdir, 'input.fasta');
  const outputFasta = path.join(workdir, 'output.fasta');

  try {
    await fs.promises.mkdir(workdir, { recursive: true });

    // Write input FASTA
    const fastaContent = sequences.map(s => `>${s.accession}\n${s.sequence}`).join('\n');
    await fs.promises.writeFile(inputFasta, fastaContent);

    // Run MAFFT with auto algorithm selection
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
};
