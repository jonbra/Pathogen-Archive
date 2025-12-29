/**
 * Analysis Handlers
 * 
 * This directory contains individual analysis implementations.
 * Each analysis is in its own file for better maintainability and modularity.
 * 
 * To add a new analysis:
 * 1. Create a new file: server/analyses/myAnalysis.ts
 * 2. Export a function with signature: (analysisId, sequences, storage) => Promise<void>
 * 3. Import and register in server/analyses/index.ts
 * 4. Add to server/routes.ts dispatcher
 * 5. Update shared/routes.ts API contract
 * 6. Update frontend to show new option
 * 
 * See DEVELOPMENT.md "Adding New Analyses" for detailed guide.
 */

export { runMSAAnalysis } from "./msa";
export { runPhylogenyAnalysis } from "./phylogeny";
export { runBlastAnalysis } from "./blast";
export type { AnalysisHandler, AnalysisSequence } from "./types";
