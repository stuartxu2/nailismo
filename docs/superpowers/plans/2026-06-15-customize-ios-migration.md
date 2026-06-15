# Customize to Order — iOS Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the web "Customize to Order" AI nail studio to the native iOS app (`apps/ios`): native intake → $2 Stripe deposit → generation → size → Shopify checkout, plus a native "My designs" history/resume list.

**Architecture:** Reuse the web BFF unchanged (`/api/customize/{upload,intent,status,select}`) — no business logic ported. Add one new JSON endpoint (`/api/customize/designs`) that authenticates with the app's existing Shopify `customerAccessToken`. iOS adds a `Features/Customize/` module driven by a single `@Observable` `CustomizeStore` state machine, the Stripe iOS SDK (`StripePaymentSheet`) for the deposit, and four entry points (new tab + Home banner + Shop tile + Account sheet).

**Tech Stack:** Web — Next.js App Router route handlers, Vitest. iOS — SwiftUI, `@Observable`, URLSession, Stripe iOS SDK via SPM, XcodeGen, XCTest.

**Spec:** `docs/superpowers/specs/2026-06-15-customize-ios-migration-design.md`

---

## File Structure

**Web (new)**
- `apps/web/app/api/customize/designs/route.ts` — GET; token→email→session summaries.
- `apps/web/app/api/customize/designs/route.test.ts` — Vitest.

**iOS (new) — under `apps/ios/Nailismo/`**
- `Core/CustomizeModels.swift` — Decodable DTOs + `CustomizeError`.
- `Core/CustomizeClient.swift` — `CustomizeClienting` protocol + live URLSession impl.
- `Stores/CustomizeStore.swift` — `@MainActor @Observable` state machine.
- `Features/Customize/CustomizeView.swift` — tab root + NavigationStack + phase switch + Stripe key bootstrap.
- `Features/Customize/CustomizeIntakeView.swift` — image source + length/shape/note/email.
- `Features/Customize/CustomizePayView.swift` — Stripe PaymentSheet.
- `Features/Customize/CustomizeResultView.swift` — 3 views, size picker, order.
- `Features/Customize/MyDesignsView.swift` — history/resume list.

**iOS (new) — test target**
- `apps/ios/NailismoTests/CustomizeStoreTests.swift` — store logic tests.

**iOS (modified)**
- `apps/ios/project.yml` — add Stripe SPM package, test target, schemes block.
- `apps/ios/Secrets.example.xcconfig` + `Secrets.xcconfig` — add `StripePublishableKey`.
- `apps/ios/Nailismo/Resources/Info.plist` — surface `StripePublishableKey`.
- `apps/ios/Nailismo/Core/Config.swift` — add `stripePublishableKey`.
- `apps/ios/Nailismo/App/RootTabView.swift` — add `.customize` tab.
- `apps/ios/Nailismo/Features/Home/HomeView.swift` — Customize banner.
- `apps/ios/Nailismo/Features/Shop/ShopView.swift` — Customize tile/entry.
- `apps/ios/Nailismo/Features/Account/AccountView.swift` — "My custom designs" row → sheet.

---

## Task 1: New web endpoint `/api/customize/designs`

**Files:**
- Create: `apps/web/app/api/customize/designs/route.ts`
- Test: `apps/web/app/api/customize/designs/route.test.ts`

Run all web commands from `apps/web`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/app/api/customize/designs/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { storefrontFetch } = vi.hoisted(() => ({ storefrontFetch: vi.fn() }));
const { listSessionIds } = vi.hoisted(() => ({ listSessionIds: vi.fn() }));
const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@/lib/shopify/client", () => ({ storefrontFetch }));
vi.mock("@/lib/customize/account", () => ({ listSessionIds }));
vi.mock("@/lib/customize/session", () => ({ getSession }));

import { GET } from "./route";

const reqWith = (token?: string) =>
  new Request("http://localhost/api/customize/designs", {
    headers: token ? { "x-shopify-customer-token": token } : {},
  });

beforeEach(() => {
  storefrontFetch.mockReset();
  listSessionIds.mockReset();
  getSession.mockReset();
});

