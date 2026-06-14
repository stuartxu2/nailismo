import SwiftUI
import PhotosUI
import UIKit

private enum MeasurePhase {
    case intro, detecting, review, result
}

private let scanSteps = [
    "Lay your hand flat on a table.",
    "Put any standard-size card next to your hand.",
    "Use the blank back, or cover any private numbers.",
    "Keep the card and hand on the same flat surface.",
    "Shoot straight down, from directly above.",
    "Keep your four fingers' nails visible and not in shadow.",
]

struct MeasureView: View {
    var onSelectTab: (Tab) -> Void = { _ in }
    @Environment(FitStore.self) private var fit
    @Environment(CatalogStore.self) private var catalog

    @State private var phase: MeasurePhase = .intro
    @State private var image: UIImage?
    @State private var box: CGSize = .zero
    @State private var segments: [ScanSegment] = []
    @State private var notice: String?
    @State private var showCamera = false
    @State private var photoItem: PhotosPickerItem?
    @State private var manualMode = false

    // Vision on-device first; falls back to the hosted /api/scan.
    private let scanner: ScanProvider = HybridScanProvider()

    var body: some View {
        // Own NavigationStack so the recommended ProductCards (NavigationLink ->
        // ProductRoute) actually push a PDP — this tab isn't hosted by Shop's stack.
        NavigationStack {
            VStack(spacing: 0) {
                HeaderBand(eyebrow: "scan my size", title: "Measure")
                content
            }
            .background(Candy.bg.ignoresSafeArea())
            .navigationBarHidden(true)
            .navigationDestination(for: ProductRoute.self) { ProductDetailView(handle: $0.handle) }
            .fullScreenCover(isPresented: $showCamera) {
                CameraPicker { ui in detect(ui) }.ignoresSafeArea()
            }
            .onChange(of: photoItem) { _, item in
                guard let item else { return }
                Task {
                    if let data = try? await item.loadTransferable(type: Data.self),
                       let ui = UIImage(data: data) {
                        detect(ui)
                    }
                    photoItem = nil
                }
            }
        }
    }

    @ViewBuilder private var content: some View {
        switch phase {
        case .intro: intro
        case .detecting: detecting
        case .review: review
        case .result: result
        }
    }

    // MARK: Intro

