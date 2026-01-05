# Development Guide

This document describes the architecture, data flow, and how to extend the application with new features.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Data Models](#data-models)
- [API Contract](#api-contract)
- [Adding New Analyses](#adding-new-analyses)
- [Adding New Metadata Fields](#adding-new-metadata-fields)
- [Modifying Search Behavior](#modifying-search-behavior)
- [Database Migrations](#database-migrations)
- [Testing](#testing)

## Architecture Overview

This is a full-stack TypeScript application with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web Browser                              │
├─────────────────────────────────────────────────────────────────┤
│                      React Frontend (Vite)                      │
│ - Pages: Dashboard, Upload, Browse, Analyses                   │
│ - Components: Forms, Tables, Charts (Recharts)                 │
│ - State: TanStack Query (React Query)                          │
├─────────────────────────────────────────────────────────────────┤
│              REST API (Express.js) + WebSocket                  │
│ - Routes: GET/POST/DELETE /api/sequences, /api/analyses         │
│ - File Upload: Multipart form-data (FASTA + CSV)              │
│ - Analysis: Background processing with job queue               │
├─────────────────────────────────────────────────────────────────┤
│              Storage Layer (DatabaseStorage)                    │
│ - Abstraction for all database operations                       │
│ - Implements IStorage interface                                │
├─────────────────────────────────────────────────────────────────┤
│            Database (PostgreSQL / Neon Serverless)             │
│ - sequences table: 10M+ sequences (indexed)                    │
│ - analyses table: job tracking and results storage             │
├─────────────────────────────────────────────────────────────────┤
│              External Tools (Child Processes)                   │
│ - MAFFT: Multiple sequence alignment                           │
│ - IQ-TREE: Phylogenetic inference                              │
│ - R: Statistical analysis (fallback to JS)                     │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build & dev server)
- TanStack Query (data fetching)
- React Hook Form (forms)
- Recharts (visualization)
- Tailwind CSS + Shadcn UI (styling)

**Backend:**
- Express.js
- Drizzle ORM (database)
- Zod (validation)
- Multer (file upload)

**Database:**
- PostgreSQL (Neon serverless)
- Drizzle-kit (migrations)

**External Tools:**
- MAFFT v7+ (MSA)
- IQ-TREE v2+ (phylogeny)
- R 3.6+ (optional analysis)

### Setting Up Bioinformatics Tools with Conda

For local Ubuntu server deployments, install tools via conda:

```bash
# Create conda environment with bioinformatics tools
conda create -n bioinformatics -c bioconda -c conda-forge mafft iqtree

# Or install tools individually
conda create -n bioinformatics python
conda activate bioinformatics
conda install -c bioconda mafft
conda install -c bioconda iqtree

# Verify installation
conda run -n bioinformatics mafft --version
conda run -n bioinformatics iqtree --version

# For R-based analyses (optional)
conda install -c conda-forge r-base
```

The application automatically detects and uses conda environments. If tools are not in system PATH, the app will try `conda run -n bioinformatics <tool>`. For custom environment names, modify `server/analyses/conda.ts`.

### Setting Up Local Microreact Viewer (Optional)

The application can integrate with a local [Microreact](https://microreact.org) viewer for enhanced phylogenetic visualization. This is optional - users can always download the `.microreact` file and upload it to the official Microreact website.

#### Option 1: Using the Official Docker Image

```bash
# Run Microreact viewer on port 3001
docker run -d --name microreact -p 3001:3000 microreact/microreact-viewer
```

Then configure the app to use it:

```json
// config.json
{
  "DATABASE_URL": "postgresql://...",
  "MICROREACT_VIEWER_URL": "http://localhost:3001"
}
```

#### Option 2: Clone and Run Locally

```bash
# Clone the Microreact viewer repository
git clone https://github.com/microreact/viewer.git microreact-viewer
cd microreact-viewer

# Install dependencies and run
npm install
npm start
```

Then add to `config.json`:
```json
{
  "MICROREACT_VIEWER_URL": "http://localhost:3000"
}
```

#### How It Works

When `MICROREACT_VIEWER_URL` is configured:
1. A "Open Local Viewer" button appears on phylogeny analysis results
2. Clicking it opens the local Microreact viewer with the analysis data
3. The viewer fetches the `.microreact` file from `/api/analyses/:id/microreact-file`

This approach allows full Microreact functionality (interactive trees, maps, charts) without sending data to external servers.

## Project Structure

```
.
├── client/                          # Frontend code
│   ├── src/
│   │   ├── pages/                   # Route pages
│   │   │   ├── dashboard.tsx        # Home/overview
│   │   │   ├── upload.tsx           # Sequence upload
│   │   │   ├── browse.tsx           # View & search sequences
│   │   │   ├── analysis-new.tsx     # Create analysis
│   │   │   ├── analysis-list.tsx    # View past analyses
│   │   │   ├── analysis-detail.tsx  # Analysis results
│   │   │   └── not-found.tsx        # 404 page
│   │   ├── components/              # Reusable components (UI primitives)
│   │   ├── lib/                     # Utilities
│   │   │   ├── queryClient.ts       # TanStack Query setup
│   │   │   └── utils.ts             # Helpers
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── App.tsx                  # Root component + router
│   │   ├── main.tsx                 # Entry point
│   │   └── index.css                # Global styles
│   ├── index.html                   # HTML template
│   └── requirements.md              # Generated: package requirements
│
├── server/                          # Backend code
│   ├── index.ts                     # Express app setup
│   ├── routes.ts                    # API routes (handlers) + dispatcher
│   ├── storage.ts                   # Database abstraction layer
│   ├── db.ts                        # Database connection (Drizzle)
│   ├── vite.ts                      # Vite dev server integration
│   ├── static.ts                    # Static file serving
│   ├── analyses/                    # Analysis implementations (modular)
│   │   ├── index.ts                 # Exports all analysis handlers
│   │   ├── types.ts                 # Shared types for analysis handlers
│   │   ├── gcContent.ts             # GC Content analysis
│   │   ├── msa.ts                   # Multiple Sequence Alignment (MAFFT)
│   │   └── phylogeny.ts             # Phylogenetic inference (MAFFT + IQ-TREE)
│   └── scripts/
│       └── analyze.R                # R analysis scripts (generated)
│
├── shared/                          # Shared types & contracts
│   ├── schema.ts                    # Drizzle ORM schema + Zod types
│   └── routes.ts                    # API contract (endpoints + schemas)
│
├── script/                          # Build scripts
│   └── build.ts                     # Production build
│
├── drizzle.config.ts                # Drizzle migration config
├── vite.config.ts                   # Vite build config
├── tsconfig.json                    # TypeScript config
├── package.json                     # Dependencies
├── README.md                        # User guide (this file)
└── DEVELOPMENT.md                   # Developer guide (this file)
```

## Data Models

### Sequences

**Database Schema** (`shared/schema.ts`):
```typescript
export const sequences = pgTable("sequences", {
  id: serial("id").primaryKey(),
  accession: text("accession").notNull(),              // FASTA accession ID
  sequence: text("sequence").notNull(),                // Actual FASTA sequence
  sequenceId: text("sequence_id"),                     // Metadata: unique ID
  samplingDate: text("sampling_date"),                 // Metadata: YYYY.MM.DD
  country: text("country"),                            // Metadata: location
  genotype: text("genotype"),                          // Metadata: strain
  outbreak: text("outbreak"),                          // Metadata: outbreak ID
  metadata: jsonb("metadata").default({}).notNull(),   // JSON blob: any other fields
  filename: text("filename").notNull(),                // Source file name
  createdAt: timestamp("created_at").defaultNow(),
});
```

**TypeScript Types** (`shared/schema.ts`):
```typescript
export type Sequence = typeof sequences.$inferSelect;  // Full record from DB
export type InsertSequence = z.infer<typeof insertSequenceSchema>;  // For creation
```

**Storage Interface** (`server/storage.ts`):
```typescript
export interface IStorage {
  getSequences(): Promise<Sequence[]>;
  getSequence(id: number): Promise<Sequence | undefined>;
  getSequencesByIds(ids: number[]): Promise<Sequence[]>;
  searchSequences(params: SequenceSearchParams): Promise<Sequence[]>;
  createSequence(sequence: InsertSequence): Promise<Sequence>;
  deleteSequence(id: number): Promise<void>;
}
```

### Analyses

**Database Schema** (`shared/schema.ts`):
```typescript
export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),                  // 'GC Content', 'MSA', 'Phylogeny'
  parameters: jsonb("parameters").notNull(),    // Input parameters
  status: text("status").notNull(),              // 'pending' | 'running' | 'completed' | 'failed'
  results: jsonb("results"),                     // Output/results
  createdAt: timestamp("created_at").defaultNow(),
});
```

## API Contract

All API endpoints are defined in `shared/routes.ts` for type-safe frontend/backend communication.

### Sequences

**List all sequences:**
```
GET /api/sequences
Response: Sequence[]
```

**Search sequences:**
```
GET /api/sequences/search?country=USA&genotype=B.1&requireComplete=true
Query Parameters:
  - sequenceId?: string
  - samplingDate?: string (YYYY.MM.DD)
  - country?: string
  - genotype?: string
  - outbreak?: string
  - requireComplete?: 'true' | 'false'
Response: Sequence[]
```

**Upload sequences:**
```
POST /api/sequences/upload
Content-Type: multipart/form-data
Body:
  - fasta: File (FASTA format)
  - metadata: File (CSV format, optional)
Response: { count: number, message: string }
```

**Delete sequence:**
```
DELETE /api/sequences/:id
Response: 204 No Content
```

### Analyses

**List analyses:**
```
GET /api/analyses
Response: Analysis[]
```

**Get analysis details:**
```
GET /api/analyses/:id
Response: Analysis
```

**Create analysis:**
```
POST /api/analyses
Content-Type: application/json
Body: {
  type: 'GC Content' | 'MSA' | 'Phylogeny',
  sequenceIds: number[],
  parameters: { [key: string]: any }
}
Response: Analysis (status: 'pending')
```

## Adding New Analyses

Each analysis is in its own file in `server/analyses/` for better modularity and maintainability.

### 1. Create Analysis File

Create `server/analyses/myAnalysis.ts`:

```typescript
import { type AnalysisSequence, type AnalysisHandler } from "./types";

/**
 * My custom analysis description.
 * 
 * Results:
 * - field1: description
 * - field2: description
 */
export const runMyAnalysis: AnalysisHandler = async (analysisId, sequences, storage) => {
  try {
    // 1. Implement analysis logic
    const results = sequences.map(s => {
      // Do analysis on s.sequence
      return { accession: s.accession, result: "..." };
    });

    // 2. Store results
    await storage.updateAnalysisStatus(analysisId, 'completed', {
      type: 'My Analysis',
      data: results
    });
  } catch (err) {
    throw err;  // Will be caught by dispatcher and marked as failed
  }
};
```

### 2. Export Handler

Update `server/analyses/index.ts`:

```typescript
export { runGCContentAnalysis } from "./gcContent";
export { runMSAAnalysis } from "./msa";
export { runPhylogenyAnalysis } from "./phylogeny";
export { runMyAnalysis } from "./myAnalysis";  // Add your handler
export type { AnalysisHandler, AnalysisSequence } from "./types";
```

### 3. Register Dispatcher

Update `server/routes.ts` in the `runAnalysis()` function:

```typescript
async function runAnalysis(analysisId: number, type: string, sequenceIds: number[]) {
  try {
    await storage.updateAnalysisStatus(analysisId, 'running');
    const sequences = await storage.getSequencesByIds(sequenceIds);

    if (type === 'GC Content') {
      await runGCContentAnalysis(analysisId, sequences, storage);
    } else if (type === 'My Analysis') {
      await runMyAnalysis(analysisId, sequences, storage);  // Add branch
    }
    // ... more types
  } catch (err) {
    await storage.updateAnalysisStatus(analysisId, 'failed', { error: String(err) });
  }
}
```

Also import at the top:
```typescript
import { runGCContentAnalysis, runMSAAnalysis, runPhylogenyAnalysis, runMyAnalysis } from "./analyses";
```

### 4. Update API Schema

Update `shared/routes.ts`:

```typescript
input: z.object({
  type: z.enum(['GC Content', 'MSA', 'Multiple Sequence Alignment', 'Phylogeny', 'My Analysis']),
  sequenceIds: z.array(z.number()),
  parameters: z.record(z.any()),
}),
```

### 3. Update Frontend (`client/src/pages/analysis-new.tsx`)

Add the new analysis type to the select dropdown:
```typescript
<SelectItem value="Codon Usage">Codon Usage Bias</SelectItem>
```

### 5. Update Frontend

**Add to dropdown** (`client/src/pages/analysis-new.tsx`):
```typescript
<SelectItem value="My Analysis">My Analysis</SelectItem>
```

**Display results** (`client/src/pages/analysis-detail.tsx`):
```typescript
{analysis.type === 'My Analysis' && (
  <div className="space-y-4">
    <h3>My Analysis Results</h3>
    <Table>
      <TableBody>
        {results.map(r => (
          <TableRow key={r.accession}>
            <TableCell>{r.accession}</TableCell>
            <TableCell>{JSON.stringify(r.result)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
)}
```

### Architecture Benefits

Separating analyses into individual files provides:

- **Modularity**: Each analysis is independent and can be developed/tested separately
- **Scalability**: Adding new analyses is straightforward and follows a clear pattern
- **Maintainability**: Changes to one analysis don't affect others
- **Discoverability**: New developers can quickly find and understand specific analyses
- **Reusability**: Analysis handlers can be tested or reused independently

### Analysis Handler Signature

All handlers follow this interface:

```typescript
export interface AnalysisHandler {
  (analysisId: number, sequences: AnalysisSequence[], storage: IStorage): Promise<void>;
}
```

Where:
- `analysisId`: Unique analysis identifier (for storing results)
- `sequences`: Array of {id, accession, sequence}
- `storage`: Database access (for updating status/results)

Handler MUST call `storage.updateAnalysisStatus()` with:
- `'completed'` + results object on success
- Or let exception bubble up (automatically marked as `'failed'`)

## Adding New Metadata Fields

To add new searchable metadata (e.g., "host_species"):

### 1. Update Database Schema (`shared/schema.ts`)

```typescript
export const sequences = pgTable("sequences", {
  // ... existing fields
  hostSpecies: text("host_species"),  // Add new column
  // ... rest of table
});
```

### 2. Update Search Interface (`shared/schema.ts`)

```typescript
export interface SequenceSearchParams {
  // ... existing fields
  hostSpecies?: string;  // Add new parameter
  // ... rest of interface
}
```

### 3. Update Search Implementation (`server/storage.ts`)

```typescript
async searchSequences(params: SequenceSearchParams): Promise<Sequence[]> {
  let query = db.select().from(sequences);
  const filters: any[] = [];

  // ... existing filters
  if (params.hostSpecies) {
    filters.push(eq(sequences.hostSpecies, params.hostSpecies));
  }

  // ... rest of search logic
}
```

### 4. Update Upload Handler (`server/routes.ts`)

```typescript
const sequencesList = fastaContent.split('>').slice(1).map(block => {
  // ... existing parsing
  return {
    accession,
    sequence: seq,
    sequenceId: meta.sequence_id || undefined,
    samplingDate: meta.sampling_date || undefined,
    country: meta.country || undefined,
    genotype: meta.genotype || undefined,
    outbreak: meta.outbreak || undefined,
    hostSpecies: meta.host_species || undefined,  // Add new field
    metadata: meta,
    filename: fastaFile.originalname
  };
});
```

### 5. Run Migration

```bash
npm run db:push
```

## Modifying Search Behavior

### Case-Insensitive Search

Update `server/storage.ts`:
```typescript
async searchSequences(params: SequenceSearchParams): Promise<Sequence[]> {
  const filters: any[] = [];
  
  if (params.country) {
    // Use ilike for case-insensitive (PostgreSQL)
    filters.push(ilike(sequences.country, `%${params.country}%`));
  }
  
  // ... rest of search
}
```

### Fuzzy Search

For fuzzy/partial matching, install `pg-fuzz`:
```bash
npm install pg-trgm
```

Update schema to add index:
```typescript
sql`CREATE INDEX CONCURRENTLY idx_accession_trgm ON sequences USING gist (accession gist_trgm_ops);`
```

### Pagination

Update API contract (`shared/routes.ts`):
```typescript
search: {
  method: 'GET' as const,
  path: '/api/sequences/search',
  // Add query params for limit/offset
}
```

Implement in storage:
```typescript
async searchSequences(params: SequenceSearchParams, limit = 50, offset = 0) {
  let query = db.select().from(sequences);
  // ... filters
  return await query.limit(limit).offset(offset);
}
```

## Database Migrations

### Create Migration

Drizzle uses an auto-migration approach:

1. Update `shared/schema.ts`
2. Run `npm run db:push`
3. Drizzle automatically generates and applies the migration

### Force Migration (Destructive)

If migration fails:
```bash
npm run db:push -- --force
```

**Warning:** This may drop data if columns are removed.

### Manual Migration

For complex migrations, use raw SQL:
```bash
psql $DATABASE_URL < migration.sql
```

## Testing

### Unit Tests

Add tests to `test/` directory (not currently set up):
```bash
npm install --save-dev vitest
```

Create `test/storage.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { storage } from '../server/storage';

describe('Storage', () => {
  it('should search sequences by country', async () => {
    const results = await storage.searchSequences({ country: 'USA' });
    expect(results).toBeInstanceOf(Array);
  });
});
```

### Integration Tests

Test API endpoints using curl or Postman:
```bash
# Upload test sequences
curl -X POST http://localhost:5000/api/sequences/upload \
  -F "fasta=@test.fasta" \
  -F "metadata=@test.csv"

# Search
curl http://localhost:5000/api/sequences/search?country=USA

# Create analysis
curl -X POST http://localhost:5000/api/analyses \
  -H "Content-Type: application/json" \
  -d '{"type":"GC Content","sequenceIds":[1,2,3],"parameters":{}}'
```

### Manual Testing Checklist

- [ ] Upload sequences without metadata
- [ ] Upload sequences with complete metadata
- [ ] Search by each metadata field individually
- [ ] Search with multiple fields (AND logic)
- [ ] Search with `requireComplete=true`
- [ ] Run GC Content analysis on <10 sequences
- [ ] Run MSA analysis on 10-50 sequences
- [ ] Run Phylogeny on 5-20 sequences
- [ ] Delete a sequence and verify it's gone
- [ ] View analysis results

## Performance Optimization

### Database Indexes

Add to `shared/schema.ts` as needed:
```typescript
export const sequences = pgTable("sequences", {
  // ... columns
}, (table) => ({
  accessionIdx: index("idx_accession").on(table.accession),
  countryIdx: index("idx_country").on(table.country),
  genotypeIdx: index("idx_genotype").on(table.genotype),
  statusIdx: index("idx_status").on(table.status),
}));
```

Then `npm run db:push`.

### Query Optimization

For large datasets, add pagination to `searchSequences()`.

### Caching

TanStack Query automatically caches queries. To invalidate:
```typescript
queryClient.invalidateQueries({ queryKey: ['/api/sequences'] })
```

## Debugging

### Backend Logs

```bash
npm run dev
# Logs appear in terminal with [express] prefix
```

### Database Logs

Query the Neon dashboard or:
```bash
psql $DATABASE_URL
\x
SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 5;
```

### Frontend Logs

Open browser DevTools (F12) to see:
- Console errors/warnings
- Network requests (verify API calls)
- React Query DevTools (npm i @tanstack/react-query-devtools)

### TypeScript Errors

```bash
npm run check
```

## Deployment

### Replit

The app is configured to deploy on Replit:
1. Push to repository
2. Replit auto-deploys via Nix flake

### Other Platforms

Standard Node.js deployment:
```bash
npm run build
npm run start
```

Requires:
- PostgreSQL database URL (env: `DATABASE_URL`)
- Node.js 20+
- MAFFT/IQ-TREE (optional, analyses will fail without)
- R (optional, fallback to JS)

## Contributing

### Code Style

- TypeScript strict mode enabled
- Prettier formatting (configure in IDE)
- ESLint with React plugin
- Follow existing file structure

### Commit Messages

```
feat: Add new analysis type
fix: Correct search query filtering
docs: Update README with new feature
chore: Update dependencies
```

### Pull Request Template

```markdown
## Description
What does this change do?

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change

## Testing
How was this tested?

## Checklist
- [ ] Code follows style guide
- [ ] Tests added/updated
- [ ] Documentation updated
```

## Troubleshooting Development

### Port Already in Use

```bash
lsof -i :5000  # Find process
kill -9 <PID>
npm run dev
```

### Database Connection Issues

```bash
psql $DATABASE_URL  # Test connection
npm run db:push     # Verify migration
```

### Vite Dev Server Not Updating

```bash
rm -rf node_modules/.vite
npm run dev
```

### TypeScript Errors After Dependencies Update

```bash
npm run check
# Fix errors, then:
npm run dev
```

## References

- [Express.js Docs](https://expressjs.com/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [React Query Docs](https://tanstack.com/query/latest)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [MAFFT Manual](https://mafft.cbrc.jp/alignment/manual/manual.html)
- [IQ-TREE Documentation](http://www.iqtree.org/)
