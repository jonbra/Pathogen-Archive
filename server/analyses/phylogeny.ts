import { type AnalysisSequence, type AnalysisHandler } from "./types";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

/**
 * Phylogenetic tree construction using MAFFT + IQ-TREE.
 * 
 * Pipeline:
 * 1. Multiple sequence alignment with MAFFT
 * 2. Phylogenetic inference with IQ-TREE using GTR+G model
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
  const treeFile = path.join(workdir, 'tree.treefile');

  try {
    await fs.promises.mkdir(workdir, { recursive: true });

    // Write input FASTA
    const fastaContent = sequences.map(s => `>${s.accession}\n${s.sequence}`).join('\n');
    await fs.promises.writeFile(inputFasta, fastaContent);

    // Step 1: MSA with MAFFT
    await execAsync(`mafft --auto ${inputFasta} > ${msaFasta}`, { cwd: workdir });

    // Step 2: Phylogeny with IQ-TREE (GTR+G model, automatic threading)
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
};
