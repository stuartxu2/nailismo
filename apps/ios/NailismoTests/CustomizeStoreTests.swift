import XCTest
@testable import Nailismo

@MainActor
final class CustomizeStoreTests: XCTestCase {
    private final class MockClient: CustomizeClienting {
        func upload(imageDataURL: String, shape: String, note: String?, email: String?) async throws -> UploadResp { UploadResp(sessionId: "s1", uploadUrl: nil) }
        func intent(sessionId: String) async throws -> IntentResp { IntentResp(clientSecret: "cs") }
        func status(sessionId: String) async throws -> StatusResp { StatusResp(status: "generating", jobs: []) }
        func select(sessionId: String, size: String) async throws -> SelectResp { SelectResp(checkoutUrl: "https://shop/checkout") }
        func designs(customerToken: String) async throws -> [DesignSummary] { [] }
    }

    func test_generating_status_keeps_generating_phase() {
        let store = CustomizeStore(client: MockClient())
        store.applyStatus(StatusResp(status: "generating", jobs: []))
        XCTAssertEqual(store.phase, .generating)
        XCTAssertFalse(store.isTerminal)
    }

    func test_ready_status_with_a_ready_job_is_ready() {
        let store = CustomizeStore(client: MockClient())
        store.applyStatus(StatusResp(status: "ready", jobs: [
            CustomizeJob(status: "ready", resultUrl: "https://b/0.png"),
            CustomizeJob(status: "pending", resultUrl: nil),
        ]))
        XCTAssertEqual(store.phase, .ready)
        XCTAssertTrue(store.hasReadyDesign)
        XCTAssertTrue(store.isTerminal)
    }

    func test_failed_and_refunded_map_to_failed_phase() {
        let store = CustomizeStore(client: MockClient())
        store.applyStatus(StatusResp(status: "failed", jobs: []))
        XCTAssertEqual(store.phase, .failed)
        store.applyStatus(StatusResp(status: "refunded", jobs: []))
        XCTAssertEqual(store.phase, .failed)
        XCTAssertTrue(store.isTerminal)
    }

    func test_canOrder_requires_size_and_a_ready_design() {
        let store = CustomizeStore(client: MockClient())
        store.applyStatus(StatusResp(status: "ready", jobs: [CustomizeJob(status: "ready", resultUrl: "u")]))
        XCTAssertFalse(store.canOrder)            // no size yet
        store.selectedSize = "M"
        XCTAssertTrue(store.canOrder)
    }
}
