# UAV Checklist

Write and run checklists for UAV flights. Runs in the browser, works offline,
and can be deployed in an airgapped environment.

> The bundled sample checklist is an example only. Always follow your aircraft
> manufacturer's procedures and your local regulations.

## Features (v0.1)

- Create and edit checklists: sections (flight phases), items, expected response, critical flag, revision number
- Run mode: tick items off, progress and open-critical count, reset; printable
- Import / export as JSON files (single list or all)
- Saved automatically in the browser; installable as a PWA and works offline

## Development

### In the browser (GitHub Codespaces)

On GitHub: **Code → Codespaces → Create codespace on main**. Dependencies install automatically;
then run `npm run dev` in the terminal and the app opens in a preview tab.

### On your own machine

Needs Node.js 22 and Git. Clone, open the folder in VS Code and accept the recommended extensions.
Press **F5** to start the dev server and open the app in Chrome with debugging, or use
**Terminal → Run Task** for `check`, `test` and `package offline zip`.

### Commands

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # type-check
npm test           # unit tests
npm run build      # static build in dist/
```

## Deploy to Cloudflare Pages

Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick this repo:

- Framework preset: none · Build command: `npm run build` · Output directory: `dist`
- Environment variable: `NODE_VERSION=22`

Every push to `main` deploys; every pull request gets a preview URL.

## Airgapped / offline package

```bash
npm run package:offline   # creates release/uav-checklist-offline-<version>.zip
```

Pushing a tag like `v0.1.0` builds the zip in GitHub Actions and attaches it to a GitHub release.
On the target machine, unzip and run `node serve.mjs` (or `python3 -m http.server 8080 --directory app`),
then open http://127.0.0.1:8080/. See `README.txt` inside the zip.

## Project layout

```
src/lib/model.ts        data model, schema version, migrations
src/lib/storage.ts      persistence interface + localStorage implementation
src/lib/io.ts           import / export files
src/lib/store.svelte.ts app state
src/lib/components/     list, editor, runner
samples/                example checklist files
scripts/                offline packaging + local server
docs/adr/               architecture decisions
```

## Licence

MIT