describe("GET /api/customize/designs", () => {
  it("401s without a customer token", async () => {
    expect((await GET(reqWith())).status).toBe(401);
  });

  it("401s when the token resolves to no customer", async () => {
    storefrontFetch.mockResolvedValueOnce({ customer: null });
    expect((await GET(reqWith("bad"))).status).toBe(401);
  });

  it("returns design summaries for a valid token", async () => {
    storefrontFetch.mockResolvedValueOnce({ customer: { email: "A@x.com" } });
    listSessionIds.mockResolvedValueOnce(["s1", "s2"]);
    getSession.mockImplementation(async (id: string) =>
      id === "s1"
        ? { sessionId: "s1", status: "ready", jobs: [{ seed: 101, status: "ready", resultUrl: "https://b/0.png" }] }
        : { sessionId: "s2", status: "generating", jobs: [] },
    );

    const res = await GET(reqWith("good"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      designs: [
        { sessionId: "s1", status: "ready", thumbUrl: "https://b/0.png" },
        { sessionId: "s2", status: "generating", thumbUrl: undefined },
      ],
    });
    expect(listSessionIds).toHaveBeenCalledWith("A@x.com");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run app/api/customize/designs/route.test.ts`
Expected: FAIL — cannot resolve `./route` (module not found).

- [ ] **Step 3: Write the route**

Create `apps/web/app/api/customize/designs/route.ts`:

```ts
// Native "My designs" feed. Authenticates with the app's Shopify Storefront
// customerAccessToken (header), resolves it to an email, and returns that
// account's session summaries. Mirrors the data on the web /account/designs page
// without the cookie/magic-link path (which the native client can't carry).

import { storefrontFetch } from "@/lib/shopify/client";
import { listSessionIds } from "@/lib/customize/account";
import { getSession } from "@/lib/customize/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CUSTOMER_EMAIL = /* GraphQL */ `
  query CustomerEmail($token: String!) {
    customer(customerAccessToken: $token) { email }
  }
`;

export async function GET(req: Request): Promise<Response> {
  const token = req.headers.get("x-shopify-customer-token");
  if (!token) return Response.json({ error: "unauthorized" }, { status: 401 });

  let email: string | null = null;
  try {
    const data = await storefrontFetch<{ customer: { email: string | null } | null }>(
      CUSTOMER_EMAIL,
      { token },
      { revalidate: 0 },
    );
    email = data.customer?.email ?? null;
  } catch {
    email = null;
  }
  if (!email) return Response.json({ error: "unauthorized" }, { status: 401 });

  const ids = await listSessionIds(email);
  const sessions = (await Promise.all(ids.map((id) => getSession(id).catch(() => null)))).filter(
    (s): s is NonNullable<typeof s> => s != null,
  );
  const designs = sessions.map((s) => ({
    sessionId: s.sessionId,
    status: s.status,
    thumbUrl: s.jobs?.find((j) => j.status === "ready" && j.resultUrl)?.resultUrl,
  }));

  return Response.json({ designs }, { headers: { "Cache-Control": "no-store" } });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run app/api/customize/designs/route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Lint the new file**

Run: `pnpm eslint app/api/customize/designs/route.ts`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/customize/designs/route.ts apps/web/app/api/customize/designs/route.test.ts
git commit -m "feat(customize): designs feed endpoint for the iOS app"
```

---

## Task 2: iOS — Stripe SDK, config, test target

No automated test; verification is a clean `xcodegen generate` + `xcodebuild build` (which resolves the Stripe package). Run all iOS commands from `apps/ios`.

**Files:**
- Modify: `apps/ios/project.yml`
- Modify: `apps/ios/Secrets.example.xcconfig`
- Modify: `apps/ios/Secrets.xcconfig` (gitignored local file; create from example if missing)
- Modify: `apps/ios/Nailismo/Resources/Info.plist`
- Modify: `apps/ios/Nailismo/Core/Config.swift`

- [ ] **Step 1: Add Stripe package, test target, and schemes to `project.yml`**

After the top-level `options:` block, add a `packages:` block:

```yaml
packages:
  Stripe:
    url: https://github.com/stripe/stripe-ios
    minVersion: 24.0.0
```

In the `Nailismo` target, add a `dependencies:` key (sibling of `sources:` / `settings:`):

```yaml
    dependencies:
      - package: Stripe
        product: StripePaymentSheet
```

Add a second target `NailismoTests` under `targets:` (sibling of `Nailismo`):

```yaml
  NailismoTests:
    type: bundle.unit-test
    platform: iOS
    sources:
      - path: NailismoTests
    dependencies:
      - target: Nailismo
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.nailismo.app.tests
        GENERATE_INFOPLIST_FILE: YES
        CODE_SIGNING_ALLOWED: NO
        CODE_SIGNING_REQUIRED: NO
```

At the end of the file, add a top-level `schemes:` block so the app scheme runs the tests:

```yaml
schemes:
  Nailismo:
    build:
      targets:
        Nailismo: all
    test:
      targets:
        - NailismoTests
    run:
      config: Debug
```

- [ ] **Step 2: Add the Stripe key to `Secrets.example.xcconfig`**

Append to `apps/ios/Secrets.example.xcconfig`:

```
// Stripe publishable key (pk_test_… / pk_live_…) — same value the web uses for
// NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY. Client-safe (publishable, not secret).
STRIPE_PUBLISHABLE_KEY =
```

- [ ] **Step 3: Ensure the local `Secrets.xcconfig` has the key**

If `apps/ios/Secrets.xcconfig` exists, add a `STRIPE_PUBLISHABLE_KEY = pk_test_…` line with the real test key. If it does not exist, copy the example: `cp Secrets.example.xcconfig Secrets.xcconfig` and fill all values. (This file is gitignored — never commit it.)

- [ ] **Step 4: Surface the key in `Info.plist`**

In `apps/ios/Nailismo/Resources/Info.plist`, after the `ScanApiHost` entry, add:

```xml
	<key>StripePublishableKey</key>
	<string>$(STRIPE_PUBLISHABLE_KEY)</string>
```

Also update `NSPhotoLibraryUsageDescription` to cover the new use (intake reads an inspo photo). Replace the existing string value with:

```xml
	<string>Nailismo uses your photos to measure your nail size and to read the inspo image for a custom design.</string>
```

- [ ] **Step 5: Add `stripePublishableKey` to `Config.swift`**

In `apps/ios/Nailismo/Core/Config.swift`, add inside `enum Config` (after `scanHost`):

```swift
    static let stripePublishableKey = info("StripePublishableKey")
```

- [ ] **Step 6: Generate the project and build**

Run:
```bash
xcodegen generate
xcodebuild -project Nailismo.xcodeproj -scheme Nailismo \
  -destination 'platform=iOS Simulator,name=iPhone 16' build
```
Expected: package resolution downloads `stripe-ios`; build SUCCEEDS. (First build resolves SPM — needs network.)

- [ ] **Step 7: Commit**

```bash
git add apps/ios/project.yml apps/ios/Secrets.example.xcconfig \
  apps/ios/Nailismo/Resources/Info.plist apps/ios/Nailismo/Core/Config.swift
git commit -m "chore(ios): add Stripe SDK, unit-test target, and Stripe config key"
```
(Do NOT add `Secrets.xcconfig` — it is gitignored.)

---

## Task 3: iOS — Customize DTOs + client

**Files:**
- Create: `apps/ios/Nailismo/Core/CustomizeModels.swift`
- Create: `apps/ios/Nailismo/Core/CustomizeClient.swift`

- [ ] **Step 1: Write the models**

Create `apps/ios/Nailismo/Core/CustomizeModels.swift`:

```swift
import Foundation

// DTOs for the web Customize BFF (apps/web/app/api/customize/*) + the designs
// feed (apps/web/app/api/customize/designs). Field names match the JSON exactly.

struct UploadResp: Decodable { let sessionId: String; let uploadUrl: String? }
struct IntentResp: Decodable { let clientSecret: String }

struct CustomizeJob: Decodable, Hashable {
    let status: String        // "pending" | "ready" | "failed"
    let resultUrl: String?
}

struct StatusResp: Decodable {
    let status: String        // see SessionStatus in the web types
    let jobs: [CustomizeJob]
}

struct SelectResp: Decodable { let checkoutUrl: String }

struct DesignSummary: Decodable, Identifiable, Hashable {
    let sessionId: String
    let status: String
    let thumbUrl: String?
    var id: String { sessionId }
}

struct DesignsResp: Decodable { let designs: [DesignSummary] }

// Server error body shape: { "error": "..." }.
struct CustomizeError: LocalizedError {
    let status: Int
    let message: String
    var errorDescription: String? { message }
}
```

- [ ] **Step 2: Write the client**

Create `apps/ios/Nailismo/Core/CustomizeClient.swift`:

```swift
import UIKit

// Networking for the Customize flow. A protocol so CustomizeStore can be unit
// tested with a stub. Live impl mirrors HTTPScanProvider's style.
protocol CustomizeClienting {
    func upload(imageDataURL: String, shape: String, note: String?, email: String?) async throws -> UploadResp
    func intent(sessionId: String) async throws -> IntentResp
    func status(sessionId: String) async throws -> StatusResp
    func select(sessionId: String, size: String) async throws -> SelectResp
    func designs(customerToken: String) async throws -> [DesignSummary]
}

struct CustomizeClient: CustomizeClienting {
    private var base: String { "https://\(Config.scanHost)/api/customize" }

    func upload(imageDataURL: String, shape: String, note: String?, email: String?) async throws -> UploadResp {
        var body: [String: Any] = ["image": imageDataURL, "shape": shape]
        if let note, !note.isEmpty { body["note"] = note }
        if let email, !email.isEmpty { body["email"] = email }
        return try await post("\(base)/upload", body: body, timeout: 45)
    }

    func intent(sessionId: String) async throws -> IntentResp {
        try await post("\(base)/intent", body: ["sessionId": sessionId])
    }

    func status(sessionId: String) async throws -> StatusResp {
        try await get("\(base)/status/\(sessionId)")
    }

    func select(sessionId: String, size: String) async throws -> SelectResp {
        try await post("\(base)/select", body: ["sessionId": sessionId, "size": size])
    }

    func designs(customerToken: String) async throws -> [DesignSummary] {
        let resp: DesignsResp = try await get(
            "\(base)/designs",
            headers: ["x-shopify-customer-token": customerToken],
        )
        return resp.designs
    }

    // MARK: - HTTP

    private func post<T: Decodable>(_ urlString: String, body: [String: Any], timeout: TimeInterval = 30) async throws -> T {
        var req = URLRequest(url: URL(string: urlString)!)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        req.timeoutInterval = timeout
        return try await send(req)
    }

    private func get<T: Decodable>(_ urlString: String, headers: [String: String] = [:]) async throws -> T {
        var req = URLRequest(url: URL(string: urlString)!)
        req.httpMethod = "GET"
        req.cachePolicy = .reloadIgnoringLocalCacheData
        for (k, v) in headers { req.setValue(v, forHTTPHeaderField: k) }
        req.timeoutInterval = 30
        return try await send(req)
    }

    private func send<T: Decodable>(_ req: URLRequest) async throws -> T {
        let (data, resp) = try await URLSession.shared.data(for: req)
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(code) else {
            let msg = (try? JSONDecoder().decode([String: String].self, from: data))?["error"]
            throw CustomizeError(status: code, message: msg ?? "Something went wrong (\(code)).")
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
}
```

- [ ] **Step 3: Generate + build to verify it compiles**

Run:
```bash
xcodegen generate
xcodebuild -project Nailismo.xcodeproj -scheme Nailismo \
  -destination 'platform=iOS Simulator,name=iPhone 16' build
```
Expected: build SUCCEEDS.

- [ ] **Step 4: Commit**

```bash
git add apps/ios/Nailismo/Core/CustomizeModels.swift apps/ios/Nailismo/Core/CustomizeClient.swift
git commit -m "feat(ios): Customize DTOs and BFF client"
```

---

## Task 4: iOS — CustomizeStore state machine (TDD)

**Files:**
- Create: `apps/ios/Nailismo/Stores/CustomizeStore.swift`
- Test: `apps/ios/NailismoTests/CustomizeStoreTests.swift`

- [ ] **Step 1: Write the failing test**

Create `apps/ios/NailismoTests/CustomizeStoreTests.swift`:

```swift
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
xcodegen generate
xcodebuild -project Nailismo.xcodeproj -scheme Nailismo \
  -destination 'platform=iOS Simulator,name=iPhone 16' test
```
Expected: FAIL — `CustomizeStore` not found / does not compile.

- [ ] **Step 3: Write the store**

Create `apps/ios/Nailismo/Stores/CustomizeStore.swift`:

```swift
import Foundation
import Observation

// One customize session, as a small state machine. Pure status→phase mapping is
// synchronous and unit-tested; network actions drive it. Generation itself is
// triggered server-side by the Stripe webhook — this only polls /status.
@MainActor
@Observable
final class CustomizeStore {
    enum Phase { case intake, uploading, paying, generating, ready, failed }

    var phase: Phase = .intake
    var sessionId: String?
    var clientSecret: String?
    var status: String = "pending_payment"
    var jobs: [CustomizeJob] = []
    var selectedSize: String?
    var errorMessage: String?

    private let client: CustomizeClienting
    private var pollTask: Task<Void, Never>?
    private let pollNanos: UInt64

    init(client: CustomizeClienting = CustomizeClient(), pollSeconds: Double = 2.5) {
        self.client = client
        self.pollNanos = UInt64(pollSeconds * 1_000_000_000)
    }

    // MARK: - Derived

    var hasReadyDesign: Bool { jobs.contains { $0.status == "ready" && $0.resultUrl != nil } }
    var isTerminal: Bool { ["ready", "selected", "ordered", "failed", "refunded"].contains(status) }
    var canOrder: Bool { selectedSize != nil && hasReadyDesign && (status == "ready" || status == "selected") }

    // Pure mapping — unit tested.
    func applyStatus(_ resp: StatusResp) {
        status = resp.status
        jobs = resp.jobs
        switch resp.status {
        case "ready", "selected", "ordered": phase = .ready
        case "failed", "refunded": phase = .failed
        default: phase = .generating
        }
    }

    // MARK: - Actions

    /// Upload the reference + create the $2 PaymentIntent. Advances to `.paying`
    /// on success so the view can present the Stripe sheet with `clientSecret`.
    func beginPayment(imageDataURL: String, shape: String, note: String?, email: String?) async {
        guard phase == .intake else { return }
        phase = .uploading
        errorMessage = nil
        do {
            let up = try await client.upload(imageDataURL: imageDataURL, shape: shape, note: note, email: email)
            let intent = try await client.intent(sessionId: up.sessionId)
            sessionId = up.sessionId
            clientSecret = intent.clientSecret
            phase = .paying
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "Something went wrong."
            phase = .intake
        }
    }

    /// Stripe sheet completed — generation is firing server-side; start polling.
    func paymentCompleted() {
        guard let sessionId else { return }
        status = "generating"
        phase = .generating
        startPolling(sessionId: sessionId)
    }

    /// Stripe sheet canceled/failed — no charge; return to intake.
    func paymentCanceled(message: String? = nil) {
        errorMessage = message
        phase = .intake
    }

    /// Resume an existing session (from My designs): adopt its id and poll/show.
    func resume(sessionId id: String) {
        sessionId = id
        phase = .generating
        startPolling(sessionId: id)
    }

    private func startPolling(sessionId id: String) {
        pollTask?.cancel()
        pollTask = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled {
                if let resp = try? await self.client.status(sessionId: id) {
                    self.applyStatus(resp)
                    if self.isTerminal { break }
                }
                try? await Task.sleep(nanoseconds: self.pollNanos)
            }
        }
    }

    /// Confirm size → mint code + Shopify checkout URL.
    func order() async -> URL? {
        guard let sessionId, let size = selectedSize else { return nil }
        errorMessage = nil
        do {
            let sel = try await client.select(sessionId: sessionId, size: size)
            return URL(string: sel.checkoutUrl)
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "Couldn't start checkout — please retry."
            return nil
        }
    }

    func reset() {
        pollTask?.cancel()
        pollTask = nil
        phase = .intake
        sessionId = nil
        clientSecret = nil
        status = "pending_payment"
        jobs = []
        selectedSize = nil
        errorMessage = nil
    }

    deinit { pollTask?.cancel() }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
xcodebuild -project Nailismo.xcodeproj -scheme Nailismo \
  -destination 'platform=iOS Simulator,name=iPhone 16' test
```
Expected: PASS (4 tests in `CustomizeStoreTests`).

- [ ] **Step 5: Commit**

```bash
git add apps/ios/Nailismo/Stores/CustomizeStore.swift apps/ios/NailismoTests/CustomizeStoreTests.swift
git commit -m "feat(ios): CustomizeStore state machine with unit tests"
```

---

## Task 5: iOS — Intake view

**Files:**
- Create: `apps/ios/Nailismo/Features/Customize/CustomizeIntakeView.swift`

No unit test (UI). Verified at build + manual run (Task 11).

- [ ] **Step 1: Write the intake view**

Create `apps/ios/Nailismo/Features/Customize/CustomizeIntakeView.swift`:

```swift
import SwiftUI
import PhotosUI
import UIKit

private let LENGTHS = ["Short", "Medium", "Long"]
private let SHAPES = ["Almond", "Coffin", "Square", "Round"]

struct CustomizeIntakeView: View {
    @Environment(CustomizeStore.self) private var store
    @Environment(AuthStore.self) private var auth

    @State private var image: UIImage?
    @State private var length = "Medium"
    @State private var shape = "Almond"
    @State private var note = ""
    @State private var email = ""
    @State private var showCamera = false
    @State private var photoItem: PhotosPickerItem?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Your inspo, made wearable.")
                        .font(.display(28)).foregroundStyle(Candy.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("Drop any pic — a photo, a pattern, a whole mood. Our AI designs one custom set and shows it 3 ways in about a minute. $2 to preview, credited to your order.")
                        .font(.bodyFont(14)).foregroundStyle(Candy.subtle).lineSpacing(3)
                }

                imageWell

                HStack(spacing: 10) {
                    CandyButton(title: "Take photo", variant: .ink) {
                        if CameraPicker.isAvailable { showCamera = true }
                    }
                    PhotosPicker(selection: $photoItem, matching: .images) {
                        Text("Upload")
                            .font(.bodyFont(15, .bold)).foregroundStyle(Candy.ink)
                            .frame(maxWidth: .infinity).padding(.vertical, 15)
                            .overlay(Capsule().stroke(Candy.ink, lineWidth: 1.5))
                    }
                }

                chips(title: "Nail length", options: LENGTHS, selection: $length)
                chips(title: "Shape", options: SHAPES, selection: $shape)

                field(label: "Anything to add? (optional)", text: $note, placeholder: "e.g. matte finish, gold accents")
                field(label: "Email (so we can save your designs)", text: $email, placeholder: "you@email.com", keyboard: .emailAddress)

                if let error = store.errorMessage {
                    Text(error).font(.bodyFont(13, .semibold)).foregroundStyle(Color(hex: "C0392B"))
                }

                CandyButton(title: store.phase == .uploading ? "Starting…" : "Preview my design — $2", variant: .pop) {
                    guard let image, store.phase == .intake else { return }
                    let dataURL = "data:image/jpeg;base64," + (image.processedForScan().jpegData(compressionQuality: 0.72)?.base64EncodedString() ?? "")
                    Task {
                        await store.beginPayment(imageDataURL: dataURL, shape: "\(length) \(shape)", note: note, email: email)
                    }
                }
                .disabled(image == nil || store.phase == .uploading)
                .opacity(image == nil || store.phase == .uploading ? 0.45 : 1)

                Text("Not a fee — a $2 deposit, credited to your order 💸")
                    .font(.bodyFont(12, .bold)).foregroundStyle(Candy.subtle)
                    .frame(maxWidth: .infinity, alignment: .center)

                Color.clear.frame(height: 92)
            }
            .padding(16)
        }
        .onAppear { if email.isEmpty, let e = auth.customer?.email { email = e } }
        .fullScreenCover(isPresented: $showCamera) {
            CameraPicker { image = $0 }.ignoresSafeArea()
        }
        .onChange(of: photoItem) { _, item in
            guard let item else { return }
            Task {
                if let data = try? await item.loadTransferable(type: Data.self), let ui = UIImage(data: data) {
                    image = ui
                }
                photoItem = nil
            }
        }
    }

    private var imageWell: some View {
        ZStack {
            RoundedRectangle(cornerRadius: Radius.lg)
                .fill(Candy.surface)
                .overlay(RoundedRectangle(cornerRadius: Radius.lg).strokeBorder(Candy.ink, style: StrokeStyle(lineWidth: 2.5, dash: [8, 6])))
            if let image {
                Image(uiImage: image).resizable().scaledToFill()
                    .clipShape(RoundedRectangle(cornerRadius: Radius.lg))
            } else {
                VStack(spacing: 8) {
                    Text("📸").font(.system(size: 48))
                    Text("Drop your inspo here").font(.display(20)).foregroundStyle(Candy.ink)
                    Text("JPG / PNG / HEIC").font(.bodyFont(13, .semibold)).foregroundStyle(Candy.subtle)
                }
            }
        }
        .frame(height: 230)
        .candyShadow()
    }

    private func chips(title: String, options: [String], selection: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Eyebrow(title)
            HStack(spacing: 8) {
                ForEach(options, id: \.self) { o in
                    let active = selection.wrappedValue == o
                    Button { selection.wrappedValue = o } label: {
                        Text(o).font(.bodyFont(13, .bold))
                            .foregroundStyle(active ? Candy.onPop : Candy.ink)
                            .padding(.horizontal, 14).padding(.vertical, 9)
                            .background(active ? Candy.pop : Candy.surface, in: Capsule())
                            .overlay(Capsule().stroke(active ? Candy.pop : Candy.border, lineWidth: 1.5))
                    }
                    .buttonStyle(PressableStyle())
                }
            }
        }
    }

    private func field(label: String, text: Binding<String>, placeholder: String, keyboard: UIKeyboardType = .default) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Eyebrow(label)
            TextField(placeholder, text: text)
                .font(.bodyFont(15)).foregroundStyle(Candy.ink)
                .keyboardType(keyboard).autocorrectionDisabled(keyboard == .emailAddress)
                .textInputAutocapitalization(keyboard == .emailAddress ? .never : .sentences)
                .padding(.horizontal, 14).padding(.vertical, 12)
                .background(Candy.surface, in: RoundedRectangle(cornerRadius: Radius.md))
                .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Candy.border, lineWidth: 1.5))
        }
    }
}
```

- [ ] **Step 2: Build to verify it compiles**

Run:
```bash
xcodegen generate
xcodebuild -project Nailismo.xcodeproj -scheme Nailismo \
  -destination 'platform=iOS Simulator,name=iPhone 16' build
```
Expected: build SUCCEEDS. (View isn't wired into navigation yet — that's Task 9/10. Compiling is the gate here.)

- [ ] **Step 3: Commit**

```bash
git add apps/ios/Nailismo/Features/Customize/CustomizeIntakeView.swift
git commit -m "feat(ios): Customize intake view"
```

---

## Task 6: iOS — Stripe payment view

**Files:**
- Create: `apps/ios/Nailismo/Features/Customize/CustomizePayView.swift`

- [ ] **Step 1: Write the payment view**

Create `apps/ios/Nailismo/Features/Customize/CustomizePayView.swift`:

```swift
import SwiftUI
import StripePaymentSheet

// Presents the native Stripe PaymentSheet for the $2 deposit using the
// PaymentIntent client secret. On success, the store starts polling /status
// (generation is fired by the Stripe webhook server-side).
struct CustomizePayView: View {
    @Environment(CustomizeStore.self) private var store
    @State private var sheet: PaymentSheet?
    @State private var presenting = false

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Eyebrow("hold your spot")
            Text("$2 deposit — you get it back 💸")
                .font(.display(26)).foregroundStyle(Candy.ink)
                .fixedSize(horizontal: false, vertical: true)
            Text("Credited straight to your $69 set when you order.")
                .font(.bodyFont(14)).foregroundStyle(Candy.subtle)

            if let error = store.errorMessage {
                Text(error).font(.bodyFont(13, .semibold)).foregroundStyle(Color(hex: "C0392B"))
            }

            CandyButton(title: "Pay $2 & generate", variant: .pop) { present() }

            VStack(alignment: .leading, spacing: 6) {
                Text("↺ $2 comes off your $69 order automatically")
                Text("🎨 Your custom design in 3 views, yours to keep")
            }
            .font(.bodyFont(13, .bold)).foregroundStyle(Candy.subtle)

            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .onAppear(perform: buildSheet)
    }

    private func buildSheet() {
        guard let clientSecret = store.clientSecret, sheet == nil else { return }
        var config = PaymentSheet.Configuration()
        config.merchantDisplayName = "Nailismo"
        config.primaryButtonColor = UIColor(Candy.pop)
        sheet = PaymentSheet(paymentIntentClientSecret: clientSecret, configuration: config)
    }

    private func present() {
        guard let sheet,
              let root = UIApplication.shared.connectedScenes
                .compactMap({ ($0 as? UIWindowScene)?.keyWindow })
                .first?.rootViewController?.topMostPresented
        else { return }
        sheet.present(from: root) { result in
            switch result {
            case .completed: store.paymentCompleted()
            case .canceled: break // stay on the pay screen
            case .failed(let error): store.paymentCanceled(message: error.localizedDescription)
            }
        }
    }
}

private extension UIViewController {
    var topMostPresented: UIViewController {
        var vc = self
        while let p = vc.presentedViewController { vc = p }
        return vc
    }
}
```

- [ ] **Step 2: Build to verify it compiles (Stripe import resolves)**

Run:
```bash
xcodebuild -project Nailismo.xcodeproj -scheme Nailismo \
  -destination 'platform=iOS Simulator,name=iPhone 16' build
```
Expected: build SUCCEEDS (`import StripePaymentSheet` resolves).

- [ ] **Step 3: Commit**

```bash
git add apps/ios/Nailismo/Features/Customize/CustomizePayView.swift
git commit -m "feat(ios): Stripe PaymentSheet deposit view"
```

---

## Task 7: iOS — Result view

**Files:**
- Create: `apps/ios/Nailismo/Features/Customize/CustomizeResultView.swift`

- [ ] **Step 1: Write the result view**

Create `apps/ios/Nailismo/Features/Customize/CustomizeResultView.swift`:

```swift
import SwiftUI

private let SIZES = ["S", "M", "L", "XL"]
private let VIEW_LABELS = ["The set", "On your hand", "Your kit"]
private let VIEW_CAPTIONS = ["Flat-lay", "Worn", "In the box"]

// Generating + ready states for one session: one design shown three ways, then a
// size picker and the Shopify checkout hand-off (opened in SafariView).
struct CustomizeResultView: View {
    @Environment(CustomizeStore.self) private var store
    var onMeasure: () -> Void = {}

    @State private var checkoutURL: URL?
    @State private var ordering = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                header

                if store.phase == .failed {
                    failed
                } else {
                    grid
                    if store.phase == .ready && store.hasReadyDesign {
                        buyPanel
                    }
                }

                Color.clear.frame(height: 92)
            }
            .padding(16)
        }
        .sheet(item: $checkoutURL) { url in
            SafariView(url: url).ignoresSafeArea()
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Eyebrow(store.phase == .ready ? "your custom set" : "designing")
            Text(store.phase == .ready ? "Your design, 3 ways." : "Painting your nails… 💅")
                .font(.display(28)).foregroundStyle(Candy.ink)
                .fixedSize(horizontal: false, vertical: true)
            Text(store.phase == .ready
                 ? "One hand-painted set — flat-lay, worn on a hand, and in its kit. Grab your size to order it."
                 : "Reading your pic, painting one custom set, then shooting it 3 ways. About a minute! ✨")
                .font(.bodyFont(14)).foregroundStyle(Candy.subtle).lineSpacing(3)
        }
    }

    private var grid: some View {
        VStack(spacing: 14) {
            ForEach(0..<3, id: \.self) { i in
                let job = i < store.jobs.count ? store.jobs[i] : nil
                ZStack {
                    RoundedRectangle(cornerRadius: Radius.lg).fill(Candy.surface)
                    if let job, job.status == "ready", let url = job.resultUrl.flatMap(URL.init) {
                        AsyncImage(url: url) { img in
                            img.resizable().scaledToFill()
                        } placeholder: { ProgressView().tint(Candy.accent) }
                        .clipShape(RoundedRectangle(cornerRadius: Radius.lg))
                        .overlay(alignment: .topLeading) {
                            Text(VIEW_LABELS[i]).font(.bodyFont(11, .bold)).foregroundStyle(.white)
                                .padding(.horizontal, 10).padding(.vertical, 5)
                                .background(Candy.accent, in: Capsule()).padding(10)
                        }
                    } else if job?.status == "failed" {
                        Text("\(VIEW_CAPTIONS[i]) unavailable 🥲")
                            .font(.bodyFont(14, .bold)).foregroundStyle(Candy.subtle)
                    } else {
                        VStack(spacing: 8) {
                            Text("💅").font(.system(size: 34))
                            Text("\(VIEW_CAPTIONS[i])…").font(.bodyFont(13, .bold)).foregroundStyle(Candy.ink)
                        }
                    }
                }
                .frame(height: 300)
                .candyShadow()
            }
        }
    }

    private var buyPanel: some View {
        VStack(alignment: .leading, spacing: 14) {
            Eyebrow("your size")
            HStack(spacing: 8) {
                ForEach(SIZES, id: \.self) { s in
                    let active = store.selectedSize == s
                    Button { store.selectedSize = s } label: {
                        Text(s).font(.bodyFont(14, .bold)).frame(minWidth: 52)
                            .foregroundStyle(active ? Candy.onPop : Candy.ink)
                            .padding(.vertical, 10)
                            .background(active ? Candy.pop : Candy.surface, in: Capsule())
                            .overlay(Capsule().stroke(active ? Candy.pop : Candy.border, lineWidth: 1.5))
                    }
                    .buttonStyle(PressableStyle())
                }
            }
            Button("Not sure? Measure your nails →", action: onMeasure)
                .font(.bodyFont(14, .bold)).foregroundStyle(Candy.accent)

            VStack(spacing: 6) {
                priceRow("Custom Nail Set", "$69.00", strong: false)
                priceRow("Design deposit 💸", "−$2.00", strong: false, accent: true)
                Rectangle().fill(Candy.ink).frame(height: 2).padding(.vertical, 6)
                priceRow("You pay today", "$67.00", strong: true)
            }
            .padding(18)
            .background(Candy.surface, in: RoundedRectangle(cornerRadius: Radius.lg))
            .overlay(RoundedRectangle(cornerRadius: Radius.lg).stroke(Candy.border, lineWidth: 1))
            .candyShadow()

            if let error = store.errorMessage {
                Text(error).font(.bodyFont(13, .semibold)).foregroundStyle(Color(hex: "C0392B"))
            }

            CandyButton(title: ordering ? "Starting checkout…" : "Order my custom set", variant: .pop) {
                guard store.canOrder, !ordering else { return }
                ordering = true
                Task { checkoutURL = await store.order(); ordering = false }
            }
            .disabled(!store.canOrder || ordering)
            .opacity(!store.canOrder || ordering ? 0.45 : 1)
        }
    }

    private var failed: some View {
        VStack(spacing: 12) {
            Text("🫶").font(.system(size: 44))
            Text("That render didn't work out.").font(.display(20)).foregroundStyle(Candy.ink)
            Text("Your $2 deposit's been refunded — no charge unless you love it. Try again with another pic!")
                .font(.bodyFont(14)).foregroundStyle(Candy.subtle).multilineTextAlignment(.center)
            CandyButton(title: "Start a new design", variant: .pop) { store.reset() }.frame(maxWidth: 240)
        }
        .frame(maxWidth: .infinity).padding(.top, 40)
    }

    private func priceRow(_ label: String, _ value: String, strong: Bool, accent: Bool = false) -> some View {
        HStack {
            Text(label).font(.bodyFont(strong ? 15 : 14, strong ? .bold : .semibold))
                .foregroundStyle(strong ? Candy.ink : Candy.subtle)
            Spacer()
            Text(value).font(.display(strong ? 20 : 16))
                .foregroundStyle(accent ? Candy.accent : Candy.ink)
        }
    }
}

// Lets `.sheet(item:)` drive on a URL.
extension URL: @retroactive Identifiable { public var id: String { absoluteString } }
```

> If `extension URL: @retroactive Identifiable` already exists elsewhere in the target (search first: `grep -rn "URL.*Identifiable" apps/ios/Nailismo`), delete this trailing extension from the file to avoid a duplicate-conformance error.

- [ ] **Step 2: Check for an existing URL:Identifiable conformance**

Run: `grep -rn "extension URL.*Identifiable" apps/ios/Nailismo`
Expected: only this file. If another exists, remove the extension block at the bottom of `CustomizeResultView.swift`.

- [ ] **Step 3: Build to verify it compiles**

Run:
```bash
xcodegen generate
xcodebuild -project Nailismo.xcodeproj -scheme Nailismo \
  -destination 'platform=iOS Simulator,name=iPhone 16' build
```
Expected: build SUCCEEDS.

- [ ] **Step 4: Commit**

```bash
git add apps/ios/Nailismo/Features/Customize/CustomizeResultView.swift
git commit -m "feat(ios): Customize result view (3 views + size + checkout)"
```

---

## Task 8: iOS — My designs list

**Files:**
- Create: `apps/ios/Nailismo/Features/Customize/MyDesignsView.swift`

- [ ] **Step 1: Write the My designs view**

Create `apps/ios/Nailismo/Features/Customize/MyDesignsView.swift`:

```swift
import SwiftUI

// History/resume list for the signed-in customer. Authenticated by the app's
// Shopify customerAccessToken (Keychain). Tapping a row resumes that session in
// the result view.
struct MyDesignsView: View {
    @Environment(AuthStore.self) private var auth

    @State private var designs: [DesignSummary] = []
    @State private var loading = false
    @State private var loadError: String?
    @State private var resumeStore: CustomizeStore?

    private let client = CustomizeClient()
    private let tokenKey = "nailismo_customer_token"

    private static let statusLabel: [String: String] = [
        "ready": "Ready — pick your favorite",
        "selected": "Design chosen — finish checkout",
        "ordered": "Ordered 🎉",
        "generating": "Generating…",
        "pending_payment": "Awaiting deposit",
        "refunded": "Refunded",
        "failed": "Generation failed",
    ]

    var body: some View {
        Group {
            if !auth.isSignedIn {
                VStack(spacing: 14) {
                    Eyebrow("your account")
                    Text("Sign in to see your designs").font(.display(22)).foregroundStyle(Candy.ink)
                    AuthView()
                }
                .padding(16)
            } else {
                content
            }
        }
        .task(id: auth.isSignedIn) { await load() }
        .sheet(item: $resumeStore) { store in
            NavigationStack {
                CustomizeResultView()
                    .environment(store)
                    .background(Candy.bg.ignoresSafeArea())
            }
        }
    }

    @ViewBuilder private var content: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("My designs.").font(.display(30)).foregroundStyle(Candy.ink)

                if loading {
                    LoadingRow()
                } else if let loadError {
                    ErrorRow(message: loadError) { Task { await load() } }
                } else if designs.isEmpty {
                    Text("No designs yet. Start your custom set →")
                        .font(.bodyFont(15)).foregroundStyle(Candy.subtle)
                } else {
                    ForEach(designs) { d in
                        Button { resume(d) } label: { row(d) }.buttonStyle(.plain)
                    }
                }
                Color.clear.frame(height: 92)
            }
            .padding(16)
        }
    }

    private func row(_ d: DesignSummary) -> some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: Radius.md).fill(Candy.bg).frame(width: 76, height: 76)
                if let url = d.thumbUrl.flatMap(URL.init) {
                    AsyncImage(url: url) { $0.resizable().scaledToFill() } placeholder: { ProgressView() }
                        .frame(width: 76, height: 76).clipShape(RoundedRectangle(cornerRadius: Radius.md))
                }
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(Self.statusLabel[d.status] ?? d.status).font(.bodyFont(15, .bold)).foregroundStyle(Candy.ink)
                Text("Resume →").font(.bodyFont(13, .semibold)).foregroundStyle(Candy.subtle)
            }
            Spacer()
        }
        .padding(12)
        .background(Candy.surface, in: RoundedRectangle(cornerRadius: Radius.lg))
        .overlay(RoundedRectangle(cornerRadius: Radius.lg).stroke(Candy.border, lineWidth: 1))
        .candyShadow()
    }

    private func load() async {
        guard auth.isSignedIn, let token = Keychain.read(tokenKey) else { return }
        loading = true; loadError = nil
        defer { loading = false }
        do {
            designs = try await client.designs(customerToken: token)
        } catch {
            loadError = (error as? LocalizedError)?.errorDescription ?? "Couldn't load your designs."
        }
    }

    private func resume(_ d: DesignSummary) {
        let store = CustomizeStore()
        store.resume(sessionId: d.sessionId)
        resumeStore = store
    }
}

extension CustomizeStore: Identifiable {}
```

> `Keychain.read` and the `"nailismo_customer_token"` key match `AuthStore` (Keychain key constant). If `Keychain.read` has a different signature, check `apps/ios/Nailismo/Core/Keychain.swift` and adjust.

- [ ] **Step 2: Verify the Keychain API + token key**

Run: `grep -n "read\|nailismo_customer_token" apps/ios/Nailismo/Core/Keychain.swift apps/ios/Nailismo/Stores/AuthStore.swift`
Expected: `Keychain.read(_:) -> String?` and the token key string `nailismo_customer_token`. Adjust the call if the signature differs.

- [ ] **Step 3: Build to verify it compiles**

Run:
```bash
xcodegen generate
xcodebuild -project Nailismo.xcodeproj -scheme Nailismo \
  -destination 'platform=iOS Simulator,name=iPhone 16' build
```
Expected: build SUCCEEDS.

- [ ] **Step 4: Commit**

```bash
git add apps/ios/Nailismo/Features/Customize/MyDesignsView.swift
git commit -m "feat(ios): My designs history/resume list"
```

---

## Task 9: iOS — Customize container view

**Files:**
- Create: `apps/ios/Nailismo/Features/Customize/CustomizeView.swift`

- [ ] **Step 1: Write the container**

Create `apps/ios/Nailismo/Features/Customize/CustomizeView.swift`:

```swift
import SwiftUI
import StripePaymentSheet

// Tab root for the Customize flow. Owns the CustomizeStore + its own
// NavigationStack, sets the Stripe publishable key once, and switches subviews
// on the store phase. A "My designs" link pushes the history list.
struct CustomizeView: View {
    var onSelectTab: (Tab) -> Void = { _ in }

    @State private var store = CustomizeStore()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HeaderBand(eyebrow: "customize to order", title: "Custom") {
                    NavigationLink {
                        MyDesignsView().background(Candy.bg.ignoresSafeArea())
                    } label: {
                        Text("My designs").font(.bodyFont(13, .bold)).foregroundStyle(Candy.onAccent)
                    }
                }
                content
            }
            .background(Candy.bg.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
        }
        .environment(store)
        .onAppear { STPAPIClient.shared.publishableKey = Config.stripePublishableKey }
    }

    @ViewBuilder private var content: some View {
        switch store.phase {
        case .intake, .uploading:
            CustomizeIntakeView()
        case .paying:
            CustomizePayView()
        case .generating, .ready, .failed:
            CustomizeResultView(onMeasure: { onSelectTab(.measure) })
        }
    }
}
```

> `HeaderBand`'s trailing-content initializer is used by `HomeView` (`HeaderBand(eyebrow:title:titleSize:) { ... }`). Confirm the available initializers in `apps/ios/Nailismo/DesignSystem/Components/HeaderBand.swift`; if it has no trailing-closure form, use `HeaderBand(eyebrow: "customize to order", title: "Custom")` and place the "My designs" `NavigationLink` as the first row of `content` instead.

- [ ] **Step 2: Verify the HeaderBand initializer**

Run: `grep -n "init\|trailing\|ViewBuilder" apps/ios/Nailismo/DesignSystem/Components/HeaderBand.swift`
Expected: confirm whether a trailing-content initializer exists. Adjust per the note above.

- [ ] **Step 3: Build to verify it compiles**

Run:
```bash
xcodegen generate
xcodebuild -project Nailismo.xcodeproj -scheme Nailismo \
  -destination 'platform=iOS Simulator,name=iPhone 16' build
```
Expected: build SUCCEEDS.

- [ ] **Step 4: Commit**

```bash
git add apps/ios/Nailismo/Features/Customize/CustomizeView.swift
git commit -m "feat(ios): Customize container view + Stripe key bootstrap"
```

---

## Task 10: iOS — Wire the four entry points

**Files:**
- Modify: `apps/ios/Nailismo/App/RootTabView.swift`
- Modify: `apps/ios/Nailismo/Features/Home/HomeView.swift`
- Modify: `apps/ios/Nailismo/Features/Shop/ShopView.swift`
- Modify: `apps/ios/Nailismo/Features/Account/AccountView.swift`

- [ ] **Step 1: Add the `.customize` tab to `RootTabView.swift`**

Change the `Tab` enum:

```swift
enum Tab: Int, CaseIterable {
    case home, shop, measure, customize, favorites, account
}
```

Add the case to the content switch in `RootTabView.body`:

```swift
                case .customize: CustomizeView(onSelectTab: { tab = $0 })
```

Add the tab-bar item in `CandyTabBar.items` (after the `.measure` entry):

```swift
        (.customize, "sparkles", "Custom"),
```

- [ ] **Step 2: Add the Home banner to `HomeView.swift`**

In `HomeView.body`, immediately after `HeroCard { onSelectTab(.shop) }`, add:

```swift
                        CustomizeBand { onSelectTab(.customize) }
```

At the bottom of the file (with the other private structs), add:

```swift
// Lilac promo for the AI customize studio.
private struct CustomizeBand: View {
    var onTap: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Eyebrow("customize to order", color: Candy.onAccent.opacity(0.85))
            Text("Your inspo, made wearable.")
                .font(.display(24)).foregroundStyle(Candy.surface)
                .fixedSize(horizontal: false, vertical: true)
            Text("Upload any pic. AI designs one custom set, shown 3 ways. $2 to preview.")
                .font(.bodyFont(14)).foregroundStyle(Candy.surface.opacity(0.9))
            CandyButton(title: "Design my set ✨", variant: .pop, action: onTap)
                .frame(maxWidth: 220)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Candy.accent, in: RoundedRectangle(cornerRadius: 26))
        .candyShadow()
    }
}
```

- [ ] **Step 3: Add the Shop entry to `ShopView.swift`**

Open `apps/ios/Nailismo/Features/Shop/ShopView.swift`. ShopView's signature currently takes no tab callback; add one and a tappable entry above the product grid.

First, read the file to confirm where the grid/header is:
Run: `grep -n "struct ShopView\|var body\|onSelectTab\|ScrollView\|LazyVGrid\|HeaderBand" apps/ios/Nailismo/Features/Shop/ShopView.swift`

Then:
- Add `var onSelectTab: (Tab) -> Void = { _ in }` as the first stored property of `ShopView`.
- Insert a compact entry row at the top of the scrollable content (above the grid):

```swift
            Button { onSelectTab(.customize) } label: {
                HStack(spacing: 12) {
                    Text("✨").font(.system(size: 22))
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Customize to order").font(.bodyFont(15, .bold)).foregroundStyle(Candy.ink)
                        Text("Upload inspo → one custom set, 3 ways").font(.bodyFont(12)).foregroundStyle(Candy.subtle)
                    }
                    Spacer()
                    Image(systemName: "chevron.right").font(.system(size: 13, weight: .semibold)).foregroundStyle(Candy.border)
                }
                .padding(14)
                .background(Candy.surface, in: RoundedRectangle(cornerRadius: Radius.lg))
                .overlay(RoundedRectangle(cornerRadius: Radius.lg).stroke(Candy.border, lineWidth: 1))
            }
            .buttonStyle(.plain)
```

Then update the call site in `RootTabView.body`:

```swift
                case .shop: ShopView(onSelectTab: { tab = $0 })
```

> Match the surrounding indentation/layout container in ShopView (it may use a `VStack`/`LazyVGrid` inside a `ScrollView`). Place the button as the first child of that scroll content with the same horizontal padding the grid uses.

- [ ] **Step 4: Add the Account "My custom designs" row to `AccountView.swift`**

Add a state flag to `AccountView`:

```swift
    @State private var showDesigns = false
```

In the `quickLinks` `VStack`, after the "Favorites" row + its `Divider`, add:

```swift
            AccountRow(icon: "sparkles", title: "My custom designs",
                       subtitle: "Your AI custom sets") { showDesigns = true }
            Divider().background(Candy.border)
```

Add the sheet to the outer `VStack` in `AccountView.body` (e.g. after `.background(Candy.bg)`):

```swift
        .sheet(isPresented: $showDesigns) {
            NavigationStack {
                MyDesignsView().background(Candy.bg.ignoresSafeArea())
            }
        }
```

- [ ] **Step 5: Generate, build, and run the full test suite**

Run:
```bash
xcodegen generate
xcodebuild -project Nailismo.xcodeproj -scheme Nailismo \
  -destination 'platform=iOS Simulator,name=iPhone 16' test
```
Expected: build SUCCEEDS and `CustomizeStoreTests` PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/ios/Nailismo/App/RootTabView.swift apps/ios/Nailismo/Features/Home/HomeView.swift \
  apps/ios/Nailismo/Features/Shop/ShopView.swift apps/ios/Nailismo/Features/Account/AccountView.swift
git commit -m "feat(ios): wire Customize entry points (tab, home, shop, account)"
```

---

## Task 11: Manual verification + docs

**Files:**
- Modify: `apps/ios/README.md`

- [ ] **Step 1: Manual run on the simulator**

Run:
```bash
cd apps/ios
xcodegen generate
open Nailismo.xcodeproj
```
In Xcode, run on an iPhone 16 (iOS 17+) simulator and verify:
1. New "Custom" tab appears; Home banner, Shop row, and Account "My custom designs" all open the flow.
2. Intake: pick a photo (library + camera), set length/shape, email prefilled when signed in.
3. Tap "Preview my design — $2" → Stripe PaymentSheet appears. Pay with test card `4242 4242 4242 4242`, any future expiry, any CVC/ZIP.
4. After payment → "Painting your nails…" with 3 shimmer tiles; tiles fill in as `/status` reports ready.
5. Pick a size → "Order my custom set" → Shopify checkout opens in in-app Safari with the $2-off applied.
6. My designs (signed in) lists past sessions; tapping one resumes the result view.

> Per project preference, there is no automated screenshot loop — eyeball the simulator. Requires `STRIPE_PUBLISHABLE_KEY` (test) and the Shopify public token in `Secrets.xcconfig`, and the web BFF reachable at `ScanApiHost` (default `nailismo.com`).

- [ ] **Step 2: Update the iOS README status**

In `apps/ios/README.md`, update the Status paragraph to note the Customize flow is live, and add the Stripe requirement under Secrets. Add to the "Secrets (Pass 2)" section:

```
Also set `STRIPE_PUBLISHABLE_KEY` (the publishable `pk_…` key, same as the web's
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) for the Customize $2 deposit.
```

- [ ] **Step 3: Commit**

```bash
git add apps/ios/README.md
git commit -m "docs(ios): note Customize flow + Stripe key in README"
```

---

## Self-Review Notes (for the implementer)

- **Spec coverage:** Task 1 = new designs endpoint (§2). Tasks 3–4 = client + store (§3 Core). Tasks 5–9 = the five views (§3 Views). Task 10 = all four entry points (§3). Task 6 + Task 2 = Stripe SDK/PaymentSheet (§4). Polling + status mapping (§5) in Task 4. Error copy (§6) across Tasks 5/7/8. Tests (§7) in Tasks 1 + 4 + 11.
- **Out of scope (held):** no in-app magic-link, no push, no Android — none are tasks here.
- **Type consistency:** `CustomizeJob`/`StatusResp`/`DesignSummary`/`UploadResp`/`IntentResp`/`SelectResp` defined in Task 3 and used unchanged in Tasks 4/7/8. `CustomizeClienting` methods defined in Task 3 match the `MockClient` in Task 4 and the calls in the store. `Phase` cases (`intake/uploading/paying/generating/ready/failed`) defined in Task 4 and switched in Task 9.
- **Verify-before-assume callouts:** Keychain API/key (Task 8 Step 2), `HeaderBand` initializer (Task 9 Step 2), existing `URL: Identifiable` conformance (Task 7 Step 2), ShopView layout container (Task 10 Step 3). Each has an explicit check step.
```
