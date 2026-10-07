import SwiftUI
import WebKit

struct SharedItem: Identifiable {
    let id = UUID()
    let url: URL
}

/// Owns the one web view that shows Writing Studio, and turns its downloads into share sheets.
final class StudioBrowser: NSObject, ObservableObject, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate, WKScriptMessageHandler, UIGestureRecognizerDelegate {
    @Published var loading = true
    @Published var error: String?
    @Published var exportError: String?
    @Published var shareItem: SharedItem?
    @Published var showSettings = false
    @Published private(set) var address: String
    let webView: WKWebView
    private var downloads: [ObjectIdentifier: URL] = [:]
    private var lastCrash = Date.distantPast
    private var home: URL { URL(string: address)! }

    override init() {
        let saved = UserDefaults.standard.string(forKey: "studio.server") ?? Connection.defaultAddress
        var start = Connection.validatedURL(saved)?.absoluteString ?? Connection.defaultAddress
        #if DEBUG
        // Simulator checks against a local test server: SIMCTL_CHILD_STUDIO_SERVER=http://localhost:3080/
        if let test = ProcessInfo.processInfo.environment["STUDIO_SERVER"], URL(string: test) != nil { start = test }
        #endif
        address = start
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        webView = WKWebView(frame: .zero, configuration: config)
        super.init()
        // The page can ask for the native connection screen: webkit.messageHandlers.studio.postMessage("settings")
        config.userContentController.add(self, name: "studio")
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = false // Avoid leaving an unsaved editor accidentally.
        // Full-bleed: the page already pads itself for the notch and home indicator.
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.keyboardDismissMode = .interactive
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.09, green: 0.27, blue: 0.25, alpha: 1)
        webView.scrollView.backgroundColor = .clear
        // Works on any page, including a sign-in page or a wrong address: hold two fingers still.
        let hold = UILongPressGestureRecognizer(target: self, action: #selector(twoFingerHold(_:)))
        hold.numberOfTouchesRequired = 2
        hold.minimumPressDuration = 0.9
        hold.delegate = self
        webView.addGestureRecognizer(hold)
        webView.load(URLRequest(url: home))
    }

    @objc private func twoFingerHold(_ gesture: UILongPressGestureRecognizer) { if gesture.state == .began { showSettings = true } }
    func gestureRecognizer(_ a: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith b: UIGestureRecognizer) -> Bool { true }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "studio", (message.body as? String) == "settings" { showSettings = true }
    }

    func connect(_ value: String) {
        guard let url = Connection.validatedURL(value) else { return }
        address = url.absoluteString
        UserDefaults.standard.set(address, forKey: "studio.server")
        error = nil
        webView.load(URLRequest(url: url))
    }
    func retry() { error = nil; webView.load(URLRequest(url: home)) }
    func reload() { error = nil; if webView.url != nil { webView.reload() } else { retry() } }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) { loading = true; error = nil }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { loading = false }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError failure: Error) { report(failure) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError failure: Error) { report(failure) }
    private func report(_ failure: Error) {
        let code = (failure as NSError).code
        guard code != NSURLErrorCancelled, code != 102 else { return } // 102: the load became a download
        loading = false; error = failure.localizedDescription
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        // iOS reclaims the page's memory when the app sits in the background. Reopen quietly; the web app
        // restores unsent edits from its own recovery copy. Only stop and ask if it keeps happening.
        if Date().timeIntervalSince(lastCrash) > 20 { lastCrash = Date(); reload(); return }
        loading = false; error = "The writing page keeps closing. Reopen it to recover the latest edits saved on this device."
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        if url.scheme == "blob" { decisionHandler(.download); return }
        if url.scheme == "about" { decisionHandler(.allow); return }
        guard Connection.sameOrigin(url, home) else {
            decisionHandler(.cancel)
            if ["https", "http", "mailto"].contains(url.scheme?.lowercased() ?? "") { UIApplication.shared.open(url) }
            return
        }
        decisionHandler(action.shouldPerformDownload ? .download : .allow)
    }
    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        let disposition = (response.response as? HTTPURLResponse)?.value(forHTTPHeaderField: "Content-Disposition") ?? ""
        decisionHandler(!response.canShowMIMEType || disposition.lowercased().contains("attachment") ? .download : .allow)
    }
    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { download.delegate = self }
    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) { download.delegate = self }
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        do {
            let directory = FileManager.default.temporaryDirectory.appendingPathComponent("WritingStudioExports/\(UUID().uuidString)", isDirectory: true)
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let destination = directory.appendingPathComponent(Connection.safeFilename(suggestedFilename))
            downloads[ObjectIdentifier(download)] = destination
            completionHandler(destination)
        } catch { exportError = error.localizedDescription; completionHandler(nil) }
    }
    func downloadDidFinish(_ download: WKDownload) {
        loading = false
        if let url = downloads.removeValue(forKey: ObjectIdentifier(download)) { shareItem = SharedItem(url: url) }
    }
    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        loading = false; exportError = error.localizedDescription
        if let url = downloads.removeValue(forKey: ObjectIdentifier(download)) { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
    }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if action.targetFrame == nil, let url = action.request.url, Connection.sameOrigin(url, home) { webView.load(action.request) }
        return nil
    }

    // The web app uses its own dialogs, but a sign-in page in front of it may use the browser's.
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        present(message, actions: [("OK", { completionHandler() })])
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        present(message, actions: [("Cancel", { completionHandler(false) }), ("OK", { completionHandler(true) })])
    }
    private func present(_ message: String, actions: [(String, () -> Void)]) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        for (title, run) in actions { alert.addAction(UIAlertAction(title: title, style: title == "Cancel" ? .cancel : .default) { _ in run() }) }
        var top = webView.window?.rootViewController
        while let next = top?.presentedViewController { top = next }
        if let top { top.present(alert, animated: true) } else { actions.last?.1() }
    }
}

struct StudioWebView: UIViewRepresentable {
    @ObservedObject var browser: StudioBrowser
    func makeUIView(context: Context) -> WKWebView { browser.webView }
    func updateUIView(_ webView: WKWebView, context: Context) {}
}
