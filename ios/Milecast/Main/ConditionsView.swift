import SwiftUI
import Charts

enum ConditionsSection: String, CaseIterable, Identifiable {
    case station = "Station", water = "Water", forecast = "Forecast", guide = "Guide"
    var id: String { rawValue }
}

struct ConditionsView: View {
    @Environment(ConditionsModel.self) private var model
    @Environment(AppRouter.self) private var router

    var body: some View {
        @Bindable var router = router
        ScrollView {
            VStack(spacing: 14) {
                Picker("Section", selection: $router.conditionsSection) {
                    ForEach(ConditionsSection.allCases) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)

                if let s = model.summary {
                    Group {
                        switch router.conditionsSection {
                        case .station: StationSection(s: s)
                        case .water: WaterSection(s: s)
                        case .forecast: ForecastSection(s: s)
                        case .guide: GuideSection(s: s)
                        }
                    }
                    .transition(.opacity)
                } else if let error = model.error {
                    ContentUnavailableView("No signal", systemImage: "antenna.radiowaves.left.and.right.slash", description: Text(error))
                } else {
                    ProgressView().padding(.top, 80)
                }
            }
            .padding(16)
            .animation(.smooth(duration: 0.25), value: router.conditionsSection)
        }
        .background(Color.milePaper.ignoresSafeArea())
        .navigationTitle("Conditions")
        .refreshable { await model.refresh() }
        .toolbar { AccountToolbarItem() }
    }
}

// MARK: Station

private struct StationSection: View {
    let s: Summary

    var body: some View {
        VStack(spacing: 14) {
            if let st = s.station {
                HStack {
                    Image(systemName: "sensor.fill").foregroundStyle(Color.mileRiver)
                    Text("\(st.name) · \(st.source)").font(.footnote)
                    Spacer()
                    Text(Fmt.ago(st.observedAt)).font(.footnote).foregroundStyle(.secondary)
                }
            }

            HStack(spacing: 16) {
                CompassView(direction: s.now?.windDir, speed: s.now?.windMph, size: 128)
                VStack(alignment: .leading, spacing: 6) {
                    Eyebrow("Wind")
                    Text("\(Fmt.num(s.now?.windMph)) mph").font(.title.weight(.semibold))
                    Text("from the \(Fmt.compass(s.now?.windDir))").foregroundStyle(.secondary)
                    Text("Gusts \(Fmt.num(s.now?.gustMph)) · Lulls \(Fmt.num(s.now?.lullMph))").font(.footnote)
                }
                Spacer(minLength: 0)
            }
            .card()

            WindChart(points: s.history)

            Grid(horizontalSpacing: 12, verticalSpacing: 12) {
                GridRow {
                    MetricCard(title: "Air", value: Fmt.num(s.now?.tempF), unit: "°F", detail: "Feels \(Fmt.num(s.now?.feelsLikeF))°")
                    MetricCard(title: "Dew point", value: Fmt.num(s.now?.dewPointF), unit: "°F", detail: "Humidity \(Fmt.num(s.now?.humidity))%")
                }
                GridRow {
                    MetricCard(title: "Pressure", value: Fmt.num(s.now?.pressureInHg, 2), unit: "inHg",
                               detail: s.now?.pressureTrend?.capitalized,
                               trend: s.history.compactMap(\.pressureInHg), trendColor: .mileSlate)
                    MetricCard(title: "Rain today", value: Fmt.num(s.now?.precipTodayIn, 2), unit: "in", detail: "UV \(Fmt.num(s.now?.uv))")
                }
            }

            lightning
            VerdictNotes(verdict: s.verdict)
        }
    }

    private var lightning: some View {
        let strikes = s.now?.lightning3h ?? 0
        return HStack(spacing: 14) {
            Image(systemName: strikes > 0 ? "bolt.trianglebadge.exclamationmark.fill" : "bolt.slash")
                .font(.title).foregroundStyle(strikes > 0 ? .red : .secondary)
                .symbolEffect(.pulse, isActive: strikes > 0)
            VStack(alignment: .leading, spacing: 2) {
                Eyebrow("Lightning, last 3 hours")
                Text(strikes > 0 ? "\(strikes) strikes · nearest \(Fmt.num(s.now?.lightningLastMi)) mi" : "None detected")
                    .font(.headline)
            }
            Spacer()
        }
        .card()
    }
}

