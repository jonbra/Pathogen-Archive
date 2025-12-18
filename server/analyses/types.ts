import { type IStorage } from "../storage";

export interface AnalysisSequence {
  id: number;
  accession: string;
  sequence: string;
}

export interface AnalysisHandler {
  (analysisId: number, sequences: AnalysisSequence[], storage: IStorage): Promise<void>;
}
