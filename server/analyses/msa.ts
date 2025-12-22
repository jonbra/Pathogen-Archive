import { type AnalysisSequence, type AnalysisHandler } from "./types";
import { executeInCondaEnv, getSetupInstructions } from "./conda";
import fs from "fs";
import path from "path";
import { log } from "../index";

/**
 * Multiple Sequence Alignment using MAFFT.
 * 
 * Aligns input sequences using MAFFT with automatic algorithm selection.
 * Executes within conda environment if available, falls back to system PATH.
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
    log(`MSA: Starting analysis for ${sequences.length} sequences`, "msa");
    await fs.promises.mkdir(workdir, { recursive: true });

    // Write input FASTA
    const fastaContent = sequences.map(s => `>${s.accession}\n${s.sequence}`).join('\n');
    await fs.promises.writeFile(inputFasta, fastaContent);
    log(`MSA: Wrote ${sequences.length} sequences to ${inputFasta}`, "msa");

    // Run MAFFT with auto algorithm selection
    const msaCommand = `mafft --auto ${inputFasta} > ${outputFasta}`;
    log(`MSA: Executing: ${msaCommand}`, "msa");
    
    try {
      await executeInCondaEnv(msaCommand, "bioinformatics", workdir);
      log(`MSA: MAFFT completed successfully`, "msa");
    } catch (condaErr) {
      const setupInfo = getSetupInstructions();
      const errorMsg = `MAFFT execution failed. ${setupInfo}`;
      log(errorMsg, "msa");
      throw new Error(errorMsg);
    }

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

    log(`MSA: Alignment complete - ${alignedSequences.length} sequences, length ${results.alignmentLength}`, "msa");
    await storage.updateAnalysisStatus(analysisId, 'completed', results);

    // Cleanup
    await fs.promises.rm(workdir, { recursive: true, force: true });
  } catch (err) {
    log(`MSA: Analysis failed: ${err}`, "msa");
    await fs.promises.rm(workdir, { recursive: true, force: true }).catch(() => {});
    await storage.updateAnalysisStatus(analysisId, 'failed', { error: String(err) });
    throw err;
  }
};
