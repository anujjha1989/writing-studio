# Writing Studio for iPhone and iPad

A SwiftUI companion using the existing Writing Studio website in a persistent WKWebView. Books, editing UI and synchronization remain owned by the web app; this client adds connection settings, persistent website sign-in, native export sharing and a recoverable connection-error screen. It does not bundle a second writing interface or store a passphrase in source.

## Reproducible build

Install Xcode and XcodeGen, then run `./ios/scripts/build.sh` from the repository root. `ios/project.yml` is the canonical project configuration; generated Xcode projects and builds are ignored. The build script generates the icon from the existing home-screen PNG, enlarged for the required iOS asset size; a future vector icon consolidation can replace it.

Open the generated `ios/WritingStudio.xcodeproj`, select WritingStudio, then choose your paid Apple Developer team under Signing & Capabilities. Connect your iPhone, select it as the run destination and Run. The bundle ID is `com.anujjha.writingstudio`. Team identity is deliberately not hardcoded from the older Personal Team used by Home TV.

For TestFlight, use Product → Archive, then Distribute App after selecting your team and registering this app in App Store Connect. Publishing and device installation are separate steps from a simulator build.

## Connection and limitations

The initial address is `https://anujrpi.tail549492.ts.net/writing/`. Login happens on the existing website; its cookies and website data persist between launches. The native Connection screen accepts HTTPS origins and preserves the `/writing/` subpath. External links open outside the writing view. Exports use WebKit downloads and the iOS share sheet for Save to Files and other destinations.

This is a companion, not an independent offline-native editor. Offline startup depends on WebKit and the web app's cache; service-worker support is not assumed. Keep the Pi reachable while writing and back up/export before relying on offline use. Changing servers prompts you to ensure edits have saved. Switching servers does not erase website data.

Validation: build for simulator and run the ConnectionTests unit tests. The live server, login, writing and authenticated downloads must also be exercised on a real device before release. Do not deploy or change the Pi to install this client.
