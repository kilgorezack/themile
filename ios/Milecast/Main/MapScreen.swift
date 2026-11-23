import SwiftUI
import MapKit

/// Seminoe to Alcova: the Mile highlighted, every dam and gauge with live
/// readings. Field (standard, realistic elevation) or satellite (hybrid).
struct MapScreen: View {
    enum Look: String, CaseIterable { case field = "Field", satellite = "Satellite" }

    @State private var look: Look = .field
    @State private var region: RegionData?
    @State private var selected: Site?
    @State private var camera: MapCameraPosition = .region(MKCoordinateRegion(
        center: .init(latitude: 42.2, longitude: -106.92),
        span: .init(latitudeDelta: 0.75, longitudeDelta: 0.75)))

    var body: some View {
        Map(position: $camera, selection: $selected) {
            MapPolyline(coordinates: Site.mile)
                .stroke(Color.mileRiver, style: StrokeStyle(lineWidth: 6, lineCap: .round, lineJoin: .round))

            Annotation("Miracle Mile", coordinate: Site.mile[Site.mile.count / 2], anchor: .leading) {
                Text("Miracle Mile")
                    .font(.caption.weight(.bold))
                    .padding(.horizontal, 8).padding(.vertical, 4)
                    .glassEffect(in: .capsule)
                    .offset(x: 10)
            }
            .annotationTitles(.hidden)

            ForEach(Site.all) { site in
                Marker(site.short, systemImage: site.kind == .dam ? "water.waves" : "gauge.with.dots.needle.33percent", coordinate: site.coordinate)
                    .tint(site.kind == .dam ? Color.mileRiverDeep : Color.mileSlate)
                    .tag(site)
            }
        }
        .mapStyle(look == .field
                  ? .standard(elevation: .realistic, emphasis: .muted, pointsOfInterest: .excludingAll)
                  : .hybrid(elevation: .realistic, pointsOfInterest: .excludingAll))
        .mapControls {
            MapCompass()
            MapScaleView()
            MapUserLocationButton()
            MapPitchToggle()
        }
        .safeAreaInset(edge: .top) {
            Picker("Map style", selection: $look) {
                ForEach(Look.allCases, id: \.self) { Text($0.rawValue) }
            }
            .pickerStyle(.segmented)
            .frame(width: 220)
            .padding(6)
            .glassEffect(in: .capsule)
        }
        .navigationTitle("Map")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackgroundVisibility(.hidden, for: .navigationBar)
        .toolbar { AccountToolbarItem() }
        .task { region = try? await MilecastAPI.region() }
        .sheet(item: $selected) { site in
            SiteSheet(site: site, data: region?.sites[site.id])
                .presentationDetents([.height(260), .medium])
                .presentationBackgroundInteraction(.enabled(upThrough: .height(260)))
        }
    }
}

private struct SiteSheet: View {
    let site: Site
    let data: RegionData.Site?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text(site.blurb).foregroundStyle(.secondary)
                    Grid(horizontalSpacing: 12, verticalSpacing: 12) {
                        if site.kind == .dam {
                            GridRow {
                                MetricCard(title: "Release", value: Fmt.num(data?.latest["QD"]?.v), unit: "cfs")
                                MetricCard(title: "Inflow", value: Fmt.num(data?.latest["IN"]?.v), unit: "cfs")
                            }
                            GridRow {
                                MetricCard(title: "Storage", value: Fmt.num(data?.pctFull), unit: "%", detail: data?.latest["AF"].map { "\(Fmt.num($0.v)) af" })
                                MetricCard(title: "Elevation", value: Fmt.num(data?.latest["FB"]?.v), unit: "ft")
                            }
                        } else {
                            GridRow {
                                MetricCard(title: "Flow", value: Fmt.num(data?.latest["Q"]?.v), unit: "cfs",
                                           detail: data?.latest["Q"] == nil ? "Gauge is quiet (seasonal)" : data?.latest["Q"].map { Fmt.ago($0.t) })
                            }
                        }
                    }
                    Button {
                        let item = MKMapItem(location: CLLocation(latitude: site.coordinate.latitude, longitude: site.coordinate.longitude), address: nil)
                        item.name = site.name
                        item.openInMaps(launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving])
                    } label: {
                        Label("Directions", systemImage: "car.fill").frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .buttonStyle(.glass)
                }
                .padding(.horizontal, 20)
            }
            .navigationTitle(site.name)
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
