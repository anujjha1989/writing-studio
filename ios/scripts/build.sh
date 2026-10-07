#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
mkdir -p WritingStudio/Assets.xcassets/AppIcon.appiconset
sips -z 1024 1024 ../public/icon-180.png --out WritingStudio/Assets.xcassets/AppIcon.appiconset/icon-1024.png >/dev/null
xcodegen generate
xcodebuild -project WritingStudio.xcodeproj -scheme WritingStudio -sdk iphonesimulator -configuration Debug -derivedDataPath build CODE_SIGNING_ALLOWED=NO build
