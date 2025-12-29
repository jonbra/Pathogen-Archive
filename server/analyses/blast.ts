import { IStorage } from "../storage";
import { AnalysisSequence, AnalysisHandler } from "./types";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

export const runBlastAnalysis: AnalysisHandler = async (analysisId, _sequences, storage, parameters) => {
  const workDir = path.join("/tmp", `blast_${analysisId}`);
  
  try {
    await fs.mkdir(workDir, { recursive: true });
    
    // 1. Get all sequences for the database
    const allSequences = await storage.getSequences();
    if (allSequences.length === 0) {
      throw new Error("No sequences in database to create BLAST database");
    }

    // 2. Create FASTA for the database
    const dbFastaPath = path.join(workDir, "database.fasta");
    const dbFastaContent = allSequences
      .map(s => `>${s.accession}\n${s.sequence}`)
      .join("\n");
    await fs.writeFile(dbFastaPath, dbFastaContent);

    // 3. Create BLAST database
    const dbName = path.join(workDir, "blast_db");
    await execAsync(`makeblastdb -in ${dbFastaPath} -dbtype nucl -out ${dbName}`);

    // 4. Get query sequences
    const queryIds = (parameters as any)?.sequenceIds || [];
    const querySequences = await storage.getSequencesByIds(queryIds);
    if (querySequences.length === 0) {
      throw new Error("No query sequences selected");
    }

    // 5. Create query FASTA
    const queryFastaPath = path.join(workDir, "query.fasta");
    const queryFastaContent = querySequences
      .map(s => `>${s.accession}\n${s.sequence}`)
      .join("\n");
    await fs.writeFile(queryFastaPath, queryFastaContent);

    // 6. Run BLASTn
    // outfmt 6: qseqid sseqid pident length mismatch gapopen qstart qend sstart send evalue bitscore
    const outputPath = path.join(workDir, "results.txt");
    await execAsync(`blastn -query ${queryFastaPath} -db ${dbName} -out ${outputPath} -outfmt 6`);

    // 7. Parse results
    const resultsRaw = await fs.readFile(outputPath, "utf-8");
    const lines = resultsRaw.trim().split("\n").filter(l => l.trim());
    
    const hits = lines.map(line => {
      const [qseqid, sseqid, pident, length, mismatch, gapopen, qstart, qend, sstart, send, evalue, bitscore] = line.split("\t");
      
      // Find subject genotype
      const subject = allSequences.find(s => s.accession === sseqid);
      
      return {
        queryId: qseqid,
        subjectId: sseqid,
        identity: parseFloat(pident),
        alignmentLength: parseInt(length),
        mismatches: parseInt(mismatch),
        gaps: parseInt(gapopen),
        qStart: parseInt(qstart),
        qEnd: parseInt(qend),
        sStart: parseInt(sstart),
        sEnd: parseInt(send),
        eValue: parseFloat(evalue),
        bitScore: parseFloat(bitscore),
        genotype: subject?.genotype || "Unknown"
      };
    });

    await storage.updateAnalysisStatus(analysisId, 'completed', { hits });

  } catch (err: any) {
    console.error(`[BLASTn] Error:`, err);
    await storage.updateAnalysisStatus(analysisId, 'failed', { error: err.message });
  } finally {
    // Cleanup
    await fs.rm(workDir, { recursive: true, force: true }).catch(console.error);
  }
};
