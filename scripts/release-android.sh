#!/usr/bin/env bash
# Build a signed Android App Bundle (.aab) for Google Play.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Installing JS dependencies (if needed)"
if [[ ! -d node_modules ]]; then
  npm ci
fi

echo "==> Building release AAB"
cd android
./gradlew bundleRelease

AAB="app/build/outputs/bundle/release/app-release.aab"
if [[ -f "$AAB" ]]; then
  echo ""
  echo "SUCCESS: $(cd "$(dirname "$AAB")" && pwd)/$(basename "$AAB")"
  ls -lh "$AAB"
else
  echo "ERROR: AAB not found at $AAB" >&2
  exit 1
fi
