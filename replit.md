# Hepatitis A Genome Sequence Database

## Overview

A full-stack TypeScript application for managing, analyzing, and exploring Hepatitis A virus genome sequences. The system provides sequence upload (FASTA + CSV metadata), metadata-based search, multiple sequence alignment (MSA) using MAFFT, phylogenetic tree construction using IQ-TREE, and interactive visualization of results.

The application is designed to handle large datasets (10M+ sequences) with proper indexing and supports background processing for computationally intensive bioinformatics analyses.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, built with Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom scientific/data-heavy theme (deep teal & slate palette)
- **Visualization**: Recharts for data charts, MSA.js for sequence alignment viewer, PhyloTree.js for phylogenetic trees (loaded via CDN)

### Backend Architecture
- **Server**: Express.js with TypeScript
- **API Design**: REST API with typed contracts defined in `shared/routes.ts` using Zod schemas
- **File Upload**: Multer for multipart form-data handling (FASTA + metadata CSV files)
- **Analysis Processing**: Background job processing with status tracking (pending → running → completed/failed)

### Data Storage
- **Database**: PostgreSQL (supports both Neon serverless and local PostgreSQL via node-postgres)
- **ORM**: Drizzle ORM with type-safe schema definitions in `shared/schema.ts`
- **Tables**:
  - `sequences`: Stores genome sequences with metadata (accession, sequence data, sampling date, country, genotype, outbreak info)
  - `analyses`: Tracks analysis jobs and stores results

### External Tool Integration
- **MAFFT**: Multiple sequence alignment tool (executed via child process, supports conda environments)
- **IQ-TREE**: Phylogenetic inference with GTR+G model
- **R**: Statistical analysis (fallback to JavaScript implementations)

### Key Design Patterns
- **Storage Abstraction**: `IStorage` interface in `server/storage.ts` allows swapping database implementations
- **Modular Analysis Handlers**: Each analysis type (GC content, MSA, phylogeny) is a separate module in `server/analyses/`
- **Shared Type Definitions**: `shared/schema.ts` provides single source of truth for database types used by both frontend and backend
- **API Contract**: `shared/routes.ts` defines typed API endpoints with Zod validation

## External Dependencies

### Database
- **PostgreSQL**: Primary database, configured via `DATABASE_URL` environment variable
- **Neon Serverless**: Optional serverless PostgreSQL driver (`@neondatabase/serverless`) for cloud deployments
- **Drizzle ORM**: Database toolkit with `drizzle-kit` for migrations (`npm run db:push`)

### Bioinformatics Tools (System Dependencies)
- **MAFFT**: Required for multiple sequence alignment analyses
- **IQ-TREE**: Required for phylogenetic tree construction
- **Conda**: Optional environment manager for bioinformatics tools (bioinformatics environment)

### Frontend Libraries
- **MSA.js**: Sequence alignment visualization (CDN: `msa@0.7.0`)
- **PhyloTree.js**: Phylogenetic tree rendering (CDN: `phylotree@0.6.0`)
- **D3.js**: Data visualization foundation (CDN: `d3.v4`)
- **Recharts**: React charting library for analysis results

### Configuration
- Database URL: Set via `DATABASE_URL` environment variable or `config.json` file (see `config.example.json`)
- The application auto-detects connection type (local socket vs remote URL) and uses appropriate PostgreSQL driver