/**
 * Robust FASTA parser with validation
 */

export interface ParsedFASTAEntry {
  header: string;
  accession: string;
  sequence: string;
  length: number;
}

/**
 * Parse FASTA format with validation
 * Handles various FASTA formats and validates sequence data
 */
export function parseFASTA(content: string): ParsedFASTAEntry[] {
  const entries: ParsedFASTAEntry[] = [];
  
  // Split by > but preserve content
  const blocks = content.split(/^>/m).slice(1);
  
  for (const block of blocks) {
    if (!block.trim()) continue;
    
    const lines = block.split("\n");
    const header = lines[0].trim();
    
    if (!header) continue;
    
    // Extract accession (first non-whitespace token in header)
    const accession = header.split(/[\s\t]+/)[0];
    
    if (!accession) continue;
    
    // Join sequence lines and remove whitespace
    const sequence = lines
      .slice(1)
      .join("")
      .replace(/\s/g, "")
      .toUpperCase();
    
    // Validate sequence contains only standard nucleotide codes
    // ACGTUNRYSWKMBDHV (standard IUPAC + common variants)
    if (!/^[ACGTUNRYSWKMBDHV-]*$/.test(sequence)) {
      console.warn(
        `[FASTA] Skipping sequence with invalid characters: ${accession}`
      );
      continue;
    }
    
    if (sequence.length === 0) {
      console.warn(`[FASTA] Skipping empty sequence: ${accession}`);
      continue;
    }
    
    entries.push({
      header,
      accession,
      sequence,
      length: sequence.length,
    });
  }
  
  return entries;
}

/**
 * Detect delimiter (comma or semicolon) from content
 */
function detectDelimiter(content: string): string {
  const firstLine = content.split(/[\r\n]/)[0] || '';
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

/**
 * Parse CSV with proper quote handling (supports comma and semicolon delimiters)
 */
export function parseCSV(content: string): string[][] {
  const delimiter = detectDelimiter(content);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      // Field separator
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      // Row separator
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      }
      // Skip \r\n combination
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
    } else {
      currentField += char;
    }
  }
  
  // Add last field and row if any
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }
  
  return rows;
}

/**
 * Extract metadata from CSV rows
 */
export function csvToMetadata(
  rows: string[][]
): Record<string, any>[] {
  if (rows.length < 2) return [];
  
  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((h) => h.toLowerCase());
  
  return dataRows.map((row) => {
    const obj: Record<string, any> = {};
    headers.forEach((header, idx) => {
      if (header && row[idx] !== undefined) {
        obj[header] = row[idx];
      }
    });
    return obj;
  }).filter((obj) => Object.keys(obj).length > 0);
}
