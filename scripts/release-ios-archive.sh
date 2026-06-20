#!/usr/bin/env bash
# Create an iOS archive for App Store Connect (requires macOS + Xcode + signing).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/ios"

SCHEME="${IOS_SCHEME:-votabase}"
WORKSPACE="${IOS_WORKSPACE:-votabase.xcworkspace}"
ARCHIVE_PATH="${ARCHIVE_PATH:-$ROOT/ios/build/Votabase.xcarchive}"

if [[ ! -d "$ROOT/node_modules" ]]; then
  cd "$ROOT" && npm ci
fi

echo "==> pod install"
bundle install --quiet 2>/dev/null || true
bundle exec pod install

echo "==> xcodebuild archive (scheme=$SCHEME)"
mkdir -p "$(dirname "$ARCHIVE_PATH")"
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  -destination 'generic/platform=iOS' \
  archive

echo ""
echo "SUCCESS: $ARCHIVE_PATH"
echo "Next: open Xcode → Window → Organizer → Distribute App → App Store Connect"
