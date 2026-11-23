import Foundation

/// The website's `/api/summary`: everything Home and Conditions need, computed
/// with the same code as the site so the verdict and best window always match.
/// Times are epoch milliseconds.
struct Summary: Decodable {
    let updatedAt: String
    let station: Station?
    let verdict: Verdict
    let bestWindow: BestWindow?
    let now: Now?
    let flow: Flow?
    let reservoirs: [Reservoir]
    let inflowCfs: Double?
    let sun: Sun
    let moon: Moon
    let feeding: [Period]
    let nextWindow: NextWindow?
    let hourly: [Hour]
    let daily: [Day]
    let history: [HistoryPoint]
    let hatches: Hatches

    struct Station: Decodable { let name: String; let source: String; let observedAt: Double }
    struct Verdict: Decodable { let tone: String; let headline: String; let notes: [String] }
    struct BestWindow: Decodable { let start: Double; let end: Double; let tomorrow: Bool; let avgWindMph: Double?; let avgTempF: Double? }
    struct Now: Decodable {
        let tempF, feelsLikeF, dewPointF, humidity, windMph, gustMph, lullMph, windDir, pressureInHg, precipTodayIn, uv: Double?
        let pressureTrend: String?
        let conditions: String?
        let lightning3h: Int?
        let lightningLastMi: Double?
    }
    struct Flow: Decodable { let cfs: Double; let date: String; let change: Double?; let band: String?; let bandIndex: Int?; let note: String?; let last30: [Double] }
    struct Reservoir: Decodable, Identifiable { let name: String; let pctFull: Double?; let storageAf: Double?; let elevFt: Double?; var id: String { name } }
    struct Sun: Decodable { let dawn, rise, noon, set, dusk: Double }
    struct Moon: Decodable { let phase: Double; let illumination: Double; let name: String; let rise: Double?; let set: Double? }
    struct Period: Decodable, Identifiable { let kind: String; let why: String; let start: Double; let end: Double; var id: Double { start } }
    struct NextWindow: Decodable { let kind: String; let why: String; let start: Double; let end: Double; let active: Bool }
    struct Hour: Decodable, Identifiable { let t: Double; let tempF, windMph, gustMph, windDir, precipChance: Double?; let conditions: String; let icon: String; var id: Double { t } }
    struct Day: Decodable, Identifiable { let t: Double; let label: String; let highF, lowF, precipChance, windMph: Double?; let conditions: String; let icon: String; var id: Double { t } }
    struct HistoryPoint: Decodable, Identifiable { let t: Double; let windMph, gustMph, tempF, pressureInHg: Double?; var id: Double { t } }
    struct Hatches: Decodable { let month: String; let items: [Hatch] }
    struct Hatch: Decodable, Identifiable { let name: String; let flies: String; let level: Int; let run: Bool; var id: String { name } }
}

extension Double {
    /// Epoch milliseconds → Date.
    var msDate: Date { Date(timeIntervalSince1970: self / 1000) }
}

enum MilecastAPI {
    static let base = URL(string: "https://themile.summitlabs.one")!

    static func summary() async throws -> Summary {
        try await get("api/summary")
    }

    static func region() async throws -> RegionData {
        try await get("api/region")
    }

    private static func get<T: Decodable>(_ path: String) async throws -> T {
        var request = URLRequest(url: base.appending(path: path))
        request.cachePolicy = .reloadRevalidatingCacheData
        request.timeoutInterval = 20
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
        return try JSONDecoder().decode(T.self, from: data)
    }
}

/// `/api/region`: latest release, inflow, storage and elevation per dam and gauge.
struct RegionData: Decodable {
    let sites: [String: Site]
    struct Site: Decodable {
        let latest: [String: Reading]
        let pctFull: Double?
    }
    struct Reading: Decodable { let t: Double; let v: Double }
}

/// Loads and refreshes the summary; Home and Conditions share one instance.
@MainActor
@Observable
final class ConditionsModel {
    private(set) var summary: Summary?
    private(set) var error: String?
    private(set) var loading = false

    func refresh() async {
        loading = true
        defer { loading = false }
        do {
            summary = try await MilecastAPI.summary()
            error = nil
        } catch {
            if summary == nil { self.error = "Couldn't load conditions. Pull to try again." }
        }
    }
}
