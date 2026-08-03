#!/usr/bin/env bash
# Builds Nazmyar Windows portable folder + zip (runs on Linux without Wine)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ELECTRON_VER="${ELECTRON_VER:-33.4.11}"
OUT="$ROOT/../dist/Nazmyar-win32-x64"
CACHE="/tmp/electron-v${ELECTRON_VER}-win32-x64.zip"

mkdir -p "$ROOT/../dist" /tmp/nazmyar-app
rm -rf "$OUT" /tmp/nazmyar-app
mkdir -p "$OUT" /tmp/nazmyar-app

if [[ ! -f "$CACHE" ]]; then
  curl -fsSL -o "$CACHE" \
    "https://github.com/electron/electron/releases/download/v${ELECTRON_VER}/electron-v${ELECTRON_VER}-win32-x64.zip"
fi
unzip -q "$CACHE" -d "$OUT"

cp "$ROOT/main.js" "$ROOT/preload.js" "$ROOT/scanner.js" "$ROOT/ai.js" "$ROOT/openrouterFree.js" /tmp/nazmyar-app/
cp -r "$ROOT/renderer" /tmp/nazmyar-app/
node -e "
const p=require('$ROOT/package.json');
require('fs').writeFileSync('/tmp/nazmyar-app/package.json', JSON.stringify({
  name:p.name, version:p.version, description:p.description, main:p.main, author:p.author, license:p.license
}, null, 2));
"

npx --yes asar pack /tmp/nazmyar-app "$OUT/resources/app.asar"
rm -f "$OUT/resources/default_app.asar"
mv "$OUT/electron.exe" "$OUT/Nazmyar.exe"

ZIP="$ROOT/../dist/Nazmyar-win32-x64-v${ELECTRON_VER}.zip"
# Prefer version from package.json for zip name
APP_VER="$(node -p "require('$ROOT/package.json').version")"
ZIP="$ROOT/../dist/Nazmyar-win32-x64-v${APP_VER}.zip"
rm -f "$ZIP"
(cd "$ROOT/../dist" && zip -r -q "$(basename "$ZIP")" Nazmyar-win32-x64)
echo "Built: $OUT"
echo "Zip:   $ZIP"
ls -lh "$OUT/Nazmyar.exe" "$ZIP"
