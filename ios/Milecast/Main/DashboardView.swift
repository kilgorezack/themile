import SwiftUI

/// Same widget set as the website's dashboard. Layout is kept on device;
/// "small" widgets pair up two-across, "large" ones span the row.
struct DashboardWidget: Codable, Identifiable, Hashable {
    enum Kind: String, Codable, CaseIterable {
        case verdict, flow, wind, windChart, air, pressure, hourly, releases, storage, gauges, sky, lightning
        var title: String {
            switch self {
            case .verdict: "Verdict"
            case .flow: "Flow"
            case .wind: "Wind"
            case .windChart: "Wind chart"
            case .air: "Air"
            case .pressure: "Pressure"
            case .hourly: "Next hours"
            case .releases: "Dam releases"
            case .storage: "Storage"
            case .gauges: "River gauges"
            case .sky: "Sun & moon"
            case .lightning: "Lightning"
            }
        }
        var symbol: String {
            switch self {
            case .verdict: "text.quote"
            case .flow: "drop.fill"
            case .wind: "wind"
            case .windChart: "chart.xyaxis.line"
            case .air: "thermometer.medium"
            case .pressure: "gauge.with.dots.needle.50percent"
            case .hourly: "clock"
            case .releases: "water.waves"
            case .storage: "cylinder.split.1x2"
            case .gauges: "point.topleft.down.to.point.bottomright.curvepath"
            case .sky: "sun.and.horizon"
            case .lightning: "bolt.fill"
            }
        }
    }
    enum Size: String, Codable, CaseIterable { case small, large }

    var kind: Kind
    var size: Size
    var hidden = false
    var id: Kind { kind }

    static let defaults: [DashboardWidget] = [
        .init(kind: .verdict, size: .large), .init(kind: .flow, size: .small), .init(kind: .wind, size: .small),
        .init(kind: .windChart, size: .large), .init(kind: .air, size: .small), .init(kind: .pressure, size: .small),
        .init(kind: .hourly, size: .large), .init(kind: .releases, size: .large), .init(kind: .storage, size: .large),
        .init(kind: .gauges, size: .large), .init(kind: .sky, size: .small), .init(kind: .lightning, size: .small),
    ]

    /// Saved layout merged with the current widget set.
    static func normalize(_ saved: [DashboardWidget]) -> [DashboardWidget] {
        var items = saved
        for d in defaults where !items.contains(where: { $0.kind == d.kind }) { items.append(.init(kind: d.kind, size: d.size, hidden: true)) }
        return items
    }
}

struct DashboardView: View {
    @Environment(ConditionsModel.self) private var model
    @AppStorage("dashboard.v1") private var stored = Data()
    @State private var region: RegionData?
    @State private var editing = false

    private var layout: [DashboardWidget] {
        let saved = (try? JSONDecoder().decode([DashboardWidget].self, from: stored)) ?? DashboardWidget.defaults
        return DashboardWidget.normalize(saved)
    }

    var body: some View {
        ScrollView {
            if let s = model.summary {
                VStack(spacing: 12) {
                    ForEach(rows(layout.filter { !$0.hidden }), id: \.self) { row in
                        HStack(alignment: .top, spacing: 12) {
                            ForEach(row) { w in widget(w.kind, s).frame(maxHeight: .infinity, alignment: .top) }
                        }
                        .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(16)
            } else {
                ProgressView().padding(.top, 160)
            }
        }
        .background(Color.milePaper.ignoresSafeArea())
        .navigationTitle("Dashboard")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) { Button("Edit") { editing = true } }
            AccountToolbarItem()
        }
        .refreshable {
            await model.refresh()
            region = try? await MilecastAPI.region()
        }
        .task { region = try? await MilecastAPI.region() }
        .sheet(isPresented: $editing) {
            DashboardEditor(layout: layout) { stored = (try? JSONEncoder().encode($0)) ?? stored }
        }
    }

    /// Pairs up consecutive small widgets; large ones get their own row.
    private func rows(_ items: [DashboardWidget]) -> [[DashboardWidget]] {
        var out: [[DashboardWidget]] = []
        var pending: DashboardWidget?
        for w in items {
            if w.size == .large {
                if let p = pending { out.append([p]); pending = nil }
                out.append([w])
            } else if let p = pending {
                out.append([p, w]); pending = nil
            } else {
                pending = w
            }
        }
        if let p = pending { out.append([p]) }
        return out
    }