struct WindChart: View {
    let points: [Summary.HistoryPoint]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Eyebrow("Wind, last 24 hours")
            Chart {
                ForEach(points) { p in
                    if let g = p.gustMph {
                        AreaMark(x: .value("Time", p.t.msDate), y: .value("Gust", g))
                            .foregroundStyle(Color.mileSlate.opacity(0.18))
                            .interpolationMethod(.monotone)
                    }
                    if let w = p.windMph {
                        LineMark(x: .value("Time", p.t.msDate), y: .value("Wind", w))
                            .foregroundStyle(Color.mileRiver)
                            .lineStyle(StrokeStyle(lineWidth: 2.5))
                            .interpolationMethod(.monotone)
                    }
                }
                RuleMark(y: .value("Windy", 15))
                    .foregroundStyle(Color.mileRust.opacity(0.5))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                    .annotation(position: .top, alignment: .trailing) {
                        Text("15 mph").font(.caption2).foregroundStyle(Color.mileRust)
                    }
            }
            .chartXAxis { AxisMarks(values: .stride(by: .hour, count: 6)) { _ in AxisGridLine(); AxisValueLabel(format: .dateTime.hour()) } }
            .chartYAxisLabel("mph")
            .frame(height: 180)
            .accessibilityLabel("Wind speed and gusts over the last 24 hours")
        }
        .card()
    }
}

struct VerdictNotes: View {
    let verdict: Summary.Verdict
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Eyebrow("Why \(verdict.label.lowercased())")
            ForEach(verdict.notes, id: \.self) { note in
                Label(note, systemImage: "circle.fill")
                    .labelStyle(DotLabelStyle(color: verdict.color))
                    .font(.subheadline)
            }
        }
        .card()
    }
}

struct DotLabelStyle: LabelStyle {
    let color: Color
    func makeBody(configuration: Configuration) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Circle().fill(color).frame(width: 7, height: 7)
            configuration.title
        }
    }
}

// MARK: Water

private struct WaterSection: View {
    let s: Summary

    var body: some View {
        VStack(spacing: 14) {
            if let f = s.flow {
                VStack(alignment: .leading, spacing: 8) {
                    Eyebrow("Kortes release · Miracle Mile flow")
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text(Fmt.num(f.cfs)).font(.system(size: 48, weight: .semibold).monospacedDigit())
                        Text("cfs").foregroundStyle(.secondary)
                        Spacer()
                        if let c = f.change, c != 0 {
                            Label("\(c > 0 ? "+" : "")\(Fmt.num(c))", systemImage: c > 0 ? "arrow.up.right" : "arrow.down.right")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(c > 0 ? Color.mileRust : Color.mileSlate)
                        }
                    }
                    if let band = f.band { Text(band).font(.headline).foregroundStyle(Color.mileRiver) }
                    if let note = f.note { Text(note).font(.subheadline).foregroundStyle(.secondary) }
                    Chart(Array(f.last30.enumerated()), id: \.offset) { i, v in
                        AreaMark(x: .value("Day", i), y: .value("cfs", v))
                            .foregroundStyle(LinearGradient(colors: [Color.mileRiver.opacity(0.35), .clear], startPoint: .top, endPoint: .bottom))
                        LineMark(x: .value("Day", i), y: .value("cfs", v))
                            .foregroundStyle(Color.mileRiver)
                    }
                    .chartXAxis(.hidden)
                    .frame(height: 120)
                    Text("Last 30 days · as of \(f.date)").font(.caption).foregroundStyle(.secondary)
                }
                .card()
            }

            if let inflow = s.inflowCfs {
                MetricCard(title: "Inflow to Seminoe", value: Fmt.num(inflow), unit: "cfs", detail: "What's coming down from upstream")
            }

            VStack(alignment: .leading, spacing: 12) {
                Eyebrow("Reservoirs")
                ForEach(s.reservoirs) { r in
                    VStack(alignment: .leading, spacing: 5) {
                        HStack {
                            Text(r.name).font(.subheadline.weight(.semibold))
                            Spacer()
                            Text("\(Fmt.num(r.pctFull))% full").font(.subheadline.monospacedDigit())
                        }
                        ProgressView(value: min(max((r.pctFull ?? 0) / 100, 0), 1)).tint(.mileRiver)
                        Text("\(Fmt.num(r.storageAf)) af · elev \(Fmt.num(r.elevFt)) ft").font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
            .card()
        }
    }
}

// MARK: Forecast

private struct ForecastSection: View {
    let s: Summary

    var body: some View {
        VStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 10) {
                Eyebrow("Next 36 hours")
                Chart {
                    ForEach(s.hourly) { h in
                        if let t = h.tempF {
                            LineMark(x: .value("Time", h.t.msDate), y: .value("Temp", t), series: .value("Series", "Temp"))
                                .foregroundStyle(Color.mileOchre).interpolationMethod(.monotone)
                        }
                        if let w = h.windMph {
                            BarMark(x: .value("Time", h.t.msDate, unit: .hour), y: .value("Wind", w))
                                .foregroundStyle(w >= 15 ? Color.mileRust.opacity(0.6) : Color.mileSlate.opacity(0.4))
                        }
                    }
                    if let w = s.bestWindow {
                        RectangleMark(xStart: .value("Start", w.start.msDate), xEnd: .value("End", w.end.msDate))
                            .foregroundStyle(Color.mileRiver.opacity(0.12))
                    }
                }
                .chartXAxis { AxisMarks(values: .stride(by: .hour, count: 6)) { _ in AxisGridLine(); AxisValueLabel(format: .dateTime.hour()) } }
                .frame(height: 200)
                HStack(spacing: 14) {
                    LegendDot(color: .mileOchre, text: "Temp °F")
                    LegendDot(color: .mileSlate, text: "Wind mph")
                    if s.bestWindow != nil { LegendDot(color: .mileRiver, text: "Best window") }
                }
                .font(.caption)
            }
            .card()

            NextHoursStrip(hours: s.hourly)

            VStack(spacing: 0) {
                ForEach(s.daily) { d in
                    HStack {
                        Text(d.label).frame(width: 56, alignment: .leading)
                        Image(systemName: WeatherSymbol.name(d.icon)).symbolRenderingMode(.multicolor).frame(width: 30)
                        if let p = d.precipChance, p >= 20 {
                            Text("\(Int(p))%").font(.caption).foregroundStyle(Color.mileSlate).frame(width: 36)
                        } else { Spacer().frame(width: 36) }
                        Spacer()
                        Text("\(Fmt.num(d.lowF))°").foregroundStyle(.secondary)
                        Text("\(Fmt.num(d.highF))°").fontWeight(.semibold).frame(width: 40, alignment: .trailing)
                        Label(Fmt.num(d.windMph), systemImage: "wind").font(.caption).foregroundStyle(.secondary).frame(width: 52, alignment: .trailing)
                    }
                    .frame(minHeight: 46)
                    if d.id != s.daily.last?.id { Divider() }
                }
            }
            .card()
        }
    }

