import { type AnalysisSequence, type AnalysisHandler } from "./types";

/**
 * Calculate GC content (percentage of G and C nucleotides) for each sequence.
 * 
 * Results:
 * - data: Array of {accession, gcContent} for each sequence
 * - mean: Average GC content across all sequences
 */
export const runGCContentAnalysis: AnalysisHandler = async (analysisId, sequences, storage) => {
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
};
