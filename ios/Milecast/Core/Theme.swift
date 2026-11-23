import SwiftUI

/// Brand colors shared with themile.summitlabs.one. Each has a dark variant.
extension Color {
    static let mileRiver = Color(light: 0x2B6B57, dark: 0x6FC3A6)
    static let mileRiverDeep = Color(light: 0x1F4A3E, dark: 0x1F4A3E)
    static let milePaper = Color(light: 0xF2EFE8, dark: 0x0F1412)
    static let mileCard = Color(light: 0xFFFFFF, dark: 0x1B2220)
    static let mileOchre = Color(light: 0xC58F2B, dark: 0xE0AC4A)
    static let mileRust = Color(light: 0xB0502A, dark: 0xE07A4C)
    static let mileSlate = Color(light: 0x4B6676, dark: 0x8FB0C2)
    static let mileCream = Color(light: 0xF1ECDF, dark: 0xF1ECDF)

    init(light: UInt32, dark: UInt32) {
        self.init(uiColor: UIColor { traits in
            let hex = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(
                red: CGFloat((hex >> 16) & 0xFF) / 255,
                green: CGFloat((hex >> 8) & 0xFF) / 255,
                blue: CGFloat(hex & 0xFF) / 255,
                alpha: 1
            )
        })
    }
}

extension Font {
    /// The brand's italic serif, used only for the daily verdict and a few headlines.
    /// Uses the system serif (New York) so no font files need bundling.
    static func verdict(_ style: Font.TextStyle = .largeTitle) -> Font {
        .system(style, design: .serif).italic()
    }
}

/// Solid content card. Per the HIG, Liquid Glass is for controls and navigation,
/// not content, so cards stay opaque.
struct CardBackground: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.mileCard, in: .rect(cornerRadius: 20))
    }
}

extension View {
    func card() -> some View { modifier(CardBackground()) }
}

/// Small uppercase label used above every reading.
struct Eyebrow: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View {
        Text(text.uppercased())
            .font(.caption.weight(.semibold))
            .tracking(0.6)
            .foregroundStyle(.secondary)
    }
}
