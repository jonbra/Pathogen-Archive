import { type AnalysisSequence, type AnalysisHandler } from "./types";
import { executeInCondaEnv, getSetupInstructions } from "./conda";
import fs from "fs";
import path from "path";
import { log } from "../index";

/**
 * Phylogenetic tree construction using MAFFT + IQ-TREE.
 * 
 * Pipeline:
 * 1. Multiple sequence alignment with MAFFT
 * 2. Phylogenetic inference with IQ-TREE using GTR+G model
 * 
 * Executes within conda environment if available, falls back to system PATH.
 * 
 * Results:
 * - type: "Phylogeny"
 * - sequenceCount: Number of sequences in analysis
 * - tree: Newick format phylogenetic tree
 * - method: Model and method used (GTR+G with IQ-TREE)
 * - timestamp: ISO timestamp of analysis
 */
export const runPhylogenyAnalysis: AnalysisHandler = async (analysisId, sequences, storage) => {
  const workdir = `/tmp/phylo_${analysisId}`;
  const inputFasta = path.join(workdir, 'input.fasta');
  const msaFasta = path.join(workdir, 'msa.fasta');
  const treeFile = path.join(workdir, 'msa.fasta.treefile');

  try {
    log(`Phylogeny: Starting analysis for ${sequences.length} sequences`, "phylogeny");
    await fs.promises.mkdir(workdir, { recursive: true });

    // Write input FASTA
    const fastaContent = sequences.map(s => `>${s.accession}\n${s.sequence}`).join('\n');
    await fs.promises.writeFile(inputFasta, fastaContent);
    log(`Phylogeny: Wrote ${sequences.length} sequences to ${inputFasta}`, "phylogeny");

    // Step 1: MSA with MAFFT
    const msaCommand = `mafft --auto ${inputFasta} > ${msaFasta}`;
    log(`Phylogeny: Running MSA: ${msaCommand}`, "phylogeny");
    
    try {
      await executeInCondaEnv(msaCommand, "bioinformatics", workdir);
      log(`Phylogeny: MAFFT completed`, "phylogeny");
    } catch (msaErr) {
      const setupInfo = getSetupInstructions();
      const errorMsg = `MAFFT execution failed. ${setupInfo}`;
      log(errorMsg, "phylogeny");
      throw new Error(errorMsg);
    }

    // Step 2: Phylogeny with IQ-TREE (GTR+G model, automatic threading)
    const iqtreeCommand = `iqtree2 -s ${msaFasta} -m GTR+G -nt AUTO -quiet`;
    log(`Phylogeny: Running IQ-TREE: ${iqtreeCommand}`, "phylogeny");
    
    try {
      await executeInCondaEnv(iqtreeCommand, "bioinformatics", workdir);
      log(`Phylogeny: IQ-TREE completed`, "phylogeny");
    } catch (iqErr) {
      const setupInfo = getSetupInstructions();
      const errorMsg = `IQ-TREE execution failed. ${setupInfo}`;
      log(errorMsg, "phylogeny");
      throw new Error(errorMsg);
    }

    // Parse tree file
    let treeContent = '';
    if (fs.existsSync(treeFile)) {
      treeContent = await fs.promises.readFile(treeFile, 'utf-8');
      log(`Phylogeny: Tree file found and read`, "phylogeny");
    } else {
      log(`Phylogeny: Tree file not found at ${treeFile}`, "phylogeny");
      throw new Error(`Tree file not generated: ${treeFile}`);
    }

    const results = {
      type: 'Phylogeny',
      sequenceCount: sequences.length,
      tree: treeContent.trim(),
      method: 'GTR+G model with IQ-TREE',
      timestamp: new Date().toISOString()
    };

    log(`Phylogeny: Analysis complete`, "phylogeny");
    await storage.updateAnalysisStatus(analysisId, 'completed', results);

    // Cleanup
    await fs.promises.rm(workdir, { recursive: true, force: true });
  } catch (err) {
    log(`Phylogeny: Analysis failed: ${err}`, "phylogeny");
    await fs.promises.rm(workdir, { recursive: true, force: true }).catch(() => {});
    await storage.updateAnalysisStatus(analysisId, 'failed', { error: String(err) });
    throw err;
  }
};
