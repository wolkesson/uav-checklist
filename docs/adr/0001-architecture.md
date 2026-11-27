# ADR 0001: Core architecture

Date: 2026-11-26 · Status: Accepted

## Context

The tool writes and runs checklists for UAV flights. It must be published as a
free web app and later run as a standalone app in an airgapped environment.

## Decisions

| # | Decision | Why |
|---|----------|-----|
| 1 | **Static, client-only app. No backend.** | Free hosting; the same files run airgapped; no accounts or server to secure. |
| 2 | **Svelte 5 + TypeScript + Vite.** | Small bundles, little boilerplate, fast builds. |
| 3 | **Data lives on the device** (localStorage now), behind a `ChecklistRepository` interface. | Works offline. The interface lets us move to IndexedDB, a file system or a sync server without touching the UI. |
| 4 | **Checklists are versioned JSON** (`schemaVersion`, `kind: "uav-checklist"`) with `migrate()`. | Import/export files are the sharing and backup mechanism, and the way data crosses the air gap. Old files must keep loading. |
| 5 | **PWA with a service worker** (vite-plugin-pwa). | Installed copies keep working with no signal in the field. |
| 6 | **Relative asset paths** (`base: './'`), no CDNs, no external fonts, no telemetry. | Same build works at any URL or sub-folder, and never needs the internet. A strict CSP in `public/_headers` enforces this on the web. |
| 7 | **Hosting: Cloudflare Workers static assets** (`wrangler.jsonc`) via its GitHub integration. | Free, fast CDN, preview deploy per pull request. Cloudflare's recommended successor to Pages; still static files only. |
| 8 | **Airgapped delivery: a zip** of the build plus a zero-dependency local server (`serve.mjs`, or Python's `http.server`), attached to each GitHub release. | Browsers won't run module scripts from `file://`; a tiny local server is the simplest fix. A desktop wrapper (Tauri) can be added later without changing the app. |
| 9 | **Public repo, MIT licence.** | |

## Consequences

- Data is per browser/device. Users must export to back up or move lists. Sync is a later, opt-in feature.
- Any feature that needs the network (maps, weather, NOTAMs) must be optional and degrade gracefully offline.
- Changing the data model means bumping `SCHEMA_VERSION` and adding a migration plus a test.

---

# ADR 0002: Printing and export

Date: 2026-11-26 · Status: Accepted

| Decision | Why |
|----------|-----|
| **Print uses one HTML layout**, paginated in JavaScript into fixed-size pages, printed through the browser's print dialog. | What you see in the preview is exactly what prints. Works offline. |
| **PDF is generated directly** with `pdf-lib` (`src/lib/print/pdf.ts`, loaded on demand), using the same geometry, pagination engine and box styles, and the standard Helvetica fonts. *(Changed 2026-11-27: previously PDF went through the print dialog's "Save as PDF"; the owner wanted a one-click download.)* | One click, no print-dialog settings to get right. Text stays selectable; no fonts to embed. Characters outside the standard fonts' Latin set print as "?". Page breaks can differ slightly from the preview, as the PDF measures text with its own fonts. |
| **Pagination is our own** (`src/lib/print/layout.ts`): rows are measured, then boxes are flowed into columns and pages. Short (≤ 8 rows) and emergency boxes never split; titles never sit alone at a column bottom; bullet groups stay with their parent. | CSS multi-column cannot repeat headers/footers with page numbers or keep these rules reliably. |
| **Word export with the `docx` library**, loaded only when used. Rows are single cells with a right-aligned tab for the value, like the original Word template. | Produces an editable .docx that follows the same page size, columns and box styles. Word does its own pagination, so page breaks can differ slightly from the PDF. |
| **The logo is stored inside each checklist** as a PNG data URL (converted and downscaled on upload). | Shared checklist files print with the right logo. Customer logos and documents are never committed: `.gitignore` blocks `private/`, `*.docx`, `*.pdf` and image files. |

---

# ADR 0003: Hidden previews list contacts GitHub

Date: 2026-11-27 · Status: Accepted

**Decision:** Tapping the version label (bottom right) 10 times opens a list of available
versions: production and the Cloudflare preview of every open pull request. The list is fetched
from `api.github.com` (public repo, no login) when the dialog opens; preview addresses are derived
from branch names. The Content-Security-Policy allows `connect-src https://api.github.com` for this.

**Why:** The owner wants to find and open previews from the app itself.

**Consequences:** This is the only request to the internet, an exception to ADR 0001's
"no external requests". It happens only on that explicit action; offline or airgapped the dialog
shows a message and the rest of the app is unaffected. GitHub allows 60 unauthenticated requests
per hour per network. Very long branch names may get a shortened preview address from Cloudflare.

