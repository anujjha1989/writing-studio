#!/usr/bin/env bash
# Build, sign with your paid Apple Developer team, and install on a connected iPhone or iPad.
#   ./ios/scripts/install.sh              first paid team in Xcode, first connected device
#   DEVELOPMENT_TEAM=ABCDE12345 DEVICE=<udid> ./ios/scripts/install.sh
set -euo pipefail
cd "$(dirname "$0")/.."
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
if [ -z "${DEVELOPMENT_TEAM:-}" ]; then
  # Teams Xcode knows about; a paid team is preferred over a free Personal Team.
  TEAMS="$(defaults read com.apple.dt.Xcode IDEProvisioningTeamByIdentifier 2>/dev/null | awk '/isFreeProvisioningTeam/{free=$3} /teamID/{gsub(/[^A-Z0-9]/,"",$3); print free $3}')"
  DEVELOPMENT_TEAM="$(printf '%s\n' "$TEAMS" | sort | head -1 | sed 's/^[01;]*//')"
fi
[ -n "${DEVELOPMENT_TEAM:-}" ] || { echo "No Apple team found. Open Xcode > Settings > Accounts, sign in with your Apple ID, then run this again."; exit 1; }
export DEVELOPMENT_TEAM
DEVICE="${DEVICE:-$(xcrun devicectl list devices 2>/dev/null | awk '/physical/ && !/unavailable/{for(i=1;i<=NF;i++) if ($i ~ /^[0-9A-F]{8}-[0-9A-F]{4,}/) {print $i; exit}}')}"
[ -n "$DEVICE" ] || { echo "No iPhone or iPad found. Unlock it, connect it by cable, and tap Trust."; exit 1; }
echo "Team $DEVELOPMENT_TEAM, device $DEVICE"
xcodegen generate >/dev/null
mkdir -p build
if ! xcodebuild -project WritingStudio.xcodeproj -scheme WritingStudio -configuration Release -destination "generic/platform=iOS" -derivedDataPath build -allowProvisioningUpdates build > build/install.log 2>&1; then
  grep -E "error:" build/install.log | sort -u | head -5
  if grep -q "No Accounts" build/install.log; then echo; echo "Xcode is not signed in. Open Xcode > Settings > Accounts, add your Apple ID, then run this again."; fi
  exit 1
fi
xcrun devicectl device install app --device "$DEVICE" build/Build/Products/Release-iphoneos/WritingStudio.app
echo "Installed. Open Writing Studio on the device."
