# Writing Studio for iPhone and iPad

A small native shell around the Writing Studio web app. The page fills the whole screen (no browser bars), sign-in is remembered between launches, exports open the iOS share sheet (Save to Files, AirDrop, Mail), and the app reopens the page by itself if iOS closes it in the background. Books, editing and syncing are the web app's; nothing is duplicated here.

## Install on your iPhone

1. Once only: open Xcode, go to Settings > Accounts, and sign in with your Apple ID.
2. Connect the iPhone by cable, unlock it, and tap Trust if asked.
3. From the repository folder run `./ios/scripts/install.sh`.

The script picks your team from Xcode (a paid team is preferred), builds, signs and installs. Set `DEVELOPMENT_TEAM` or `DEVICE` to override. Bundle ID: `com.anujjha.writingstudio`. Needs Xcode and XcodeGen (`brew install xcodegen`).

## Using it

- It opens `https://anujrpi.tail549492.ts.net/writing/`. Sign in on the page as you do in Safari.
- Connection settings: Settings in the app has an "iPhone and iPad app" section. From any other page, including a sign-in page, hold two fingers still on the screen for a second.
- Drag down on the page to put the keyboard away.

## Limits

- It needs the Pi to open. If the connection drops while you write, the web app keeps edits on the phone and sends them when the Pi is back.
- Only HTTPS addresses are accepted.

## For development

`./ios/scripts/build.sh` builds for the simulator. `ios/project.yml` is the source of the Xcode project; the generated project, build folder and Info.plist are not committed. To point a debug build at a local test server: `SIMCTL_CHILD_STUDIO_SERVER=http://localhost:3080/ xcrun simctl launch booted com.anujjha.writingstudio`.
