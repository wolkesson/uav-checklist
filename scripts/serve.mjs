#!/usr/bin/env node
// Zero-dependency static server for airgapped use: `node serve.mjs [port]`.
// Binds to 127.0.0.1 only. Set HOST=0.0.0.0 to share on a closed LAN.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'app')
const port = Number(process.argv[2] ?? 8080)
const host = process.env.HOST ?? '127.0.0.1'
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')
  const file = join(root, path.endsWith('/') ? path + 'index.html' : path)
  if (!file.startsWith(root)) return res.writeHead(403).end()
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(body)
  } catch {
    res.writeHead(404).end('Not found')
  }
}).listen(port, host, () => console.log(`UAV Checklist running at http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/`))