    private struct LegendDot: View {
        let color: Color
        let text: String
        var body: some View {
            HStack(spacing: 5) { Circle().fill(color).frame(width: 8, height: 8); Text(text).foregroundStyle(.secondary) }
        }
    }
}

// MARK: Guide

private struct GuideSection: View {
    let s: Summary

    var body: some View {
        VStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 10) {
                Eyebrow("Sun")
                Grid(alignment: .leading, verticalSpacing: 8) {
                    row("First light", s.sun.dawn, "sun.horizon")
                    row("Sunrise", s.sun.rise, "sunrise.fill")
                    row("Solar noon", s.sun.noon, "sun.max.fill")
                    row("Sunset", s.sun.set, "sunset.fill")
                    row("Last light", s.sun.dusk, "moon.haze")
                }
                .symbolRenderingMode(.multicolor)
            }
            .card()

            HStack(spacing: 16) {
                Image(systemName: MoonSymbol.name(for: s.moon.phase)).font(.system(size: 54))
                VStack(alignment: .leading, spacing: 3) {
                    Eyebrow("Moon")
                    Text(s.moon.name).font(.headline)
                    Text("\(Int((s.moon.illumination * 100).rounded()))% illuminated").foregroundStyle(.secondary)
                    Text([s.moon.rise.map { "Rises \(Fmt.time($0))" }, s.moon.set.map { "Sets \(Fmt.time($0))" }].compactMap { $0 }.joined(separator: " · "))
                        .font(.footnote)
                }
                Spacer()
            }
            .card()

            VStack(alignment: .leading, spacing: 10) {
                Eyebrow("Feeding windows today")
                ForEach(s.feeding) { p in
                    HStack {
                        Text(p.kind.capitalized)
                            .font(.caption.weight(.bold))
                            .padding(.horizontal, 8).padding(.vertical, 3)
                            .background((p.kind == "major" ? Color.mileRiver : Color.mileOchre).opacity(0.18), in: .capsule)
                        Text(Fmt.range(p.start, p.end)).font(.subheadline.monospacedDigit())
                        Spacer()
                        Text(p.why).font(.footnote).foregroundStyle(.secondary)
                    }
                }
                Text("Solunar periods are a nudge, not a rule. Flow and weather matter more.")
                    .font(.caption).foregroundStyle(.secondary)
            }
            .card()

            VStack(alignment: .leading, spacing: 12) {
                Eyebrow("What's happening in \(s.hatches.month)")
                ForEach(s.hatches.items) { h in
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(h.name).font(.subheadline.weight(.semibold))
                            Text(h.flies).font(.footnote).foregroundStyle(.secondary)
                        }
                        Spacer()
                        HStack(spacing: 3) {
                            ForEach(1...3, id: \.self) { i in
                                Capsule().fill(i <= h.level ? (h.run ? Color.mileRust : Color.mileRiver) : Color.secondary.opacity(0.2))
                                    .frame(width: 14, height: 6)
                            }
                        }
                        .accessibilityLabel("Strength \(h.level) of 3")
                    }
                }
            }
            .card()
        }
    }

    private func row(_ title: String, _ ms: Double, _ symbol: String) -> some View {
        GridRow {
            Image(systemName: symbol)
            Text(title)
            Text(Fmt.time(ms)).monospacedDigit().gridColumnAlignment(.trailing)
        }
    }
}
