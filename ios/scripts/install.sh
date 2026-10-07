#!/usr/bin/env bash
# Build, sign with your paid Apple Developer team, and install on a connected iPhone or iPad.
#   ./ios/scripts/install.sh              first paid team in Xcode, first connected device
#   DEVELOPMENT_TEAM=ABCDE12345 DEVICE=<udid> ./ios/scripts/install.sh
set -euo pipefail
cd "$(dirname "$0")/.."
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
if [ -z "${DEVELOPMENT_TEAM:-}" ]; then
  DEVELOPMENT_TEAM="$(defaults read com.apple.dt.Xcode IDEProvisioningTeams 2>/dev/null | awk '/isFreeProvisioningTeam = 0/{paid=1} paid && /teamID/{gsub(/[^A-Z0-9]/,"",$3); print $3; exit}')"
fi
[ -n "${DEVELOPMENT_TEAM:-}" ] || { echo "No paid team found. Sign in under Xcode > Settings > Accounts, or set DEVELOPMENT_TEAM."; exit 1; }
export DEVELOPMENT_TEAM
DEVICE="${DEVICE:-$(xcrun devicectl list devices 2>/dev/null | awk '/available \(paired\)|connected/{for(i=1;i<=NF;i++) if ($i ~ /^[0-9A-F]{8}-[0-9A-F]{4}-/) {print $i; exit}}')}"
[ -n "$DEVICE" ] || { echo "No iPhone or iPad found. Unlock it, connect it by cable, and tap Trust."; exit 1; }
echo "Team $DEVELOPMENT_TEAM, device $DEVICE"
xcodegen generate
xcodebuild -project WritingStudio.xcodeproj -scheme WritingStudio -configuration Release -destination "generic/platform=iOS" -derivedDataPath build -allowProvisioningUpdates build | tail -3
xcrun devicectl device install app --device "$DEVICE" build/Build/Products/Release-iphoneos/WritingStudio.app
echo "Installed. Open Writing Studio on the device."
