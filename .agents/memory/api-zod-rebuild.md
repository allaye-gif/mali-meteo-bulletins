---
name: api-zod rebuild rule
description: How to safely add new enum values to the generated api-zod schema so both the frontend and the API server accept them.
---

# Adding new enum values to api-zod

The generated code is in `lib/api-zod/src/generated/`. The dist must be rebuilt manually.

**Why:** The API server bundles `@workspace/api-zod` from dist (not src), so TypeScript source edits alone don't take effect. The frontend Vite dev server reads from src, so it picks up changes immediately, but the server needs a rebuild.

**How to apply:**
1. Edit `lib/api-zod/src/generated/types/bulletinInputType.ts` — add the new value to the const object.
2. Edit `lib/api-zod/src/generated/api.ts` — replace ALL occurrences of the `zod.enum([...old values...])` string using Python: `python3 -c "import re; ..."` (sed fails with single-quote issues).
3. Run: `cd lib/api-zod && pnpm tsc -p tsconfig.json`
4. Restart the `artifacts/api-server: API Server` workflow so it rebuilds and picks up the new dist.
5. Also update `lib/api-zod/dist/generated/types/bulletinInputType.d.ts` is covered by step 3.

**For bamako72h**: the DB schema type column is plain `text` with no constraint, so no migration needed — just the Zod schema and the frontend enum constant.