    @ViewBuilder
    private func widget(_ kind: DashboardWidget.Kind, _ s: Summary) -> some View {
        switch kind {
        case .verdict:
            VStack(alignment: .leading, spacing: 6) {
                Eyebrow(s.verdict.label)
                Text(s.verdict.headline).font(.verdict(.title))
                if let w = s.bestWindow { Text("Best window \(Fmt.range(w.start, w.end))").font(.subheadline).foregroundStyle(Color.mileRiver) }
            }
            .card()
        case .flow:
            MetricCard(title: "Flow", value: Fmt.num(s.flow?.cfs), unit: "cfs", detail: s.flow?.band, detailColor: .mileRiver, trend: s.flow?.last30 ?? [])
        case .wind:
            MetricCard(title: "Wind", value: Fmt.num(s.now?.windMph), unit: "mph", detail: "Gusts \(Fmt.num(s.now?.gustMph)) · \(Fmt.compass(s.now?.windDir))") {
                CompassView(direction: s.now?.windDir, speed: nil, size: 34)
            }
        case .windChart:
            WindChart(points: s.history)
        case .air:
            MetricCard(title: "Air", value: Fmt.num(s.now?.tempF), unit: "°F", detail: "Feels \(Fmt.num(s.now?.feelsLikeF))°", trend: s.history.compactMap(\.tempF), trendColor: .mileOchre)
        case .pressure:
            MetricCard(title: "Pressure", value: Fmt.num(s.now?.pressureInHg, 2), unit: "inHg", detail: s.now?.pressureTrend?.capitalized, trend: s.history.compactMap(\.pressureInHg), trendColor: .mileSlate)
        case .hourly:
            NextHoursStrip(hours: Array(s.hourly.prefix(36)))
        case .releases:
            siteList("Dam releases", Site.all.filter { $0.kind == .dam }) { r in r.latest["QD"].map { "\(Fmt.num($0.v)) cfs" } }
        case .storage:
            VStack(alignment: .leading, spacing: 10) {
                Eyebrow("Storage")
                ForEach(s.reservoirs) { r in
                    HStack {
                        Text(r.name).font(.subheadline)
                        ProgressView(value: min(max((r.pctFull ?? 0) / 100, 0), 1)).tint(.mileRiver)
                        Text("\(Fmt.num(r.pctFull))%").font(.subheadline.monospacedDigit()).frame(width: 44, alignment: .trailing)
                    }
                }
            }
            .card()
        case .gauges:
            siteList("River gauges", Site.all.filter { $0.kind == .gauge }) { r in r.latest["Q"].map { "\(Fmt.num($0.v)) cfs" } }
        case .sky:
            VStack(alignment: .leading, spacing: 6) {
                Eyebrow("Sun & moon")
                Label(Fmt.time(s.sun.rise), systemImage: "sunrise.fill")
                Label(Fmt.time(s.sun.set), systemImage: "sunset.fill")
                Label(s.moon.name, systemImage: MoonSymbol.name(for: s.moon.phase))
            }
            .font(.subheadline)
            .symbolRenderingMode(.multicolor)
            .card()
        case .lightning:
            MetricCard(title: "Lightning 3h", value: "\(s.now?.lightning3h ?? 0)", unit: "strikes",
                       detail: (s.now?.lightning3h ?? 0) > 0 ? "Nearest \(Fmt.num(s.now?.lightningLastMi)) mi" : "All clear",
                       detailColor: (s.now?.lightning3h ?? 0) > 0 ? .red : .secondary)
        }
    }

    private func siteList(_ title: String, _ sites: [Site], value: @escaping (RegionData.Site) -> String?) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Eyebrow(title)
            ForEach(sites) { site in
                HStack {
                    Text(site.short).font(.subheadline)
                    Spacer()
                    Text(region?.sites[site.id].flatMap(value) ?? "—").font(.subheadline.monospacedDigit().weight(.semibold))
                }
            }
        }
        .card()
    }
}

struct DashboardEditor: View {
    @Environment(\.dismiss) private var dismiss
    @State var layout: [DashboardWidget]
    let save: ([DashboardWidget]) -> Void

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach($layout) { $w in
                        HStack {
                            Button {
                                w.hidden.toggle()
                            } label: {
                                Image(systemName: w.hidden ? "plus.circle.fill" : "minus.circle.fill")
                                    .foregroundStyle(w.hidden ? .green : .red)
                            }
                            .buttonStyle(.borderless)
                            .accessibilityLabel(w.hidden ? "Show \(w.kind.title)" : "Hide \(w.kind.title)")
                            Label(w.kind.title, systemImage: w.kind.symbol)
                                .foregroundStyle(w.hidden ? .secondary : .primary)
                            Spacer()
                            Picker("Size", selection: $w.size) {
                                Text("Half").tag(DashboardWidget.Size.small)
                                Text("Full").tag(DashboardWidget.Size.large)
                            }
                            .pickerStyle(.segmented)
                            .frame(width: 110)
                            .disabled(w.hidden)
                        }
                    }
                    .onMove { layout.move(fromOffsets: $0, toOffset: $1) }
                } footer: {
                    Text("Drag to reorder. Half-width widgets sit side by side.")
                }
                Section {
                    Button("Reset to default", role: .destructive) { layout = DashboardWidget.defaults }
                }
            }
            .environment(\.editMode, .constant(.active))
            .navigationTitle("Edit dashboard")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { save(layout); dismiss() }
                }
            }
        }
    }
}
