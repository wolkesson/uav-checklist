# Working on uav-checklist

## Workflow
- Never commit directly to `main`. Every change goes on its own branch
  (`feat/...`, `fix/...`, `docs/...`) and is merged through a pull request.
- Each branch gets a Cloudflare preview build. The owner tests the preview URL
  before merging; merging to `main` deploys production.
- **Every pull request description links to its Cloudflare preview**, under a "Preview"
  heading. The address is the branch name with `/` replaced by `-`, followed by
  `-uav-checklist.henrik-wolkesson.workers.dev`, e.g. branch `feat/list-icons` →
  https://feat-list-icons-uav-checklist.henrik-wolkesson.workers.dev. After the first
  Cloudflare build, check the address against the Cloudflare bot's comment on the PR and
  correct the description if it differs (long branch names may be shortened).
- Before opening a PR, run `npm run check`, `npm test` and `npm run e2e` (builds, then runs a
  browser smoke test with the production Content-Security-Policy from `public/_headers`).
  In Claude cloud sessions set `CHROMIUM_PATH=/opt/pw-browsers/chromium` for `npm run e2e`.
- Dependabot (`.github/dependabot.yml`) opens weekly update PRs; review them like any other PR.
  Don't use `npm audit fix --force`: it can downgrade packages across major versions.
- Bump `version` in `package.json` for user-visible changes. Releases are made by
  creating a `vX.Y.Z` release on github.com or pushing a `vX.Y.Z` tag after merge; either way the
  release workflow builds the offline zip and attaches it. The tag must match `package.json`.

## Node version
- One Node major everywhere: `.node-version` (read by CI), the Cloudflare `NODE_VERSION`
  variable, the dev container image and `@types/node`'s major. Change them together.

## Private material: never commit
- Customer checklists, Word/PDF documents and company logos must never be
  committed or pushed. Keep them in `private/` (git-ignored) or outside the repo.
- `.gitignore` blocks `private/`, `*.docx`, `*.pdf` and image files; do not weaken it.
- Before every commit, check the staged diff for customer names, logos (`data:image`)
  and checklist content that came from a user's files.

## User interface
- Follow `docs/ui-guidelines.md` (WCAG 2.2 AA based): Lucide icons only, icon-only buttons via
  `IconButton.svelte` (accessible name + tooltip), destructive actions red and confirmed with
  `ConfirmDialog.svelte`, never `alert()`/`confirm()`/`prompt()`.

## Architecture (see docs/adr/)
- Static, client-only app (Svelte 5 + TypeScript + Vite). No backend, no external
  requests, relative paths: the same build must run airgapped.
- Data model in `src/lib/model.ts`. Changing it means bumping `SCHEMA_VERSION`,
  adding a migration in `migrate()` and a test that old files still load.
- Print layout in `src/lib/print/`; Word export (`docx.ts`) must follow the same
  geometry (`geometry.ts`) as the HTML print layout.
- The offline server (`scripts/serve.mjs`) must work on Windows; CI tests it there.
