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
      }).join(",")
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
 * Create a .microreact file directly from taxa names in tree (when database matching fails)
 * Parses the pipe-delimited taxa names to extract metadata
 */
export function createMicroreactFileFromTaxa(
  analysisId: number,
  analysisType: string,
  newick: string,
  taxaSet: Set<string>,
  metadata?: Record<string, any>
): MicroreactFile {
  // Generate CSV from taxa names
  // Taxa format appears to be: 2PA|ID|Genotype|Outbreak
  const headers = ["id", "accession", "genotype", "outbreak"];
  
  const rows: string[][] = [];
  let idx = 1;
  for (const taxon of taxaSet) {
    const parts = taxon.split('|');
    // Parse the taxon name: typically "2PA|ID|Genotype|Outbreak"
    const accession = taxon; // Full taxon name as accession (for tree matching)
    const genotype = parts.length >= 3 ? parts[2] : '';
    const outbreak = parts.length >= 4 ? parts[3] : '';
    
    rows.push([
      String(idx++),
      accession,
      genotype,
      outbreak,
    ]);
  }

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => {
        const str = String(cell);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",")
    ),
  ].join("\n");

  const microreactFile: MicroreactFile = {
    $schema: "https://microreact.org/schema/v1",
    name: `${analysisType} Analysis - Project ${analysisId}`,
    description: `Phylogenetic analysis with ${taxaSet.size} sequences. Generated from analysis ID ${analysisId}.`,
    files: {
      tree: {
        name: `tree_${analysisId}.nwk`,
        format: "newick",
        data: newick,
      },
      metadata: {
        name: `metadata_${analysisId}.csv`,
        format: "csv",
        data: csvContent,
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

  // Filter sequences to only include those that appear in the tree
  // Extract taxa names from the Newick string (names are before : characters)
  const taxaInTree = new Set<string>();
  
  // More robust regex to extract taxa names from Newick format
  // Taxa names appear before : (branch length) and can contain |, letters, numbers, etc.
  // Match everything that's not a Newick special character, followed by :
  const taxaRegex = /([^(),;:\s]+):/g;
  let match;
  while ((match = taxaRegex.exec(newick)) !== null) {
    const taxon = match[1].trim();
    if (taxon && taxon.length > 0) {
      taxaInTree.add(taxon);
    }
  }

  console.log(`[microreact] Found ${taxaInTree.size} taxa in tree:`, Array.from(taxaInTree));
  console.log(`[microreact] Total sequences provided: ${sequences.length}`);

  // Filter sequences to only those in the tree
  // Match by exact accession
  const filteredSequences = sequences.filter(seq => {
    const accession = seq.accession || '';
    return taxaInTree.has(accession);
  });

  console.log(`[microreact] Filtered to ${filteredSequences.length} sequences`);

  // If filtering produced results, use them
  if (filteredSequences.length > 0) {
    return createMicroreactFile(
      analysis.id,
      analysis.type,
      newick,
      filteredSequences,
      analysis.results?.metadata || {}
    );
  }

  // If no matches, check analysis parameters for sequenceIds
  const analysisSequenceIds = analysis.parameters?.sequenceIds as number[] | undefined;
  if (analysisSequenceIds && analysisSequenceIds.length > 0) {
    const idFilteredSequences = sequences.filter(seq => analysisSequenceIds.includes(seq.id));
    console.log(`[microreact] Fallback: Using ${idFilteredSequences.length} sequences from analysis parameters`);
    if (idFilteredSequences.length > 0) {
      return createMicroreactFile(
        analysis.id,
        analysis.type,
        newick,
        idFilteredSequences,
        analysis.results?.metadata || {}
      );
    }
  }

  // Last resort: create metadata directly from taxa names in tree
  console.log(`[microreact] Creating minimal metadata from tree taxa`);
  return createMicroreactFileFromTaxa(
    analysis.id,
    analysis.type,
    newick,
    taxaInTree,
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
