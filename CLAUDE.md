# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A CSV analyzer web application that runs PostgreSQL entirely in the browser using PGlite. Users can upload CSV files, which are automatically imported into an in-browser PostgreSQL database, then query the data using SQL with syntax highlighting and view results in interactive tables.

## Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Database**: PGlite (in-browser PostgreSQL with IndexedDB persistence)
- **Deployment**: Cloudflare Workers (via Alchemy)
- **UI**: shadcn/ui components + Tailwind CSS v4
- **Code Quality**: Biome (linting and formatting)
- **Testing**: Vitest with jsdom

## Development Commands

```bash
# Development
npm run dev              # Start local dev server with Alchemy
npm run build           # Build for production
npm run preview         # Preview production build

# Deployment (via Alchemy)
npm run deploy          # Deploy to Cloudflare Workers
npm run destroy         # Destroy deployed resources

# Code Quality
npm run lint            # Lint with Biome
npm run lint:fix        # Auto-fix lint issues
npm run format          # Format code with Biome
npm run check           # Check formatting and linting
npm run check:fix       # Auto-fix formatting and linting

# Testing
npm test                # Run tests with Vitest
```

## Architecture

### Core Data Flow

1. **CSV Upload** (`src/lib/csv-processing.ts`):
   - Parses CSV files using PapaParse with validation (max rows: 10,000, max columns: 100, max cell size: 10,000 chars)
   - Sanitizes table names and returns structured data

2. **Database Import** (`src/lib/database-utils.ts`):
   - Infers PostgreSQL column types from CSV data (supports dates, timestamps, UUIDs, numeric types, etc.)
   - Detects sequential columns and converts to auto-increment serial types
   - Automatically selects appropriate primary keys or creates `csv_id` serial column
   - Sanitizes SQL identifiers and handles reserved words
   - Executes table creation with batched inserts (500 rows per batch)

3. **Query Execution** (`src/lib/database-service.ts`):
   - Limits query results to 50,000 rows max
   - Provides table listing, preview, schema inspection, and drop operations

### Key Components

- **App.tsx**: Main application component managing PGlite database instance, table state, and query execution
- **app-sidebar.tsx**: Displays database tables with CSV upload, preview, and delete actions
- **editor.tsx**: CodeMirror 6 SQL editor with syntax highlighting and keyboard shortcuts (Cmd+Enter to run)
- **pglite-table.tsx**: TanStack Table for displaying query results with sorting, filtering, and pagination
- **data-table.tsx**: Generic table component with column visibility, search, and pagination controls

### PGlite Setup

The app creates a single global PGlite instance at startup (`App.tsx:38-41`):
- Persists to IndexedDB at `idb://csv-analyzer`
- Uses `@electric-sql/pglite/live` extension for reactive queries
- Shared via `PGliteProvider` throughout the component tree

### State Management

React state in `App.tsx` manages:
- `uploadedData`: Current query results
- `tableList`: List of tables in database
- `editorContent`: SQL query text
- `currentTableName`: Active table name

All database operations use the `withToast` utility wrapper for consistent error handling and user feedback.

### Deployment (Alchemy)

The `alchemy.run.ts` file configures Cloudflare Workers deployment:
- Uses Alchemy's Vite plugin to generate a Cloudflare Worker
- Entry point: `src/worker.ts`
- Prod stage (`prod`) deploys to custom domain `csv.nicobaier.com`
- PR deployments automatically post preview URLs via GitHub comments
- Stages: `nbbaier` (personal), `prod` (production), or custom stages

## Code Style

- **Formatter**: Biome with tab indentation, line width 90
- **Quotes**: Double quotes for strings
- **Imports**: Automatically organized
- Use `@/` path alias for imports from `src/`

## Testing

- Tests in `src/lib/__tests__/`
- Use Vitest with jsdom environment
- Test utilities: Create CSV files with `new File([content], name, { type: "text/csv" })`

## Important Notes

- PGlite optimizeDeps excludes: `@electric-sql/pglite` and `@electric-sql/pglite/worker` (see `vite.config.ts:15-17`)
- All SQL identifiers are sanitized to prevent injection and handle reserved words
- Type inference happens during CSV import to create appropriate PostgreSQL column types
- Database operations are wrapped in transactions for atomicity
