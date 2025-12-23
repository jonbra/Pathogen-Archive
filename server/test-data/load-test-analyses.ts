/**
 * Load test analysis data into the database
 * 
 * Usage: npx tsx server/test-data/load-test-analyses.ts
 */

import { db } from "../db";
import { analyses } from "../../shared/schema";
import exampleMSA from "./example-msa.json";
import examplePhylogeny from "./example-phylogeny.json";

async function loadTestData() {
  try {
    console.log("📊 Loading test analysis data...");

    // Insert MSA analysis
    const msaResult = await db
      .insert(analyses)
      .values({
        type: "Multiple Sequence Alignment",
        parameters: { sequenceIds: [] },
        status: "completed",
        results: exampleMSA,
      })
      .returning();

    console.log("✅ MSA analysis loaded (ID:", msaResult[0]?.id, ")");

    // Insert Phylogeny analysis
    const phyloResult = await db
      .insert(analyses)
      .values({
        type: "Phylogeny",
        parameters: { sequenceIds: [] },
        status: "completed",
        results: examplePhylogeny,
      })
      .returning();

    console.log("✅ Phylogeny analysis loaded (ID:", phyloResult[0]?.id, ")");
    console.log("\n📋 View results at:");
    console.log(`  - MSA: http://localhost:5000/analyses/${msaResult[0]?.id}`);
    console.log(`  - Phylogeny: http://localhost:5000/analyses/${phyloResult[0]?.id}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to load test data:", error);
    process.exit(1);
  }
}

loadTestData();
