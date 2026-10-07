import SwiftUI

@main
struct WritingStudioApp: App {
    var body: some Scene {
        WindowGroup { StudioView() }
    }
}

struct StudioView: View {
    @StateObject private var browser = StudioBrowser()
    @Environment(\.colorScheme) private var colorScheme
    private let cloth = Color(red: 0.09, green: 0.27, blue: 0.25)
    var body: some View {
        ZStack {
            cloth.ignoresSafeArea()
            // No native bar: the page has its own header and tab bar, and pads itself for the notch.
            StudioWebView(browser: browser).ignoresSafeArea()
            if browser.loading { ProgressView().tint(.white).padding(14).background(.ultraThinMaterial, in: Capsule()).allowsHitTesting(false) }
            if let error = browser.error {
                ContentUnavailableView {
                    Label("Cannot open Writing Studio", systemImage: "wifi.exclamationmark")
                } description: {
                    Text(error)
                    Text("Check your connection, and turn on Tailscale if you are away from home.")
                } actions: {
                    Button("Try again") { browser.retry() }.buttonStyle(.borderedProminent)
                    Button("Connection settings") { browser.showSettings = true }
                }.background(Color(.systemBackground)).ignoresSafeArea()
            }
        }
        .sheet(isPresented: $browser.showSettings) { ConnectionSettings(browser: browser) }
        .sheet(item: $browser.shareItem, onDismiss: browser.finishSharing) { item in ShareSheet(items: [item.url]) }
        .alert("Export failed", isPresented: Binding(get: { browser.exportError != nil }, set: { if !$0 { browser.exportError = nil } })) {
            Button("OK") { browser.exportError = nil }
        } message: { Text(browser.exportError ?? "") }
        .tint(colorScheme == .dark ? Color(red: 0.76, green: 0.89, blue: 0.83) : cloth)
    }
}

struct ConnectionSettings: View {
    @ObservedObject var browser: StudioBrowser
    @Environment(\.dismiss) private var dismiss
    @State private var address = ""
    @State private var invalid = false
    @State private var confirmChange = false
    var body: some View {
        NavigationStack {
            Form {
                Section("Writing Studio server") {
                    TextField("HTTPS address", text: $address).keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                    if invalid { Text("Enter an HTTPS address without a password, query or fragment.").foregroundStyle(.red) }
                    Text("Use the same address you open in Safari. Sign in on the page itself; your passphrase is not stored here. To open this screen at any time, hold two fingers still on the page for a second.").font(.footnote)
                }
                Section {
                    Text("Your books stay on your Pi. This app uses the existing writing interface and keeps its website data between launches. Offline availability depends on what the web app has already cached; export a backup before relying on offline work.")
                }
                Section {
                    Button("Reload the page") { browser.reload(); dismiss() }
                    Button("Open in Safari") { if let url = Connection.validatedURL(browser.address) { UIApplication.shared.open(url) } }
                }
            }
            .navigationTitle("Connection")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        guard let url = Connection.validatedURL(address) else { invalid = true; return }
                        if url.absoluteString == browser.address { dismiss() } else { confirmChange = true }
                    }
                }
            }
            .confirmationDialog("Switch servers?", isPresented: $confirmChange, titleVisibility: .visible) {
                Button("Switch server") { browser.connect(address); dismiss() }
            } message: { Text("Make sure your edits have saved on the Pi before switching. Switching opens the new server and closes the current page.") }
            .onAppear { address = browser.address }
        }
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController { UIActivityViewController(activityItems: items, applicationActivities: nil) }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
