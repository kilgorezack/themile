import SwiftUI

// MARK: Formatting

enum Fmt {
    static func time(_ ms: Double) -> String { ms.msDate.formatted(date: .omitted, time: .shortened) }
    static func hour(_ ms: Double) -> String { ms.msDate.formatted(.dateTime.hour()) }
    static func range(_ a: Double, _ b: Double) -> String { "\(time(a)) – \(time(b))" }
    static func num(_ v: Double?, _ digits: Int = 0) -> String {
        guard let v else { return "—" }
        return v.formatted(.number.precision(.fractionLength(digits)))
    }
    static func compass(_ deg: Double?) -> String {
        guard let deg else { return "" }
        let names = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
        return names[Int((deg / 22.5).rounded()) % 16]
    }
    static func ago(_ ms: Double) -> String {
        ms.msDate.formatted(.relative(presentation: .named, unitsStyle: .abbreviated))
    }
}

extension Summary.Verdict {
    var color: Color {
        switch tone {
        case "good": .mileRiver
        case "fair": .mileOchre
        case "tough": .mileRust
        default: .red
        }
    }
    var label: String { tone.capitalized }
}

// MARK: Home

struct HomeView: View {
    @Environment(ConditionsModel.self) private var model
    @Environment(AppRouter.self) private var router
    @Environment(Session.self) private var session

    var body: some View {
        ScrollView {
            if let s = model.summary {
                VStack(spacing: 14) {
                    hero(s)
                    VStack(spacing: 14) {
                        if let w = s.bestWindow { bestWindow(w) }
                        metrics(s)
                        NextHoursStrip(hours: Array(s.hourly.prefix(12)))
                            .onTapGesture { router.open(.forecast) }
                        skyRow(s)
                        if let next = s.nextWindow { feeding(next) }
                    }
                    .padding(.horizontal, 16)
                    Text("Updated \(Fmt.ago(s.station?.observedAt ?? Date.now.timeIntervalSince1970 * 1000))")
                        .font(.footnote).foregroundStyle(.secondary)
                        .padding(.bottom, 24)
                }
            } else if let error = model.error {
                ContentUnavailableView("No signal", systemImage: "antenna.radiowaves.left.and.right.slash", description: Text(error))
                    .padding(.top, 120)
            } else {
                ProgressView().padding(.top, 200)
            }
        }
        .background(Color.milePaper.ignoresSafeArea())
        .ignoresSafeArea(edges: .top)
        .refreshable { await model.refresh() }
        .toolbar { AccountToolbarItem() }
        .toolbarBackgroundVisibility(.hidden, for: .navigationBar)
    }

    // Big landscape header with the day's verdict.
    private func hero(_ s: Summary) -> some View {
        ZStack(alignment: .bottomLeading) {
            LandscapeView(style: LandscapeView.style(for: s.sun))
            VStack(alignment: .leading, spacing: 8) {
                Text(s.verdict.label)
                    .font(.subheadline.weight(.semibold))
                    .padding(.horizontal, 12).padding(.vertical, 5)
                    .glassEffect(.regular.tint(s.verdict.color.opacity(0.6)), in: .capsule)
                Text(greeting).font(.subheadline).opacity(0.9)
                Text(s.verdict.headline)
                    .font(.verdict(.largeTitle))
                    .fixedSize(horizontal: false, vertical: true)
                if let note = s.verdict.notes.first {
                    Text(note).font(.callout).opacity(0.9)
                }
            }
            .foregroundStyle(.white)
            .padding(20)
            .padding(.bottom, 6)
        }
        .frame(height: 420)
        .clipped()
        .onTapGesture { router.open(.station) }
    }

    private var greeting: String {
        let h = Calendar.current.component(.hour, from: .now)
        let part = h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening"
        let name = session.profile.firstName
        return name.isEmpty ? "Good \(part.lowercased())" : "\(part), \(name)"
    }

