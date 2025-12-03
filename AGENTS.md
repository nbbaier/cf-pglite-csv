# Agent Guidelines

## Commands
- **Build:** `npm run build`
- **Lint:** `npm run lint` (uses Biome)
- **Check:** `npm run check` (lint + format)
- **Test:** `npm run test` (Vitest)
- **Single Test:** `npm run test -- <filename>`

## Code Style
- **Formatting:** Biome defaults (tabs, double quotes, 90 chars). Run `npm run format`.
- **Imports:** Use `npm run check:fix` to organize imports. Absolute imports from `@/`.
- **Naming:** PascalCase for components, camelCase for functions, kebab-case for files.
- **Types:** Strict TypeScript. Define interfaces/types clearly.
- **UI:** Shadcn UI + Tailwind CSS (`clsx`, `tailwind-merge`).
- **Error Handling:** Use async/await. Throw typed errors where possible.
