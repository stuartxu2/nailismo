import SwiftUI

// One editable caliper: a line with two draggable endpoints over the photo.
struct ScanSegment: Identifiable {
    let id: String
    let label: String
    let color: Color
    var a: CGPoint
    var b: CGPoint
    var dim: Bool
}

// The photo at a fixed display size with every segment drawn on top, draggable.
struct ScanOverlay: View {
    let image: UIImage
    let box: CGSize
    @Binding var segments: [ScanSegment]

    var body: some View {
        ZStack {
            Image(uiImage: image)
                .resizable()
                .frame(width: box.width, height: box.height)
                .clipShape(RoundedRectangle(cornerRadius: Radius.md))

            ForEach($segments) { $segment in
                SegmentView(segment: $segment, box: box)
            }
        }
        .frame(width: box.width, height: box.height)
    }
}

private struct SegmentView: View {
    @Binding var segment: ScanSegment
    let box: CGSize

    var body: some View {
        ZStack {
            Path { p in
                p.move(to: segment.a)
                p.addLine(to: segment.b)
            }
            .stroke(
                segment.color.opacity(segment.dim ? 0.6 : 0.95),
                style: StrokeStyle(lineWidth: 2, lineCap: .round, dash: segment.dim ? [6, 5] : [])
            )

            Text(segment.label)
                .font(.bodyFont(10, .bold))
                .foregroundStyle(Candy.ink)
                .padding(.horizontal, 7)
                .padding(.vertical, 3)
                .background(segment.color, in: Capsule())
                .position(x: (segment.a.x + segment.b.x) / 2, y: (segment.a.y + segment.b.y) / 2 - 16)

            handle($segment.a)
            handle($segment.b)
        }
    }

    private func handle(_ point: Binding<CGPoint>) -> some View {
        ZStack {
            // Large invisible touch target — easy to grab without covering the point.
            Color.white.opacity(0.001).frame(width: 46, height: 46)
            TargetMarker(color: segment.color)
        }
        .frame(width: 46, height: 46)
        .contentShape(Circle())
        .position(point.wrappedValue)
        .gesture(
            DragGesture()
                .onChanged { value in
                    point.wrappedValue = CGPoint(
                        x: min(max(0, value.location.x), box.width),
                        y: min(max(0, value.location.y), box.height)
                    )
                }
        )
    }
}

// See-through crosshair so the exact endpoint stays visible while dragging. The
// center dot marks the precise point; a dark halo keeps it readable on any photo.
private struct TargetMarker: View {
    let color: Color

    var body: some View {
        ZStack {
            Crosshair().stroke(Color.black.opacity(0.4), lineWidth: 2.5)
            Crosshair().stroke(color, lineWidth: 1.3)
            Circle().stroke(Color.black.opacity(0.35), lineWidth: 2).frame(width: 15, height: 15)
            Circle().stroke(color, lineWidth: 1.3).frame(width: 15, height: 15)
            Circle().fill(color).frame(width: 3, height: 3)
            Circle().fill(Color.black.opacity(0.5)).frame(width: 1, height: 1)
        }
        .frame(width: 28, height: 28)
    }
}

// A plus with an open center (gap) so the exact pixel under the marker shows through.
private struct Crosshair: Shape {
    var gap: CGFloat = 3.5
    var arm: CGFloat = 12

    func path(in rect: CGRect) -> Path {
        let c = CGPoint(x: rect.midX, y: rect.midY)
        var p = Path()
        p.move(to: CGPoint(x: c.x, y: c.y - arm)); p.addLine(to: CGPoint(x: c.x, y: c.y - gap))
        p.move(to: CGPoint(x: c.x, y: c.y + gap)); p.addLine(to: CGPoint(x: c.x, y: c.y + arm))
        p.move(to: CGPoint(x: c.x - arm, y: c.y)); p.addLine(to: CGPoint(x: c.x - gap, y: c.y))
        p.move(to: CGPoint(x: c.x + gap, y: c.y)); p.addLine(to: CGPoint(x: c.x + arm, y: c.y))
        return p
    }
}
