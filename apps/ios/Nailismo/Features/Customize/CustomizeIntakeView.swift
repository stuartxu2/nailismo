import SwiftUI
import PhotosUI
import UIKit

private let LENGTHS = ["Short", "Medium", "Long"]
private let SHAPES = ["Almond", "Squoval", "Square", "Oval", "Round", "Coffin"]
private let FINISHES = ["Any", "Glossy", "Matte", "Glass", "Chrome"]
private let FEELS = ["Neutral", "Masculine", "Feminine"]
private let OCCASIONS = ["Any", "Daylight", "Nightlife"]
private let DETAILS = ["Balanced", "Minimal", "Loaded"]
private let INTERPRETATIONS = ["Abstract", "Balanced", "Literal"]

struct CustomizeIntakeView: View {
    @Environment(CustomizeStore.self) private var store
    @Environment(AuthStore.self) private var auth

    @State private var image: UIImage?
    @State private var length = "Medium"
    @State private var shape = "Almond"
    @State private var finish = "Any"
    @State private var feel = "Neutral"
    @State private var occasion = "Any"
    @State private var detail = "Balanced"
    @State private var interpretation = "Abstract"
    @State private var note = ""
    @State private var email = ""
    @State private var agreed = false
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
                chips(title: "Finish", options: FINISHES, selection: $finish)
                chips(title: "Feel", options: FEELS, selection: $feel)
                chips(title: "Occasion", options: OCCASIONS, selection: $occasion)
                chips(title: "Detail", options: DETAILS, selection: $detail)
                chips(title: "Interpretation", options: INTERPRETATIONS, selection: $interpretation)

                field(label: "Anything to add? (optional)", text: $note, placeholder: "e.g. matte finish, gold accents")
                field(label: "Email (so we can save your designs)", text: $email, placeholder: "you@email.com", keyboard: .emailAddress)

                if let error = store.errorMessage {
                    Text(error).font(.bodyFont(13, .semibold)).foregroundStyle(Color(hex: "C0392B"))
                }

                agreementRow

                CandyButton(title: store.phase == .uploading ? "Starting…" : "Preview my design — $2", variant: .pop) {
                    guard let image, agreed, store.phase == .intake else { return }
                    let dataURL = "data:image/jpeg;base64," + (image.processedForScan().jpegData(compressionQuality: 0.72)?.base64EncodedString() ?? "")
                    Task {
                        await store.beginPayment(
                            imageDataURL: dataURL,
                            shape: "\(length) \(shape)",
                            note: note,
                            email: email,
                            style: [
                                "finish": finish.lowercased(),
                                "feel": feel.lowercased(),
                                "occasion": occasion.lowercased(),
                                "detail": detail.lowercased(),
                                "interpretation": interpretation.lowercased(),
                            ]
                        )
                    }
                }
                .disabled(image == nil || !agreed || store.phase == .uploading)
                .opacity(image == nil || !agreed || store.phase == .uploading ? 0.45 : 1)

                Text("Credited to your $69 order at checkout 💸")
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

    private var agreementText: AttributedString {
        let md = "I understand the **$2 covers AI processing** (Gemini 3 Pro Image) and comes off my $69 order. If I'm really unhappy with my design, I'll email [hello@nailismo.com](mailto:hello@nailismo.com)."
        return (try? AttributedString(markdown: md)) ?? AttributedString(md)
    }

    private var agreementRow: some View {
        HStack(alignment: .top, spacing: 11) {
            Button { agreed.toggle() } label: {
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(agreed ? Candy.pop : Candy.surface)
                        .frame(width: 26, height: 26)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(agreed ? Candy.pop : Candy.ink, lineWidth: 2.5))
                    if agreed {
                        Image(systemName: "checkmark").font(.system(size: 13, weight: .black)).foregroundStyle(Candy.onPop)
                    }
                }
            }
            .buttonStyle(PressableStyle())
            .accessibilityLabel("I agree to the $2 AI processing terms")
            .accessibilityAddTraits(agreed ? [.isSelected] : [])

            Text(agreementText)
                .font(.bodyFont(13, .semibold)).foregroundStyle(Candy.subtle)
                .tint(Candy.ink)
                .lineSpacing(2)
                .fixedSize(horizontal: false, vertical: true)
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
            ScrollView(.horizontal, showsIndicators: false) {
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
