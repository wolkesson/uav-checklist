#!/usr/bin/env node
// Zero-dependency static server for airgapped use: `node serve.mjs [port]`.
// Binds to 127.0.0.1 only. Set HOST=0.0.0.0 to share on a closed LAN.
// Works on Windows, macOS and Linux.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('./app', import.meta.url)))
const port = Number(process.argv[2] ?? 8080)
const host = process.env.HOST ?? '127.0.0.1'
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
}

/** Maps a URL path to a file inside root, or null if it would escape root. */
export function toFile(urlPath, base = root, pathApi = { resolve, sep }) {
  const file = pathApi.resolve(base, '.' + urlPath)
  return file === base || file.startsWith(base + pathApi.sep) ? file : null
}

async function handle(req, res) {
  let urlPath
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  } catch {
    return res.writeHead(400).end('Bad request')
  }
  let file = toFile(urlPath)
  if (!file) return res.writeHead(403).end('Forbidden')
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
    const body = await readFile(file)
    res.writeHead(200, { 'Content-Type': types[extname(file).toLowerCase()] ?? 'application/octet-stream' }).end(body)
  } catch {
    res.writeHead(404).end('Not found')
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createServer(handle).listen(port, host, () =>
    console.log(`UAV Checklist running at http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/  (Ctrl+C to stop)`))
}
