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