    private func bestWindow(_ w: Summary.BestWindow) -> some View {
        Button { router.open(.forecast) } label: {
            HStack(spacing: 14) {
                Image(systemName: "clock.badge.checkmark")
                    .font(.title2).foregroundStyle(Color.mileCream)
                    .frame(width: 48, height: 48)
                    .background(Color.mileRiver, in: .rect(cornerRadius: 14))
                VStack(alignment: .leading, spacing: 2) {
                    Eyebrow(w.tomorrow ? "Best window tomorrow" : "Best window today")
                    Text(Fmt.range(w.start, w.end)).font(.title3.weight(.semibold))
                    Text([w.avgWindMph.map { "Wind ~\(Fmt.num($0)) mph" }, w.avgTempF.map { "\(Fmt.num($0))°" }]
                        .compactMap { $0 }.joined(separator: " · "))
                        .font(.footnote).foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(.tertiary)
            }
            .card()
        }
        .buttonStyle(.plain)
    }

    private func metrics(_ s: Summary) -> some View {
        Grid(horizontalSpacing: 12, verticalSpacing: 12) {
            GridRow {
                Button { router.open(.water) } label: {
                    MetricCard(title: "Flow", value: Fmt.num(s.flow?.cfs), unit: "cfs",
                               detail: s.flow?.band, detailColor: .mileRiver,
                               trend: s.flow?.last30 ?? [])
                }
                Button { router.open(.station) } label: {
                    MetricCard(title: "Wind", value: Fmt.num(s.now?.windMph), unit: "mph",
                               detail: "Gusts \(Fmt.num(s.now?.gustMph)) · \(Fmt.compass(s.now?.windDir))") {
                        CompassView(direction: s.now?.windDir, speed: nil, size: 34)
                    }
                }
            }
            GridRow {
                Button { router.open(.station) } label: {
                    MetricCard(title: "Air", value: Fmt.num(s.now?.tempF), unit: "°F",
                               detail: "Feels \(Fmt.num(s.now?.feelsLikeF))°",
                               trend: s.history.compactMap(\.tempF), trendColor: .mileOchre)
                }
                Button { router.open(.station) } label: {
                    MetricCard(title: "Pressure", value: Fmt.num(s.now?.pressureInHg, 2), unit: "inHg",
                               detail: s.now?.pressureTrend?.capitalized,
                               trend: s.history.compactMap(\.pressureInHg), trendColor: .mileSlate)
                }
            }
        }
        .buttonStyle(.plain)
    }

    private func skyRow(_ s: Summary) -> some View {
        Button { router.open(.guide) } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Eyebrow("Sun")
                    Label(Fmt.time(s.sun.rise), systemImage: "sunrise.fill")
                    Label(Fmt.time(s.sun.set), systemImage: "sunset.fill")
                }
                .symbolRenderingMode(.multicolor)
                .card()
                VStack(alignment: .leading, spacing: 6) {
                    Eyebrow("Moon")
                    Label(s.moon.name, systemImage: MoonSymbol.name(for: s.moon.phase))
                    Text("\(Int((s.moon.illumination * 100).rounded()))% lit").foregroundStyle(.secondary)
                }
                .card()
            }
            .font(.subheadline.weight(.medium))
        }
        .buttonStyle(.plain)
    }

    private func feeding(_ next: Summary.NextWindow) -> some View {
        Button { router.open(.guide) } label: {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Eyebrow(next.active ? "Feeding window now" : "Next feeding window")
                    Text(Fmt.range(next.start, next.end)).font(.headline)
                    Text("\(next.kind.capitalized) · \(next.why)").font(.footnote).foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "fish.fill").font(.title).foregroundStyle(next.active ? Color.mileRiver : .secondary)
                    .symbolEffect(.bounce, value: next.active)
            }
            .card()
        }
        .buttonStyle(.plain)
    }
}

enum MoonSymbol {
    /// SF Symbol for a 0–1 phase (0 new, 0.5 full).
    static func name(for phase: Double) -> String {
        switch phase {
        case ..<0.03, 0.97...: "moonphase.new.moon"
        case ..<0.22: "moonphase.waxing.crescent"
        case ..<0.28: "moonphase.first.quarter"
        case ..<0.47: "moonphase.waxing.gibbous"
        case ..<0.53: "moonphase.full.moon"
        case ..<0.72: "moonphase.waning.gibbous"
        case ..<0.78: "moonphase.last.quarter"
        default: "moonphase.waning.crescent"
        }
    }
}

/// Horizontal hour-by-hour strip (temp, wind, rain chance).
struct NextHoursStrip: View {
    let hours: [Summary.Hour]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Eyebrow("Next hours")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 18) {
                    ForEach(hours) { h in
                        VStack(spacing: 6) {
                            Text(Fmt.hour(h.t)).font(.caption).foregroundStyle(.secondary)
                            Image(systemName: WeatherSymbol.name(h.icon)).symbolRenderingMode(.multicolor).font(.title3)
                            Text("\(Fmt.num(h.tempF))°").font(.subheadline.weight(.semibold))
                            Text("\(Fmt.num(h.windMph))").font(.caption.monospacedDigit())
                                .foregroundStyle((h.windMph ?? 0) >= 15 ? Color.mileRust : .secondary)
                            if let p = h.precipChance, p >= 20 {
                                Text("\(Int(p))%").font(.caption2).foregroundStyle(Color.mileSlate)
                            }
                        }
                        .frame(minWidth: 40)
                    }
                }
            }
        }
        .card()
    }
}

enum WeatherSymbol {
    /// Maps the API's icon keys (Tempest/NWS style) to SF Symbols.
    static func name(_ icon: String) -> String {
        let i = icon.lowercased()
        let night = i.contains("night")
        if i.contains("thunder") { return "cloud.bolt.rain.fill" }
        if i.contains("snow") || i.contains("sleet") { return "cloud.snow.fill" }
        if i.contains("rain") || i.contains("shower") || i.contains("drizzle") { return "cloud.rain.fill" }
        if i.contains("fog") || i.contains("haze") || i.contains("smoke") { return "cloud.fog.fill" }
        if i.contains("wind") { return "wind" }
        if i.contains("partly") || i.contains("few") || i.contains("scattered") { return night ? "cloud.moon.fill" : "cloud.sun.fill" }
        if i.contains("cloud") || i.contains("overcast") { return "cloud.fill" }
        return night ? "moon.stars.fill" : "sun.max.fill"
    }
}
