import { db } from "./db";
import {
  sequences, analyses,
  type Sequence, type InsertSequence,
  type Analysis, type InsertAnalysis,
  type CreateAnalysisRequest,
  type SequenceSearchParams
} from "@shared/schema";
import { eq, desc, and, or, isNull, isNotNull, inArray } from "drizzle-orm";

export interface IStorage {
  // Sequences
  getSequences(): Promise<Sequence[]>;
  getSequence(id: number): Promise<Sequence | undefined>;
  getSequencesByIds(ids: number[]): Promise<Sequence[]>;
  searchSequences(params: SequenceSearchParams): Promise<Sequence[]>;
  createSequence(sequence: InsertSequence): Promise<Sequence>;
  deleteSequence(id: number): Promise<void>;

  // Analyses
  getAnalyses(): Promise<Analysis[]>;
  getAnalysis(id: number): Promise<Analysis | undefined>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  updateAnalysisStatus(id: number, status: string, results?: any): Promise<Analysis>;
}

export class DatabaseStorage implements IStorage {
  async getSequences(): Promise<Sequence[]> {
    return await db.select().from(sequences).orderBy(desc(sequences.createdAt));
  }

  async getSequence(id: number): Promise<Sequence | undefined> {
    const [seq] = await db.select().from(sequences).where(eq(sequences.id, id));
    return seq;
  }

  async getSequencesByIds(ids: number[]): Promise<Sequence[]> {
    if (ids.length === 0) return [];
    return await db.select().from(sequences).where(inArray(sequences.id, ids));
  }

  async createSequence(sequence: InsertSequence): Promise<Sequence> {
    // Prevent duplicate accession entries
    if (sequence.accession) {
      const [existing] = await db.select().from(sequences).where(eq(sequences.accession, sequence.accession));
      if (existing) {
        const err: any = new Error(`Duplicate accession: ${sequence.accession}`);
        err.code = 'DUPLICATE_ACCESSION';
        throw err;
      }
    }

    const [seq] = await db.insert(sequences).values(sequence).returning();
    return seq;
  }

  async deleteSequence(id: number): Promise<void> {
    await db.delete(sequences).where(eq(sequences.id, id));
  }

  async searchSequences(params: SequenceSearchParams): Promise<Sequence[]> {
    let query = db.select().from(sequences);
    const filters: any[] = [];

    if (params.sequenceId) {
      filters.push(eq(sequences.sequenceId, params.sequenceId));
    }
    if (params.samplingDate) {
      filters.push(eq(sequences.samplingDate, params.samplingDate));
    }
    if (params.country) {
      filters.push(eq(sequences.country, params.country));
    }
    if (params.genotype) {
      filters.push(eq(sequences.genotype, params.genotype));
    }
    if (params.outbreak) {
      filters.push(eq(sequences.outbreak, params.outbreak));
    }

    if (params.requireComplete) {
      filters.push(isNotNull(sequences.sequenceId));
      filters.push(isNotNull(sequences.samplingDate));
      filters.push(isNotNull(sequences.country));
      filters.push(isNotNull(sequences.genotype));
      filters.push(isNotNull(sequences.outbreak));
    }

    if (filters.length > 0) {
      query = query.where(and(...filters));
    }

    return await query.orderBy(desc(sequences.createdAt));
  }

  async getAnalyses(): Promise<Analysis[]> {
    return await db.select().from(analyses).orderBy(desc(analyses.createdAt));
  }

  async getAnalysis(id: number): Promise<Analysis | undefined> {
    const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id));
    return analysis;
  }

  async createAnalysis(analysis: InsertAnalysis): Promise<Analysis> {
    const [res] = await db.insert(analyses).values(analysis).returning();
    return res;
  }

  async updateAnalysisStatus(id: number, status: string, results?: any): Promise<Analysis> {
    const [updated] = await db.update(analyses)
      .set({ status, results })
      .where(eq(analyses.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
