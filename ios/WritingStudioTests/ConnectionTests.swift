import XCTest
@testable import WritingStudio

final class ConnectionTests: XCTestCase {
    func testValidServerPreservesSubpath() {
        XCTAssertEqual(Connection.validatedURL(" https://example.com/writing ")?.absoluteString, "https://example.com/writing/")
        XCTAssertEqual(Connection.validatedURL("https://example.com:8443/")?.port, 8443)
    }
    func testUnsafeAddressesAreRejected() {
        for address in ["http://example.com", "file:///tmp/book", "https://user:password@example.com", "https://example.com/?token=secret", "https://example.com/#/write", "garbage"] {
            XCTAssertNil(Connection.validatedURL(address), address)
        }
    }
    func testOriginIncludesSchemeAndPort() {
        let server = URL(string: "https://example.com/writing/")!
        XCTAssertTrue(Connection.sameOrigin(server, URL(string: "https://example.com:443/api/export")!))
        XCTAssertFalse(Connection.sameOrigin(server, URL(string: "https://example.com:8443/")!))
        XCTAssertFalse(Connection.sameOrigin(server, URL(string: "http://example.com/")!))
    }
    func testExportCannotEscapeDirectory() {
        XCTAssertEqual(Connection.safeFilename("../../book.docx"), "book.docx")
        XCTAssertEqual(Connection.safeFilename("draft.epub"), "draft.epub")
    }
}