    private var intro: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("One photo. Your size.")
                        .font(.display(30)).foregroundStyle(Candy.ink)
                    Text("Lay a hand flat beside any bank card (exactly 85.6 mm wide) and shoot from above. We read your four fingers, estimate the thumb, and read your set size.")
                        .font(.bodyFont(15)).foregroundStyle(Candy.subtle).lineSpacing(3)
                }

                VStack(alignment: .leading, spacing: 12) {
                    ForEach(Array(scanSteps.enumerated()), id: \.offset) { i, step in
                        HStack(alignment: .center, spacing: 12) {
                            Text("\(i + 1)")
                                .font(.bodyFont(13, .bold)).foregroundStyle(Candy.onPop)
                                .frame(width: 26, height: 26)
                                .background(Candy.pop, in: Circle())
                            Text(step).font(.bodyFont(14)).foregroundStyle(Candy.ink)
                        }
                    }
                }
                .padding(20)
                .background(Candy.surface, in: RoundedRectangle(cornerRadius: Radius.lg))
                .overlay(RoundedRectangle(cornerRadius: Radius.lg).stroke(Candy.border, lineWidth: 1))
                .candyShadow()

                if let notice {
                    Text(notice)
                        .font(.bodyFont(13, .semibold)).foregroundStyle(Candy.accent)
                        .frame(maxWidth: .infinity, alignment: .center)
                }

                CandyButton(title: "Take photo", variant: .pop) {
                    notice = nil
                    if CameraPicker.isAvailable { showCamera = true }
                    else { notice = "Camera isn't available here — use Upload a photo." }
                }
                PhotosPicker(selection: $photoItem, matching: .images) {
                    pillLabel("Upload a photo")
                }

                if let size = fit.size {
                    Button { onSelectTab(.shop) } label: {
                        pillLabel("Your saved size: \(size) — shop it")
                    }
                    .buttonStyle(.plain)
                }

                Color.clear.frame(height: 92)
            }
            .padding(16)
        }
    }

    // MARK: Detecting

    private var detecting: some View {
        VStack(spacing: 16) {
            Spacer()
            ProgressView().tint(Candy.accent).scaleEffect(1.3)
            Text("Finding your nails…").font(.display(20)).foregroundStyle(Candy.ink)
            Text("Reading the card for scale and outlining your nails.")
                .font(.bodyFont(14)).foregroundStyle(Candy.subtle)
                .multilineTextAlignment(.center).padding(.horizontal, 40)
            Spacer(); Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: Review

    private var review: some View {
        let live = liveMeasurement()
        return ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                VStack(alignment: .leading, spacing: 4) {
                    Eyebrow(manualMode ? "place them yourself" : "check the outlines")
                    Text(manualMode ? "Drag each outline onto your card and nails." : "Looks good? Drag any dot to fix.")
                        .font(.display(22)).foregroundStyle(Candy.ink)
                }

                if manualMode {
                    Text("Couldn't auto-detect — line the lime line up with the card's long edge (85.6 mm), then each nail's width.")
                        .font(.bodyFont(13)).foregroundStyle(Candy.subtle)
                }

                if let image {
                    ScanOverlay(image: image, box: box, segments: $segments)
                        .frame(width: box.width, height: box.height)
                        .frame(maxWidth: .infinity)
                }

                if !manualMode, segments.contains(where: { $0.dim }) {
                    Text("Dashed nails are low-confidence — double-check those.")
                        .font(.bodyFont(12, .semibold)).foregroundStyle(Candy.accent)
                        .frame(maxWidth: .infinity, alignment: .center)
                }

                Text(live.size.map { "You're a \($0)" } ?? "Line up the card to read your size")
                    .font(.display(26)).foregroundStyle(Candy.ink)
                    .frame(maxWidth: .infinity, alignment: .center)

                CandyButton(title: "Looks good", variant: .pop) { confirm() }
                    .disabled(live.size == nil).opacity(live.size == nil ? 0.5 : 1)
                CandyButton(title: "Retake", variant: .ghost) { reset() }

                Color.clear.frame(height: 92)
            }
            .padding(16)
        }
    }

    // MARK: Result

    private var result: some View {
        let recs = Array(catalog.products.filter { $0.inStock }.prefix(4))
        return ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Eyebrow("your fit")
                    Text("You're a \(fit.size ?? "—")")
                        .font(.display(32)).foregroundStyle(Candy.ink)
                }

                VStack(spacing: 10) {
                    ForEach(FitSizing.fingers, id: \.self) { f in
                        HStack {
                            Text(FitSizing.fingerLabels[f] ?? f)
                                .font(.bodyFont(14, .semibold)).foregroundStyle(Candy.subtle)
                            if f == "thumb" {
                                Text("est.")
                                    .font(.bodyFont(10, .bold)).foregroundStyle(Candy.onPop)
                                    .padding(.horizontal, 6).padding(.vertical, 2)
                                    .background(Candy.accent, in: Capsule())
                            }
                            Spacer()
                            Text(fit.fingerMm[f].map { String(format: "%.1f mm", $0) } ?? "—")
                                .font(.bodyFont(14, .bold)).foregroundStyle(Candy.ink)
                        }
                    }
                }
                .padding(20)
                .background(Candy.surface, in: RoundedRectangle(cornerRadius: Radius.lg))
                .overlay(RoundedRectangle(cornerRadius: Radius.lg).stroke(Candy.border, lineWidth: 1))
                .candyShadow()

                Text("Thumb estimated from your middle finger — it lies edge-on in a flat photo, so we read your four fingers and size from those.")
                    .font(.bodyFont(12)).foregroundStyle(Candy.subtle).lineSpacing(2)

                if !recs.isEmpty, let size = fit.size {
                    VStack(alignment: .leading, spacing: 12) {
                        Eyebrow("recommended in your \(size)")
                        LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                            ForEach(Array(recs.enumerated()), id: \.element.id) { i, p in
                                ProductCard(product: p, index: i)
                            }
                        }
                    }
                }

                CandyButton(title: "Browse all sets", variant: .ink) { onSelectTab(.shop) }
                CandyButton(title: "Measure again", variant: .ghost) { reset() }

                Color.clear.frame(height: 92)
            }
            .padding(16)
        }
    }

    // MARK: Logic

    private func detect(_ raw: UIImage) {
        notice = nil
        phase = .detecting
        Task {
            let processed = raw.processedForScan()
            let size = boxSize(for: processed)
            do {
                let result = try await scanner.detect(processed)
                if result.found, result.card != nil {
                    image = processed
                    box = size
                    segments = buildSegments(result, box: size)
                    manualMode = false
                    phase = .review
                } else {
                    enterManual(processed, box: size)
                }
            } catch {
                // Network/scan failure still drops into manual placement, not a dead end.
                enterManual(processed, box: size)
            }
        }
    }

    // Fall back to hand placement: default outlines the user drags into position.
    private func enterManual(_ processed: UIImage, box size: CGSize) {
        image = processed
        box = size
        segments = defaultSegments(box: size)
        manualMode = true
        phase = .review
    }

    private func defaultSegments(box: CGSize) -> [ScanSegment] {
        var segs: [ScanSegment] = [
            ScanSegment(id: "card", label: "card · 85.6 mm", color: Candy.pop,
                        a: CGPoint(x: box.width * 0.22, y: box.height * 0.16),
                        b: CGPoint(x: box.width * 0.78, y: box.height * 0.16), dim: true),
        ]
        for (i, f) in FitSizing.measuredFingers.enumerated() {
            let y = 0.34 + Double(i) * 0.10
            segs.append(ScanSegment(id: f, label: FitSizing.fingerLabels[f] ?? f, color: Candy.accent,
                                    a: CGPoint(x: box.width * 0.42, y: box.height * y),
                                    b: CGPoint(x: box.width * 0.58, y: box.height * y), dim: true))
        }
        return segs
    }

    private func buildSegments(_ result: ScanResult, box: CGSize) -> [ScanSegment] {
        var segs: [ScanSegment] = []
        if let card = result.card {
            segs.append(ScanSegment(id: "card", label: "card · 85.6 mm", color: Candy.pop,
                                    a: point(card.a, box), b: point(card.b, box), dim: false))
        }
        let present = Set((result.nails ?? []).map(\.finger))
        for n in result.nails ?? [] where FitSizing.measuredFingers.contains(n.finger) {
            segs.append(ScanSegment(id: n.finger, label: FitSizing.fingerLabels[n.finger] ?? n.finger,
                                    color: Candy.accent, a: point(n.a, box), b: point(n.b, box),
                                    dim: (n.confidence ?? 1) < 0.5))
        }
        var i = 0
        for f in FitSizing.measuredFingers where !present.contains(f) {
            let y = 0.32 + Double(i) * 0.09
            segs.append(ScanSegment(id: f, label: FitSizing.fingerLabels[f] ?? f, color: Candy.accent,
                                    a: CGPoint(x: box.width * 0.42, y: box.height * y),
                                    b: CGPoint(x: box.width * 0.58, y: box.height * y), dim: true))
            i += 1
        }
        return segs
    }

    private func liveMeasurement() -> (mm: [String: Double], size: String?) {
        guard let card = segments.first(where: { $0.id == "card" }) else { return ([:], nil) }
        let cardPx = Double(distance(card.a, card.b))
        guard cardPx > 0 else { return ([:], nil) }
        let factor = FitSizing.pxPerMm(cardPx)
        var mm: [String: Double] = [:]
        for s in segments where s.id != "card" {
            mm[s.id] = FitSizing.clampMm(FitSizing.pxToMm(Double(distance(s.a, s.b)), factor: factor))
        }
        // Size from the four measured fingers ONLY, then back-fill the derived
        // thumb for display so it never sways the recommendation.
        let size = FitSizing.sizeFromMeasurements(mm)
        if let thumb = FitSizing.deriveThumbMm(mm) { mm["thumb"] = thumb }
        return (mm, size)
    }

    private func confirm() {
        guard let card = segments.first(where: { $0.id == "card" }) else { return }
        let cardPx = Double(distance(card.a, card.b))
        let live = liveMeasurement()
        guard live.size != nil else { return }
        fit.apply(cardPxWidth: cardPx, fingerMm: live.mm)
        phase = .result
    }

    private func reset() {
        image = nil
        segments = []
        notice = nil
        manualMode = false
        phase = .intro
    }

    private func point(_ p: [Double], _ box: CGSize) -> CGPoint {
        CGPoint(x: (p.first ?? 0) * box.width, y: (p.count > 1 ? p[1] : 0) * box.height)
    }

    private func distance(_ a: CGPoint, _ b: CGPoint) -> CGFloat {
        hypot(b.x - a.x, b.y - a.y)
    }

    private func boxSize(for image: UIImage) -> CGSize {
        let maxW = UIScreen.main.bounds.width - 32
        let maxH = UIScreen.main.bounds.height * 0.5
        let ar = image.size.width / max(image.size.height, 1)
        var w = maxW
        var h = w / ar
        if h > maxH { h = maxH; w = h * ar }
        return CGSize(width: w, height: h)
    }
}

// Ghost-pill styled label (for PhotosPicker / plain buttons that can't wrap CandyButton).
private func pillLabel(_ title: String) -> some View {
    Text(title)
        .font(.bodyFont(15, .bold))
        .foregroundStyle(Candy.ink)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 15)
        .overlay(Capsule().stroke(Candy.ink, lineWidth: 1.5))
}
