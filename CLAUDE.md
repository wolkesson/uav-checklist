# Working on uav-checklist

## Workflow
- Never commit directly to `main`. Every change goes on its own branch
  (`feat/...`, `fix/...`, `docs/...`) and is merged through a pull request.
- Each branch gets a Cloudflare preview build. The owner tests the preview URL
  before merging; merging to `main` deploys production.
- Before opening a PR, run `npm run check`, `npm test` and `npm run build`.
- Bump `version` in `package.json` for user-visible changes. Releases are made by
  pushing a `vX.Y.Z` tag after merge (builds the offline zip).

## Private material: never commit
- Customer checklists, Word/PDF documents and company logos must never be
  committed or pushed. Keep them in `private/` (git-ignored) or outside the repo.
- `.gitignore` blocks `private/`, `*.docx`, `*.pdf` and image files; do not weaken it.
- Before every commit, check the staged diff for customer names, logos (`data:image`)
  and checklist content that came from a user's files.

## Architecture (see docs/adr/)
- Static, client-only app (Svelte 5 + TypeScript + Vite). No backend, no external
  requests, relative paths: the same build must run airgapped.
- Data model in `src/lib/model.ts`. Changing it means bumping `SCHEMA_VERSION`,
  adding a migration in `migrate()` and a test that old files still load.
- Print layout in `src/lib/print/`; Word export (`docx.ts`) must follow the same
  geometry (`geometry.ts`) as the HTML print layout.
- The offline server (`scripts/serve.mjs`) must work on Windows; CI tests it there.
