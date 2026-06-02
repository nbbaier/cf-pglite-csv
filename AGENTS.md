# Agent Guidelines

## Project overview

This is a Bun-managed Vite + React 19 app deployed to Cloudflare Workers via
Alchemy. It uploads CSV files, imports them into in-browser PGlite/IndexedDB,
and lets users inspect tables or run SQL queries.

Key areas:

- `src/App.tsx` wires the app shell, PGlite provider, and top-level state.
- `src/components/` contains React UI; shadcn-style primitives live in
  `src/components/ui/`.
- `src/lib/csv-processing.ts` handles CSV parsing, table-name sanitization, and
  schema/type inference.
- `src/lib/database-service.ts` and `src/lib/database-utils.ts` contain PGlite
  import/query/schema/drop-table behavior.
- `src/worker.ts`, `alchemy.run.ts`, and `wrangler.jsonc` cover Cloudflare
  Worker deployment.

## Commands

Use Bun by default. Prefer `bun run <script>` over `npm run <script>`.

- Install dependencies: `bun install`
- Dev server / Alchemy dev stage: `bun run dev`
- Build: `bun run build`
- Preview built app: `bun run preview`
- Test: `bun run test`
- Single test file: `bun run test -- <filename>`
- Lint: `bun run lint`
- Format: `bun run format`
- Check lint/format/code quality: `bun run check`
- Auto-fix lint/format/code quality: `bun run fix`
- Deploy production: `bun run deploy`
- Destroy deployed resources: `bun run destroy`

Choose the narrowest verification that proves the change:

- CSV/database logic: run the relevant Vitest file under `src/lib/__tests__/`.
- UI/component changes: run `bun run check`; build if imports, app wiring, or
  Vite configuration changed.
- Worker/Alchemy/deploy changes: run `bun run build` and inspect generated
  deployment config when relevant.

## Code style

- Ultracite/Biome is the source of truth; config lives in `biome.jsonc`.
- Run `bun run fix` before finishing broad or multi-file edits.
- Use strict TypeScript. Prefer `unknown` over `any` and narrow values before use.
- Use `@/` imports for app source.
- Keep component filenames kebab-case and component names PascalCase.
- Follow existing shadcn/Tailwind patterns. Use `cn` from `@/lib/utils` for class
  merging.
- Avoid barrel files and unrelated re-export layers.

## React and UI conventions

- Use function components and hooks; keep hooks at the top level.
- Prefer existing `src/components/ui/*` primitives before adding new UI pieces.
- Preserve accessibility: semantic controls, labels, keyboard support, and clear
  empty/error states.
- Keep component state local unless it is already shared through the app shell.
- React 19 is in use; follow existing patterns for refs and transitions.

## CSV, PGlite, and SQL conventions

- Keep CSV parsing and type inference in `src/lib/csv-processing.ts`.
- Keep database interaction in `src/lib/database-service.ts` or
  `src/lib/database-utils.ts`.
- Treat uploaded CSV content, table names, column names, and ad hoc SQL as
  untrusted input. Preserve existing sanitization and identifier-escaping
  behavior.
- Add or update tests in `src/lib/__tests__/` for parsing, type inference, SQL
  generation, and database behavior.
- PGlite data is browser-local via IndexedDB; avoid assumptions that data exists
  server-side.

## Cloudflare and Alchemy conventions

- Deployment infrastructure is defined in `alchemy.run.ts`.
- Worker entrypoint is `src/worker.ts`; the current Worker API surface is small,
  so avoid adding backend behavior unless the task explicitly needs it.
- Do not hard-code secrets. Use environment/config bindings where possible.
- Be careful with changes to custom domains, stage naming, state storage, and PR
  preview comments.

## Testing

- Tests use Vitest.
- Keep tests focused and colocated under `src/lib/__tests__/` unless a different
  layer needs coverage.
- Do not commit `.only` or `.skip`.
- Prefer async/await over callback-style tests.
