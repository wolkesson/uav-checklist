#!/usr/bin/env bash
# Builds a self-contained zip for airgapped machines: the static app plus two
# ways to serve it locally (Node or Python, whichever exists on the target).
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./package.json').version")
NAME="uav-checklist-offline-$VERSION"
OUT="release/$NAME"
rm -rf "$OUT" "release/$NAME.zip"
npm run build
mkdir -p "$OUT"
cp -r dist "$OUT/app"
cp scripts/serve.mjs "$OUT/"
cp samples/*.json "$OUT/" 2>/dev/null || true
cat > "$OUT/README.txt" <<TXT
UAV Checklist $VERSION - offline package

Browsers will not run this app straight from a file:// path, so serve it locally:

  Node.js:   node serve.mjs            then open http://127.0.0.1:8080/
  Python 3:  python3 -m http.server 8080 --bind 127.0.0.1 --directory app

No internet connection is used. Data stays in the browser on this machine;
use Export / Import in the app to move or back up checklists.
TXT
(cd release && zip -qr "$NAME.zip" "$NAME")
echo "Created release/$NAME.zip"
