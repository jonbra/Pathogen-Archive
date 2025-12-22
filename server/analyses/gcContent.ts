import { type AnalysisSequence, type AnalysisHandler } from "./types";
import { log } from "../index";

/**
 * Calculate GC content (percentage of G and C nucleotides) for each sequence.
 * 
 * Results:
 * - type: "GC Content"
 * - data: Array of {accession, gcContent} for each sequence
 * - mean: Average GC content across all sequences
 */
export const runGCContentAnalysis: AnalysisHandler = async (analysisId, sequences, storage) => {
  try {
    log(`GC Content: Analyzing ${sequences.length} sequences`, "gc-content");
    
    const results = {
      type: 'GC Content',
      data: sequences.map(s => ({
        accession: s.accession,
        gcContent: ((s.sequence.match(/[GCgc]/g) || []).length / s.sequence.length) * 100
      }))
    };
    
    const summary = results.data.map(d => d.gcContent);
    results['mean'] = summary.reduce((a, b) => a + b, 0) / summary.length;
    
    log(`GC Content: Mean GC content = ${(results['mean'] as number).toFixed(2)}%`, "gc-content");
    await storage.updateAnalysisStatus(analysisId, 'completed', results);
  } catch (err) {
    log(`GC Content: Analysis failed: ${err}`, "gc-content");
    await storage.updateAnalysisStatus(analysisId, 'failed', { error: String(err) });
    throw err;
  }
};
