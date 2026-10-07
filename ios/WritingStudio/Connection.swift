import Foundation

struct Connection {
    static let defaultAddress = "https://anujrpi.tail549492.ts.net/writing/"

    static func validatedURL(_ address: String) -> URL? {
        guard var parts = URLComponents(string: address.trimmingCharacters(in: .whitespacesAndNewlines)),
              parts.scheme?.lowercased() == "https", let host = parts.host, !host.isEmpty,
              parts.user == nil, parts.password == nil,
              parts.query == nil, parts.fragment == nil else { return nil }
        parts.scheme = "https"
        if !parts.path.hasSuffix("/") { parts.path += "/" }
        return parts.url
    }

    static func sameOrigin(_ lhs: URL, _ rhs: URL) -> Bool {
        lhs.scheme?.lowercased() == rhs.scheme?.lowercased() &&
        lhs.host?.lowercased() == rhs.host?.lowercased() && (lhs.port ?? 443) == (rhs.port ?? 443)
    }

    static func safeFilename(_ proposed: String) -> String {
        let name = URL(fileURLWithPath: proposed).lastPathComponent
        return name.isEmpty || name == "." || name == ".." ? "Writing Studio Export" : name
    }
}
