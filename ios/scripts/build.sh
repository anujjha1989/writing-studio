#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
export DEVELOPMENT_TEAM="${DEVELOPMENT_TEAM:-}"
xcodegen generate
xcodebuild -project WritingStudio.xcodeproj -scheme WritingStudio -sdk iphonesimulator -configuration Debug -derivedDataPath build CODE_SIGNING_ALLOWED=NO build
