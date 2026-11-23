import SwiftUI

// MARK: Avatar

struct AvatarView: View {
    let profile: Profile
    var size: CGFloat = 36
    var localImage: UIImage? = nil

    var body: some View {
        Group {
            if let localImage {
                Image(uiImage: localImage).resizable().scaledToFill()
            } else if let url = profile.photoURL.flatMap(URL.init(string:)) {
                AsyncImage(url: url) { phase in
                    if let image = phase.image { image.resizable().scaledToFill() } else { initials }
                }
            } else {
                initials
            }
        }
        .frame(width: size, height: size)
        .clipShape(.circle)
        .accessibilityLabel(profile.fullName.isEmpty ? "Account" : profile.fullName)
    }

    private var initials: some View {
        ZStack {
            Circle().fill(Color.mileRiver)
            Text(profile.initials)
                .font(.system(size: size * 0.38, weight: .semibold))
                .foregroundStyle(Color.mileCream)
        }
    }
}

// MARK: Wind compass

/// Red marker = where the wind comes from; arrow points downwind.
struct CompassView: View {
    let direction: Double?
    let speed: Double?
    var size: CGFloat = 120

    var body: some View {
        ZStack {
            Circle().stroke(.quaternary, lineWidth: 2)
            ForEach(["N", "E", "S", "W"].indices, id: \.self) { i in
                Text(["N", "E", "S", "W"][i])
                    .font(.system(size: size * 0.09, weight: .medium))
                    .foregroundStyle(.secondary)
                    .offset(y: -size * 0.36)
                    .rotationEffect(.degrees(Double(i) * 90))
            }
            ZStack {
                Triangle().fill(Color.mileRust).frame(width: size * 0.1, height: size * 0.1).offset(y: -size * 0.44)
                Capsule().fill(.primary).frame(width: 2.5, height: size * 0.68)
                Triangle().fill(.primary).rotationEffect(.degrees(180)).frame(width: size * 0.1, height: size * 0.09).offset(y: size * 0.36)
            }
            .rotationEffect(.degrees(direction ?? 0))
            .animation(.spring(duration: 1.2, bounce: 0.35), value: direction)
            Circle().fill(Color.mileCard).frame(width: size * 0.36)
            Text(speed.map { "\(Int($0.rounded()))" } ?? "—")
                .font(.system(size: size * 0.16, weight: .semibold).monospacedDigit())
        }
        .frame(width: size, height: size)
        .accessibilityElement()
        .accessibilityLabel("Wind \(speed.map { "\(Int($0.rounded())) miles per hour" } ?? "unknown")")
    }
}

struct Triangle: Shape {
    func path(in r: CGRect) -> Path {
        Path { p in
            p.move(to: CGPoint(x: r.midX, y: r.minY))
            p.addLine(to: CGPoint(x: r.maxX, y: r.maxY))
            p.addLine(to: CGPoint(x: r.minX, y: r.maxY))
            p.closeSubpath()
        }
    }
}

// MARK: Sparkline

struct Sparkline: View {
    let values: [Double]
    var color: Color = .mileRiver

    var body: some View {
        GeometryReader { geo in
            let v = values
            if v.count > 1, let lo = v.min(), let hi = v.max() {
                let span = max(hi - lo, 0.0001)
                Path { p in
                    for (i, value) in v.enumerated() {
                        let x = geo.size.width * CGFloat(i) / CGFloat(v.count - 1)
                        let y = geo.size.height * (1 - CGFloat((value - lo) / span))
                        i == 0 ? p.move(to: CGPoint(x: x, y: y)) : p.addLine(to: CGPoint(x: x, y: y))
                    }
                }
                .stroke(color, style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round))
            }
        }
        .frame(height: 22)
        .accessibilityHidden(true)
    }
}

// MARK: Metric card

