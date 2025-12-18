import { pgTable, text, serial, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sequences = pgTable("sequences", {
  id: serial("id").primaryKey(),
  accession: text("accession").notNull(),
  sequence: text("sequence").notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}).notNull(),
  filename: text("filename").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  parameters: jsonb("parameters").$type<Record<string, any>>().notNull(),
  status: text("status").notNull(), // pending, running, completed, failed
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
