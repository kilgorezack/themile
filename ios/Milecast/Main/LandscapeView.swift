import SwiftUI

/// The website's hero scene, redrawn natively: layered ridges, the canyon,
/// and the river catching light. Slowly drifting clouds; respects Reduce Motion.
struct LandscapeView: View {
    enum Style { case dawn, day, dusk, night }
    var style: Style = .day
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 30, paused: reduceMotion)) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            Canvas { ctx, size in
                let w = size.width, h = size.height
                let p = palette

                // Sky
                ctx.fill(Path(CGRect(origin: .zero, size: size)),
                         with: .linearGradient(Gradient(colors: [p.skyTop, p.skyBottom]),
                                               startPoint: .zero, endPoint: CGPoint(x: 0, y: h * 0.7)))

                // Sun / moon
                let orb = CGRect(x: w * 0.68, y: h * 0.26, width: w * 0.16, height: w * 0.16)
                ctx.fill(Path(ellipseIn: orb.insetBy(dx: -w * 0.08, dy: -w * 0.08)), with: .color(p.orb.opacity(0.18)))
                ctx.fill(Path(ellipseIn: orb), with: .color(p.orb))

                // Clouds
                for i in 0..<3 {
                    let speed = 6.0 + Double(i) * 3
                    let travel = Double(w + 240)
                    let x = CGFloat((t * speed + Double(i) * travel / 3).truncatingRemainder(dividingBy: travel)) - 120
                    let y = h * (0.12 + CGFloat(i) * 0.07)
                    var cloud = Path()
                    cloud.addRoundedRect(in: CGRect(x: x, y: y, width: 110, height: 16), cornerSize: CGSize(width: 8, height: 8))
                    cloud.addRoundedRect(in: CGRect(x: x + 24, y: y - 9, width: 56, height: 18), cornerSize: CGSize(width: 9, height: 9))
                    ctx.fill(cloud, with: .color(.white.opacity(p.cloud)))
                }

                // Ridges, back to front
                ctx.fill(ridge(w, h, base: 0.55, amp: 0.10, seed: 1), with: .color(p.ridgeFar))
                ctx.fill(ridge(w, h, base: 0.64, amp: 0.08, seed: 2), with: .color(p.ridgeMid))
                ctx.fill(ridge(w, h, base: 0.74, amp: 0.06, seed: 3), with: .color(p.ridgeNear))

                // River
                var river = Path()
                river.move(to: CGPoint(x: w * 0.42, y: h * 0.74))
                river.addCurve(to: CGPoint(x: w * 0.30, y: h),
                               control1: CGPoint(x: w * 0.62, y: h * 0.82),
                               control2: CGPoint(x: w * 0.05, y: h * 0.88))
                river.addLine(to: CGPoint(x: w * 0.78, y: h))
                river.addCurve(to: CGPoint(x: w * 0.47, y: h * 0.74),
                               control1: CGPoint(x: w * 0.40, y: h * 0.88),
                               control2: CGPoint(x: w * 0.80, y: h * 0.80))
                river.closeSubpath()
                ctx.fill(river, with: .linearGradient(Gradient(colors: [p.water.opacity(0.9), p.water]),
                                                      startPoint: CGPoint(x: 0, y: h * 0.74), endPoint: CGPoint(x: 0, y: h)))

                // Shimmer on the water
                for i in 0..<5 {
                    let phase = sin(t * 1.4 + Double(i))
                    let y = h * (0.8 + CGFloat(i) * 0.04)
                    let x = w * (0.38 + CGFloat(i) * 0.025) + CGFloat(phase) * 6
                    ctx.fill(Path(roundedRect: CGRect(x: x, y: y, width: 22 + CGFloat(i) * 6, height: 2), cornerRadius: 1),
                             with: .color(p.orb.opacity(0.35 + 0.2 * phase)))
                }

                // Darken toward the bottom so overlaid text and controls read well.
                ctx.fill(Path(CGRect(x: 0, y: h * 0.45, width: w, height: h * 0.55)),
                         with: .linearGradient(Gradient(colors: [.clear, .black.opacity(0.55)]),
                                               startPoint: CGPoint(x: 0, y: h * 0.45), endPoint: CGPoint(x: 0, y: h)))
            }
        }
        .accessibilityHidden(true)
    }

    private func ridge(_ w: CGFloat, _ h: CGFloat, base: CGFloat, amp: CGFloat, seed: Double) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: 0, y: h))
        let steps = 24
        for i in 0...steps {
            let x = w * CGFloat(i) / CGFloat(steps)
            let n = sin(Double(i) * 0.7 + seed * 2.1) * 0.6 + sin(Double(i) * 1.9 + seed) * 0.4
            p.addLine(to: CGPoint(x: x, y: h * (base - amp * CGFloat(n))))
        }
        p.addLine(to: CGPoint(x: w, y: h))
        p.closeSubpath()
        return p
    }

    private struct Palette {
        let skyTop, skyBottom, orb, ridgeFar, ridgeMid, ridgeNear, water: Color
        let cloud: Double
    }

    private var palette: Palette {
        switch style {
        case .dawn:
            Palette(skyTop: .init(light: 0x6E7FA6, dark: 0x6E7FA6), skyBottom: .init(light: 0xF2B58A, dark: 0xF2B58A),
                    orb: .init(light: 0xFFE2B0, dark: 0xFFE2B0), ridgeFar: .init(light: 0x8C6F78, dark: 0x8C6F78),
                    ridgeMid: .init(light: 0x5D4A52, dark: 0x5D4A52), ridgeNear: .init(light: 0x33302E, dark: 0x33302E),
                    water: .init(light: 0x7FA3B8, dark: 0x7FA3B8), cloud: 0.35)
        case .day:
            Palette(skyTop: .init(light: 0x5C9BD1, dark: 0x5C9BD1), skyBottom: .init(light: 0xCFE6F2, dark: 0xCFE6F2),
                    orb: .init(light: 0xFFF6D8, dark: 0xFFF6D8), ridgeFar: .init(light: 0x9AA79A, dark: 0x9AA79A),
                    ridgeMid: .init(light: 0x8A7058, dark: 0x8A7058), ridgeNear: .init(light: 0x4E5A3C, dark: 0x4E5A3C),
                    water: .init(light: 0x3E7E8C, dark: 0x3E7E8C), cloud: 0.6)
        case .dusk:
            Palette(skyTop: .init(light: 0x2B3557, dark: 0x2B3557), skyBottom: .init(light: 0xE0875A, dark: 0xE0875A),
                    orb: .init(light: 0xFFC98A, dark: 0xFFC98A), ridgeFar: .init(light: 0x6B4E5C, dark: 0x6B4E5C),
                    ridgeMid: .init(light: 0x45343F, dark: 0x45343F), ridgeNear: .init(light: 0x221E22, dark: 0x221E22),
                    water: .init(light: 0xC77B57, dark: 0xC77B57), cloud: 0.25)
        case .night:
            Palette(skyTop: .init(light: 0x0B1224, dark: 0x0B1224), skyBottom: .init(light: 0x24304F, dark: 0x24304F),
                    orb: .init(light: 0xE8EDF5, dark: 0xE8EDF5), ridgeFar: .init(light: 0x1F2A3E, dark: 0x1F2A3E),
                    ridgeMid: .init(light: 0x161E2E, dark: 0x161E2E), ridgeNear: .init(light: 0x0C111B, dark: 0x0C111B),
                    water: .init(light: 0x34496B, dark: 0x34496B), cloud: 0.12)
        }
    }

    /// Picks a style from the sun times in the summary.
    static func style(for sun: Summary.Sun?, at now: Date = .now) -> Style {
        guard let sun else { return .day }
        let ms = now.timeIntervalSince1970 * 1000
        if ms < sun.dawn || ms > sun.dusk { return .night }
        if ms < sun.rise + 3_600_000 { return .dawn }
        if ms > sun.set - 3_600_000 { return .dusk }
        return .day
    }
}
