/**
 * PGlite reads and writes `process.exitCode`, guarded at the source level by
 * `globalThis.process?.env && (...)`. The Cloudflare Vite plugin injects a
 * `define` mapping `globalThis.process.env` to the literal `{}`, so in the
 * minified production build that guard folds to always-true and is stripped,
 * leaving a bare `process` reference. Because `process` doesn't exist in the
 * browser, PGlite.create() throws "process is not defined" (only in the built
 * app — dev is unminified, so the guard survives and short-circuits).
 *
 * Provide the minimal `process` the build already assumes. This module must be
 * imported before any code that touches PGlite (see src/main.tsx).
 */
const globalScope = globalThis as typeof globalThis & {
  process?: { env: Record<string, string | undefined> };
};

if (!globalScope.process) {
  // @ts-expect-error - process is not defined in the browser
  globalScope.process = { env: {} };
}
