import { pgTable, text, serial, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sequences = pgTable("sequences", {
  id: serial("id").primaryKey(),
  accession: text("accession").notNull(),
  sequence: text("sequence").notNull(),
  sequenceId: text("sequence_id"),
  samplingDate: text("sampling_date"),
  country: text("country"),
  genotype: text("genotype"),
  outbreak: text("outbreak"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}).notNull(),
  filename: text("filename").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  parameters: jsonb("parameters").$type<Record<string, any>>().notNull(),
  status: text("status").notNull(),
  results: jsonb("results").$type<any>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSequenceSchema = createInsertSchema(sequences).omit({ id: true, createdAt: true });
export const insertAnalysisSchema = createInsertSchema(analyses).omit({ id: true, createdAt: true });

export type Sequence = typeof sequences.$inferSelect;
export type InsertSequence = z.infer<typeof insertSequenceSchema>;
export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;

export type CreateAnalysisRequest = {
  type: string;
  sequenceIds: number[];
  parameters: Record<string, any>;
};

export interface SequenceSearchParams {
  sequenceId?: string;
  samplingDate?: string;
  country?: string;
  genotype?: string;
  outbreak?: string;
  requireComplete?: boolean;
}
