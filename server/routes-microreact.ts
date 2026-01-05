/**
 * API endpoints for Microreact file generation and management
 */

import { Router } from "express";
import { db } from "./db";
import { analyses, sequences } from "../shared/schema";
import { eq } from "drizzle-orm";
import { generateMicroreactFromAnalysis, serializeMicroreactFile } from "./utils/microreact";
import { MICROREACT_VIEWER_URL } from "./config";

const router = Router();

/**
 * GET /api/microreact/config
 * Return Microreact viewer configuration
 */
router.get("/microreact/config", (_req, res) => {
  res.json({
    localViewerUrl: MICROREACT_VIEWER_URL,
    officialUrl: "https://microreact.org",
    uploadUrl: "https://microreact.org/upload",
  });
});

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

/**
 * GET /api/analyses/:analysisId/microreact-file
 * Serve .microreact file for local viewer (with CORS headers)
 * This endpoint is used by the local Microreact viewer via the ?file= parameter
 */
router.get("/analyses/:analysisId/microreact-file", async (req, res) => {
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

    // Add CORS headers for local viewer access
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Content-Type", "application/json");
    
    // Return the microreact JSON
    res.json(microreactFile);
  } catch (error) {
    console.error("Error serving microreact file:", error);
    res.status(500).json({ error: "Failed to serve microreact file" });
  }
});

export default router;
