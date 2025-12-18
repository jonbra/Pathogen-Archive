# Virus Genome Sequence Database

A full-stack application for managing, analyzing, and exploring viral genome sequences. Features include sequence upload, metadata-based search, multiple sequence alignment (MSA), and phylogenetic analysis.

## Table of Contents

- [Quick Start](#quick-start)
- [Running the Application](#running-the-application)
- [How to Use](#how-to-use)
  - [Uploading Sequences](#uploading-sequences)
  - [Preparing Metadata](#preparing-metadata)
  - [Browsing and Searching](#browsing-and-searching)
  - [Running Analyses](#running-analyses)
- [Features](#features)
- [System Requirements](#system-requirements)

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL database (provided via Replit)
- R and required packages (jsonlite, ggplot2)
- MAFFT (multiple sequence alignment tool)
- IQ-TREE (phylogenetic inference tool)

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Initialize the database:**
   ```bash
   npm run db:push
   ```

3. **Start the application:**
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5000`.

## Running the Application

### Development Mode
```bash
npm run dev
```
This starts both the Express backend server and Vite development server. Hot reloading is enabled for both frontend and backend changes.

### Production Build
```bash
npm run build
npm run start
```

### Type Checking
```bash
npm run check
```
Validates TypeScript for both server and client code.

## How to Use

### Uploading Sequences

#### 1. Prepare Your FASTA File

Create a FASTA file with your sequences. Format:
```fasta
>accession_1
ACGTACGTACGTACGT...
>accession_2
ACGTACGTACGTACGT...
```

**Important:** The accession ID (after `>`) will be used to match with metadata rows.

#### 2. Prepare Your Metadata File

Create a CSV file with the following columns (all optional except `sequence_id`):

```csv
sequence_id,sampling_date,country,genotype,outbreak,other_field
NC_045512.2,2020.03.15,USA,B.1,2020-covid,additional_data
NC_000001.1,2020.05.20,China,B.1.1,2020-covid,more_info
```

**Column Definitions:**
- **sequence_id**: Unique identifier for the sequence (should match FASTA accession)
- **sampling_date**: Collection date in format `YYYY.MM.DD`
- **country**: Geographic origin (country name or ISO code)
- **genotype**: Viral strain or genotype classification
- **outbreak**: Associated outbreak identifier
- Additional columns are preserved but not indexed for search

**Note:** The CSV parser matches rows by checking if `sequence_id` (or `Accession`, `accession`) matches the FASTA accession ID.

#### 3. Upload via Web Interface

1. Navigate to **Upload Sequences** page
2. Click "Select FASTA File" and choose your `.fasta` or `.fa` file
3. Optionally click "Select Metadata File" and choose your `.csv` file
4. Click **Upload**
5. Confirm the number of sequences imported

#### Example Metadata File (Full)

```csv
sequence_id,sampling_date,country,genotype,outbreak
SARS-CoV-2_USA_001,2024.01.15,USA,XEC,2024-flu
SARS-CoV-2_CHN_002,2024.02.20,China,KP.2,2024-respiratory
Flu_JPN_003,2024.03.10,Japan,H3N2,2024-flu
Flu_UK_004,2024.03.15,United Kingdom,H3N2,2024-flu
```

### Browsing and Searching

#### Browse All Sequences

1. Go to **Browse Database**
2. View all uploaded sequences with:
   - Accession ID
   - Sequence length
   - Sampling date
   - Metadata fields

#### Search Sequences

Use the search filters to find specific sequences:

**Single Field Search:**
- Enter a **country** name (e.g., "USA")
- Enter a **genotype** (e.g., "B.1")
- Enter a **sampling date** (e.g., "2024.01.15")
- Enter an **outbreak ID** (e.g., "2020-covid")

**Multiple Filters:**
Combine multiple criteria (AND logic):
- Country: "USA" + Genotype: "B.1" → sequences from USA with genotype B.1

**Complete Metadata Only:**
- Enable "Show only complete sequences" → only returns sequences with ALL metadata fields populated

#### API Endpoint

Direct search via HTTP:
```
GET /api/sequences/search?country=USA&genotype=B.1&requireComplete=true
```

Query parameters:
- `sequenceId` - Filter by sequence ID
- `samplingDate` - Filter by exact date (YYYY.MM.DD)
- `country` - Filter by country
- `genotype` - Filter by genotype
- `outbreak` - Filter by outbreak
- `requireComplete=true` - Only return sequences with all metadata fields

### Running Analyses

#### Available Analyses

1. **GC Content**: Calculate GC percentage for each sequence
2. **Multiple Sequence Alignment (MSA)**: Align sequences using MAFFT
3. **Phylogeny**: Construct phylogenetic tree using MAFFT + IQ-TREE

#### Run an Analysis

1. **Browse Database** and select sequences using checkboxes
2. Click **Run Analysis**
3. Choose analysis type:
   - **GC Content** - Fast, shows GC% distribution
   - **MSA** - Medium time, outputs aligned sequences
   - **Phylogeny** - Slow, outputs Newick format tree
4. Click **Submit**

#### View Results

1. Go to **Analyses** page
2. Click on an analysis to see:
   - Analysis type and creation date
   - Status (pending, running, completed, failed)
   - Results (visualization or raw data)

**Result Types:**
- **GC Content**: Table with per-sequence GC%, mean/median
- **MSA**: Aligned sequences, alignment length, statistics
- **Phylogeny**: Newick tree file, evolutionary relationships

## Features

### Sequence Management
- Upload FASTA files with optional metadata
- Store sequences with searchable metadata fields
- Automatic sequence validation and parsing
- Bulk import capability

### Metadata Support
- Structured fields: sequence_id, sampling_date, country, genotype, outbreak
- Optional metadata (all fields except sequence_id)
- Full-text and exact match search
- Filter by single or multiple fields
- Query only complete sequences

### Analyses
- **GC Content Analysis**: Rapid assessment of nucleotide composition
- **Multiple Sequence Alignment (MAFFT)**: Professional-grade local alignment
- **Phylogenetic Inference (IQ-TREE)**: GTR+G model, rooted trees
- Background processing: analyses run asynchronously
- Result persistence: view historical analyses anytime

### Data Visualization
- Browse sequences in table format
- Search results highlighting
- Analysis result display with charts (recharts)

## System Requirements

### Runtime
- Node.js 20.x or higher
- PostgreSQL 12+ (Neon serverless)
- 2+ GB RAM recommended

### External Tools
- **MAFFT** v7+: Multiple sequence alignment
- **IQ-TREE** v2+: Phylogenetic inference
- **R** 3.6+: Optional (fallback to JavaScript for GC content if R unavailable)

### Browser
- Modern browser with ES2020+ support (Chrome, Firefox, Safari, Edge)
- WebSocket support for real-time features

## Database Schema

### sequences table
```sql
- id (serial, PK)
- accession (text, unique)
- sequence (text)
- sequence_id (text, optional)
- sampling_date (text, optional)
- country (text, optional)
- genotype (text, optional)
- outbreak (text, optional)
- metadata (jsonb)
- filename (text)
- created_at (timestamp)
```

### analyses table
```sql
- id (serial, PK)
- type (text) - 'GC Content', 'MSA', 'Phylogeny'
- parameters (jsonb)
- status (text) - 'pending', 'running', 'completed', 'failed'
- results (jsonb)
- created_at (timestamp)
```

## Troubleshooting

### Upload Fails
- Check FASTA format (accessions must start with `>`)
- Ensure CSV has proper headers
- Verify accession IDs match between FASTA and CSV

### Analysis Fails
- Check logs: `npm run dev` shows backend errors
- Ensure MAFFT/IQ-TREE installed: `which mafft` and `which iqtree2`
- For large datasets (>1000 sequences), phylogeny may timeout

### Search Returns No Results
- Verify metadata was imported: check **Browse Database**
- Try removing filters one at a time
- Use `requireComplete=true` only if all sequences have metadata

### Database Issues
- Reset database: Delete current and create new via Replit UI
- Run `npm run db:push --force` to re-sync schema
- Check DATABASE_URL environment variable is set

## Performance Notes

- **Upload**: ~1 second per 100 sequences
- **GC Content**: <1 second
- **MSA**: 1-10 seconds depending on sequence count/length
- **Phylogeny**: 10-60 seconds (may timeout for >500 sequences)

## Support

For issues, refer to `DEVELOPMENT.md` for architecture details and extension guide.
