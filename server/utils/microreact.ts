/**
 * Utilities for creating Microreact file format (.microreact)
 * Based on: https://docs.microreact.org/instructions/creating-a-microreact-project/supported-file-formats
 */

import type { Sequence, Analysis } from "../../shared/schema";

export interface MicroreactProjectData {
  name: string;
  description?: string;
  files: {
    tree?: string; // Newick format tree filename
    metadata?: string; // CSV filename with metadata
  };
  settings?: {
    mapPointsSize?: number;
    mapBoundaries?: boolean;
    treeType?: string;
  };
}

export interface MicroreactFile {
  $schema?: string;
  name: string;
  description?: string;
  files?: {
    tree?: {
      name?: string;
      format?: string;
      data?: string;
    };
    metadata?: {
      name?: string;
      format?: string;
      data?: string;
    };
  };
  settings?: {
    mapPointsSize?: number;
    mapBoundaries?: boolean;
    treeType?: string;
  };
  [key: string]: any;
}

/**
 * Generate a CSV string from sequences with metadata
 */
export function generateMetadataCSV(sequences: Sequence[]): string {
  const headers = [
    "id",
    "accession",
    "sequence_length",
    "sampling_date",
    "country",
    "genotype",
    "outbreak",
  ];

  const rows = sequences.map((seq) => [
    seq.id,
    seq.accession || "",
    seq.sequence.length,
    seq.samplingDate || "",
    seq.country || "",
    seq.genotype || "",
    seq.outbreak || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => {
        // Escape CSV values containing commas or quotes
        const str = String(cell);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
    ),
  ].join("\n");

  return csvContent;
}

/**
 * Create a .microreact file (JSON format) with embedded tree and metadata
 */
export function createMicroreactFile(
  analysisId: number,
  analysisType: string,
  newick: string,
  sequences: Sequence[],
  metadata?: Record<string, any>
): MicroreactFile {
  const metadataCSV = generateMetadataCSV(sequences);

  const microreactFile: MicroreactFile = {
    $schema: "https://microreact.org/schema/v1",
    name: `${analysisType} Analysis - Project ${analysisId}`,
    description: `Phylogenetic analysis with ${sequences.length} sequences. Generated from analysis ID ${analysisId}.`,
    files: {
      tree: {
        name: `tree_${analysisId}.nwk`,
        format: "newick",
        data: newick,
      },
      metadata: {
        name: `metadata_${analysisId}.csv`,
        format: "csv",
        data: metadataCSV,
      },
    },
    settings: {
      mapPointsSize: 8,
      mapBoundaries: true,
      treeType: "rectangular",
    },
    ...metadata,
  };

  return microreactFile;
}

/**
 * Generate a .microreact file from an analysis result
 */
export function generateMicroreactFromAnalysis(
  analysis: Analysis,
  sequences: Sequence[]
): MicroreactFile | null {
  if (
    analysis.type !== "Phylogeny" &&
    analysis.type !== "phylogeny" &&
    !analysis.type.includes("phylogeny")
  ) {
    return null;
  }

  const newick = analysis.results?.tree;
  if (!newick || typeof newick !== "string") {
    return null;
  }

  return createMicroreactFile(
    analysis.id,
    analysis.type,
    newick,
    sequences,
    analysis.results?.metadata || {}
  );
}

/**
 * Convert Microreact JSON file to string for download
 */
export function serializeMicroreactFile(file: MicroreactFile): string {
  return JSON.stringify(file, null, 2);
}

/**
 * Parse a .microreact file (inverse of serializeMicroreactFile)
 */
export function parseMicroreactFile(jsonString: string): MicroreactFile {
  return JSON.parse(jsonString);
}