struct MetricCard<Accessory: View>: View {
    let title: String
    let value: String
    var unit: String? = nil
    var detail: String? = nil
    var detailColor: Color = .secondary
    var trend: [Double] = []
    var trendColor: Color = .mileRiver
    @ViewBuilder var accessory: () -> Accessory

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .top) {
                Eyebrow(title)
                Spacer(minLength: 0)
                accessory()
            }
            HStack(alignment: .firstTextBaseline, spacing: 3) {
                Text(value).font(.system(.title, weight: .semibold).monospacedDigit())
                    .contentTransition(.numericText())
                if let unit { Text(unit).font(.subheadline.weight(.medium)).foregroundStyle(.secondary) }
            }
            if let detail { Text(detail).font(.footnote.weight(.medium)).foregroundStyle(detailColor).lineLimit(2) }
            if !trend.isEmpty { Sparkline(values: trend, color: trendColor) }
        }
        .card()
        .accessibilityElement(children: .combine)
    }
}

extension MetricCard where Accessory == EmptyView {
    init(title: String, value: String, unit: String? = nil, detail: String? = nil, detailColor: Color = .secondary, trend: [Double] = [], trendColor: Color = .mileRiver) {
        self.init(title: title, value: value, unit: unit, detail: detail, detailColor: detailColor, trend: trend, trendColor: trendColor) { EmptyView() }
    }
}

// MARK: Chips

/// Wrapping row layout for chips.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowH: CGFloat = 0
        for s in subviews {
            let size = s.sizeThatFits(.unspecified)
            if x + size.width > width, x > 0 { x = 0; y += rowH + spacing; rowH = 0 }
            x += size.width + spacing
            rowH = max(rowH, size.height)
        }
        return CGSize(width: width.isFinite ? width : x, height: y + rowH)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowH: CGFloat = 0
        for s in subviews {
            let size = s.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX { x = bounds.minX; y += rowH + spacing; rowH = 0 }
            s.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowH = max(rowH, size.height)
        }
    }
}

struct Chip: View {
    let label: String
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.body.weight(.medium))
                .padding(.horizontal, 16)
                .frame(minHeight: 44)
                .foregroundStyle(selected ? Color.white : Color.primary)
                .background(selected ? AnyShapeStyle(Color.mileRiver) : AnyShapeStyle(Color.mileCard), in: .capsule)
                .overlay(Capsule().strokeBorder(selected ? .clear : Color.secondary.opacity(0.25)))
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.selection, trigger: selected)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

// MARK: Onboarding scaffold

/// Shared layout for onboarding steps: progress, title, content, bottom action.
struct OnboardingStep<Content: View, Actions: View>: View {
    let step: Int
    var total = 5
    let title: String
    var subtitle: String? = nil
    var onSkip: (() -> Void)? = nil
    @ViewBuilder var content: () -> Content
    @ViewBuilder var actions: () -> Actions

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(title).font(.largeTitle.bold())
                    if let subtitle { Text(subtitle).font(.body).foregroundStyle(.secondary) }
                }
                content()
            }
            .padding(.horizontal, 24)
            .padding(.top, 12)
            .padding(.bottom, 24)
        }
        .scrollBounceBehavior(.basedOnSize)
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: 8) { actions() }
                .padding(.horizontal, 24)
                .padding(.bottom, 8)
        }
        .background(Color.milePaper.ignoresSafeArea())
        .toolbar {
            ToolbarItem(placement: .principal) {
                HStack(spacing: 6) {
                    ForEach(1...total, id: \.self) { i in
                        Capsule().fill(i <= step ? Color.mileRiver : Color.secondary.opacity(0.25)).frame(height: 4)
                    }
                }
                .frame(width: 180)
                .accessibilityElement()
                .accessibilityLabel("Step \(step) of \(total)")
            }
            if let onSkip {
                ToolbarItem(placement: .topBarTrailing) { Button("Skip", action: onSkip) }
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }
}

/// Full-width primary action (Liquid Glass, tinted).
struct PrimaryButton: View {
    let title: String
    var busy = false
    var disabled = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Text(title).opacity(busy ? 0 : 1)
                if busy { ProgressView() }
            }
            .font(.headline)
            .frame(maxWidth: .infinity, minHeight: 50)
        }
        .buttonStyle(.glassProminent)
        .disabled(disabled || busy)
    }
}
