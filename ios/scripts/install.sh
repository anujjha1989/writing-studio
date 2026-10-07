#!/usr/bin/env bash
# Build, sign with your paid Apple Developer team, and install on a connected iPhone or iPad.
#   ./ios/scripts/install.sh              first paid team in Xcode, first connected device
#   DEVELOPMENT_TEAM=ABCDE12345 DEVICE=<udid> ./ios/scripts/install.sh
set -euo pipefail
cd "$(dirname "$0")/.."
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
if [ -z "${DEVELOPMENT_TEAM:-}" ]; then
  # Teams Xcode knows about; a paid team is preferred over a free Personal Team.
  TEAMS="$( (defaults read com.apple.dt.Xcode IDEProvisioningTeamByIdentifier 2>/dev/null || true) | awk '/isFreeProvisioningTeam/{free=$3} /teamID/{gsub(/[^A-Z0-9]/,"",$3); print free $3}')"
  DEVELOPMENT_TEAM="$(printf '%s\n' "$TEAMS" | sort | head -1 | sed 's/^[01;]*//')"
fi
[ -n "${DEVELOPMENT_TEAM:-}" ] || { echo "No Apple team found. Open Xcode > Settings > Accounts, sign in with your Apple ID, then run this again."; exit 1; }
export DEVELOPMENT_TEAM
DEVICE="${DEVICE:-$(xcrun devicectl list devices 2>/dev/null | awk '/physical/ && !/unavailable/{for(i=1;i<=NF;i++) if ($i ~ /^[0-9A-F]{8}-[0-9A-F]{4,}/) {print $i; exit}}')}"
[ -n "$DEVICE" ] || { echo "No iPhone or iPad found. Unlock it, connect it by cable, and tap Trust."; exit 1; }
echo "Team $DEVELOPMENT_TEAM, device $DEVICE"
xcodegen generate >/dev/null
mkdir -p build
BUILD_ARGS=(-project WritingStudio.xcodeproj -scheme WritingStudio -configuration Release -destination "generic/platform=iOS" -derivedDataPath build)
# A valid local profile can work even when Xcode's account refresh is unavailable.
# Try it first; ask Xcode to refresh provisioning only when signing actually needs it.
BUILT=0
if xcodebuild "${BUILD_ARGS[@]}" build > build/install.log 2>&1; then
  BUILT=1
else
  cp build/install.log build/install-local.log
  if grep -Eq 'No profiles for|requires a provisioning profile|requires a development team|No signing certificate|Provisioning profile .* (expired|doesn.t include|doesn.t support)' build/install.log; then
    if xcodebuild "${BUILD_ARGS[@]}" -allowProvisioningUpdates build > build/install.log 2>&1; then BUILT=1; fi
  fi
fi
if [ "$BUILT" != 1 ]; then
  grep -E "error:" build/install.log | sort -u | head -5 || true
  if grep -q "No Accounts" build/install.log; then
    echo "Xcode could not refresh signing for team $DEVELOPMENT_TEAM. Open the generated project in Xcode, check Signing & Capabilities > Team, and let Xcode prepare a profile. Your account may already be signed in."
  fi
  echo "Build failed. Full details: ios/build/install.log"
  exit 1
fi
xcrun devicectl device install app --device "$DEVICE" build/Build/Products/Release-iphoneos/WritingStudio.app
echo "Installed. Open Writing Studio on the device."
