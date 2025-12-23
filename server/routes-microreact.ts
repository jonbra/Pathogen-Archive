/**
 * API endpoints for Microreact file generation and management
 */

import { Router } from "express";
import { db } from "./db";
import { analyses, sequences } from "../shared/schema";
import { eq } from "drizzle-orm";
import { generateMicroreactFromAnalysis, serializeMicroreactFile } from "./utils/microreact";

const router = Router();

/**
 * GET /api/microreact/:analysisId
 * Generate and return a .microreact file for a phylogeny analysis
 */
router.get("/microreact/:analysisId", async (req, res) => {
  try {
    const analysisId = Number(req.params.analysisId);

    if (!analysisId) {
      return res.status(400).json({ error: "Invalid analysis ID" });
    }

    // Fetch analysis
    const analysis = await db.query.analyses.findFirst({
      where: eq(analyses.id, analysisId),
    });

    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    // Fetch associated sequences
    const allSequences = await db.select().from(sequences);
    const analysisSequenceIds = analysis.parameters.sequenceIds || [];
    const analysisSequences =
      analysisSequenceIds.length > 0
        ? allSequences.filter((s: any) => analysisSequenceIds.includes(s.id))
        : allSequences;

    // Generate microreact file
    const microreactFile = generateMicroreactFromAnalysis(
      analysis,
      analysisSequences
    );

    if (!microreactFile) {
      return res.status(400).json({
        error: "Cannot generate microreact file for this analysis type",
      });
    }

    // Return as JSON
    res.json(microreactFile);
  } catch (error) {
    console.error("Error generating microreact file:", error);
    res.status(500).json({ error: "Failed to generate microreact file" });
  }
});

/**
 * GET /api/microreact/:analysisId/download
 * Download .microreact file
 */
router.get("/microreact/:analysisId/download", async (req, res) => {
  try {
    const analysisId = Number(req.params.analysisId);

    if (!analysisId) {
      return res.status(400).json({ error: "Invalid analysis ID" });
    }

    // Fetch analysis
    const analysis = await db.query.analyses.findFirst({
      where: eq(analyses.id, analysisId),
    });

    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    // Fetch associated sequences
    const allSequences = await db.select().from(sequences);
    const analysisSequenceIds = analysis.parameters.sequenceIds || [];
    const analysisSequences =
      analysisSequenceIds.length > 0
        ? allSequences.filter((s: any) => analysisSequenceIds.includes(s.id))
        : allSequences;

    // Generate microreact file
    const microreactFile = generateMicroreactFromAnalysis(
      analysis,
      analysisSequences
    );

    if (!microreactFile) {
      return res.status(400).json({
        error: "Cannot generate microreact file for this analysis type",
      });
    }

    // Serialize to JSON
    const jsonString = serializeMicroreactFile(microreactFile);

    // Send as file download
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="analysis_${analysisId}.microreact"`
    );
    res.send(jsonString);
  } catch (error) {
    console.error("Error downloading microreact file:", error);
    res.status(500).json({ error: "Failed to download microreact file" });
  }
});

export default router;
