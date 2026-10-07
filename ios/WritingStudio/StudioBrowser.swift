import SwiftUI
import WebKit

struct SharedItem: Identifiable {
    let id = UUID()
    let url: URL
}

final class StudioBrowser: NSObject, ObservableObject, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
    @Published var loading = true
    @Published var error: String?
    @Published var exportError: String?
    @Published var shareItem: SharedItem?
    @Published private(set) var address: String
    let webView: WKWebView
    private var downloads: [ObjectIdentifier: URL] = [:]

    override init() {
        let saved = UserDefaults.standard.string(forKey: "studio.server") ?? Connection.defaultAddress
        address = Connection.validatedURL(saved)?.absoluteString ?? Connection.defaultAddress
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        webView = WKWebView(frame: .zero, configuration: config)
        super.init()
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = false // Avoid leaving an unsaved editor accidentally.
        webView.load(URLRequest(url: URL(string: address)!))
    }

    func connect(_ value: String) {
        guard let url = Connection.validatedURL(value) else { return }
        address = url.absoluteString
        UserDefaults.standard.set(address, forKey: "studio.server")
        error = nil
        webView.load(URLRequest(url: url))
    }
    func retry() { error = nil; webView.load(URLRequest(url: URL(string: address)!)) }
    func shareLink() { shareItem = SharedItem(url: URL(string: address)!) }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) { loading = true; error = nil }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { loading = false }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError failure: Error) { report(failure) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError failure: Error) { report(failure) }
    private func report(_ failure: Error) {
        guard (failure as NSError).code != NSURLErrorCancelled else { return }
        loading = false; error = failure.localizedDescription
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        loading = false; error = "The writing page was closed by iOS. Reopen it to recover the latest locally saved edits."
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        if url.scheme == "blob" { decisionHandler(.download); return }
        guard Connection.sameOrigin(url, URL(string: address)!) else {
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
        if action.targetFrame == nil, let url = action.request.url, Connection.sameOrigin(url, URL(string: address)!) { webView.load(action.request) }
        return nil
    }
}

struct StudioWebView: UIViewRepresentable {
    @ObservedObject var browser: StudioBrowser
    func makeUIView(context: Context) -> WKWebView { browser.webView }
    func updateUIView(_ webView: WKWebView, context: Context) {}
}
