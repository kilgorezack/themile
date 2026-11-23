import CoreLocation

/// Dams and gauges from Seminoe to Alcova, matching the website's `lib/sites.ts`.
/// `id` is the key in `/api/region`'s `sites` map.
struct Site: Identifiable, Hashable {
    enum Kind { case dam, gauge }
    let id: String
    let name: String
    let short: String
    let kind: Kind
    let coordinate: CLLocationCoordinate2D
    let blurb: String

    static func == (a: Site, b: Site) -> Bool { a.id == b.id }
    func hash(into h: inout Hasher) { h.combine(id) }

    static let all: [Site] = [
        .init(id: "usgs-06630000", name: "North Platte above Seminoe", short: "N. Platte inflow", kind: .gauge,
              coordinate: .init(latitude: 41.8722, longitude: -107.0576), blurb: "The main river coming into Seminoe Reservoir."),
        .init(id: "usgs-06635000", name: "Medicine Bow above Seminoe", short: "Medicine Bow", kind: .gauge,
              coordinate: .init(latitude: 42.0097, longitude: -106.5131), blurb: "The other main feeder of Seminoe."),
        .init(id: "seminoe", name: "Seminoe Dam", short: "Seminoe", kind: .dam,
              coordinate: .init(latitude: 42.1561, longitude: -106.9088), blurb: "The big storage reservoir upstream. Its release passes through Kortes into the Mile."),
        .init(id: "kortes", name: "Kortes Dam", short: "Kortes", kind: .dam,
              coordinate: .init(latitude: 42.1739, longitude: -106.8813), blurb: "Its release is the flow through the Miracle Mile."),
        .init(id: "usgs-06639000", name: "Sweetwater near Alcova", short: "Sweetwater", kind: .gauge,
              coordinate: .init(latitude: 42.49, longitude: -107.1412), blurb: "The Sweetwater entering Pathfinder. Seasonal gauge."),
        .init(id: "pathfinder", name: "Pathfinder Dam", short: "Pathfinder", kind: .dam,
              coordinate: .init(latitude: 42.468, longitude: -106.854), blurb: "The reservoir the Mile drains into, and where its spawning trout come from."),
        .init(id: "alcova", name: "Alcova Dam", short: "Alcova", kind: .dam,
              coordinate: .init(latitude: 42.5487, longitude: -106.7206), blurb: "Below Pathfinder and Fremont Canyon. Its release flows on to Gray Reef."),
        .init(id: "usgs-06642000", name: "North Platte at Alcova", short: "At Alcova", kind: .gauge,
              coordinate: .init(latitude: 42.5741, longitude: -106.6926), blurb: "North Platte below Alcova Dam. Seasonal gauge."),
    ]

    /// The Miracle Mile: Kortes Dam to where the river meets full-pool Pathfinder (USGS NLDI flowline).
    static let mile: [CLLocationCoordinate2D] = [
        .init(latitude: 42.17389, longitude: -106.88127),
        .init(latitude: 42.17903, longitude: -106.87655),
        .init(latitude: 42.18097, longitude: -106.87599),
        .init(latitude: 42.18388, longitude: -106.87439),
        .init(latitude: 42.18503, longitude: -106.87268),
        .init(latitude: 42.18528, longitude: -106.87117),
        .init(latitude: 42.18571, longitude: -106.87055),
        .init(latitude: 42.18591, longitude: -106.86972),
        .init(latitude: 42.18665, longitude: -106.86846),
        .init(latitude: 42.18748, longitude: -106.86756),
        .init(latitude: 42.18825, longitude: -106.86734),
        .init(latitude: 42.18987, longitude: -106.86760),
        .init(latitude: 42.19134, longitude: -106.86954),
        .init(latitude: 42.19266, longitude: -106.87181),
        .init(latitude: 42.19354, longitude: -106.87195),
        .init(latitude: 42.19506, longitude: -106.87030),
        .init(latitude: 42.19566, longitude: -106.86919),
        .init(latitude: 42.19621, longitude: -106.86859),
        .init(latitude: 42.19700, longitude: -106.86820),
        .init(latitude: 42.19787, longitude: -106.86833),
        .init(latitude: 42.19958, longitude: -106.86894),
        .init(latitude: 42.20025, longitude: -106.86853),
        .init(latitude: 42.20199, longitude: -106.86881),
        .init(latitude: 42.20330, longitude: -106.86970),
        .init(latitude: 42.20396, longitude: -106.87083),
        .init(latitude: 42.20615, longitude: -106.87324),
        .init(latitude: 42.20690, longitude: -106.87490),
        .init(latitude: 42.20845, longitude: -106.87738),
        .init(latitude: 42.21107, longitude: -106.87916),
        .init(latitude: 42.21207, longitude: -106.87932),
        .init(latitude: 42.21261, longitude: -106.87889),
        .init(latitude: 42.21387, longitude: -106.87891),
        .init(latitude: 42.21539, longitude: -106.87726),
        .init(latitude: 42.21601, longitude: -106.87736),
        .init(latitude: 42.21758, longitude: -106.87675),
        .init(latitude: 42.22185, longitude: -106.87690),
        .init(latitude: 42.22284, longitude: -106.87706),
        .init(latitude: 42.22331, longitude: -106.87747),
        .init(latitude: 42.22606, longitude: -106.87773),
        .init(latitude: 42.22679, longitude: -106.87802),
        .init(latitude: 42.22844, longitude: -106.87948),
        .init(latitude: 42.22932, longitude: -106.88099),
        .init(latitude: 42.23171, longitude: -106.88395),
        .init(latitude: 42.23294, longitude: -106.88586),
        .init(latitude: 42.23377, longitude: -106.88650),
        .init(latitude: 42.23476, longitude: -106.88666),
        .init(latitude: 42.23521, longitude: -106.88725),
        .init(latitude: 42.23566, longitude: -106.88800),
        .init(latitude: 42.23578, longitude: -106.88957),
        .init(latitude: 42.23620, longitude: -106.89050),
        .init(latitude: 42.23599, longitude: -106.89149),
        .init(latitude: 42.23631, longitude: -106.89223),
        .init(latitude: 42.23711, longitude: -106.89614),
        .init(latitude: 42.23766, longitude: -106.89708),
        .init(latitude: 42.23824, longitude: -106.89718),
        .init(latitude: 42.23888, longitude: -106.89762),
        .init(latitude: 42.23965, longitude: -106.89740),
        .init(latitude: 42.24102, longitude: -106.89761),
        .init(latitude: 42.24207, longitude: -106.89864)
    ]
}
