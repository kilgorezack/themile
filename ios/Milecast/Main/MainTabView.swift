import SwiftUI

enum AppTab: Hashable { case home, conditions, dashboard, map }

/// Lets Home cards jump to the matching part of Conditions, like the website.
@MainActor
@Observable
final class AppRouter {
    var tab: AppTab = .home
    var conditionsSection: ConditionsSection = .station
    var showAccount = false

    func open(_ section: ConditionsSection) {
        conditionsSection = section
        tab = .conditions
    }
}

struct MainTabView: View {
    @State private var router = AppRouter()
    @State private var conditions = ConditionsModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        @Bindable var router = router
        TabView(selection: $router.tab) {
            Tab("Home", systemImage: "house", value: AppTab.home) {
                NavigationStack { HomeView() }
            }
            Tab("Conditions", systemImage: "water.waves", value: AppTab.conditions) {
                NavigationStack { ConditionsView() }
            }
            Tab("Dashboard", systemImage: "square.grid.2x2", value: AppTab.dashboard) {
                NavigationStack { OneGate(feature: .dashboard) { DashboardView() } }
            }
            Tab("Map", systemImage: "map", value: AppTab.map) {
                NavigationStack { OneGate(feature: .map) { MapScreen() } }
            }
        }
        .tabBarMinimizeBehavior(.onScrollDown)
        .environment(router)
        .environment(conditions)
        .sheet(isPresented: $router.showAccount) { AccountView() }
        .task { await conditions.refresh() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await conditions.refresh() } }
        }
        // Keep readings fresh while the app is open (the API caches for a minute).
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(120))
                await conditions.refresh()
            }
        }
    }
}

/// The avatar button in every tab's top bar; opens Account.
struct AccountToolbarItem: ToolbarContent {
    @Environment(Session.self) private var session
    @Environment(AppRouter.self) private var router

    var body: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Button { router.showAccount = true } label: {
                AvatarView(profile: session.profile, size: 32)
            }
            .accessibilityLabel("Account")
        }
    }
}

/// Dashboard and Map are part of Milecast One. Shows a preview + upgrade
/// prompt for free accounts. Web purchases count via the profile's `plan`.
struct OneGate<Content: View>: View {
    enum Feature { case dashboard, map }
    @Environment(Session.self) private var session
    @Environment(StoreEntitlements.self) private var store
    let feature: Feature
    @ViewBuilder let content: () -> Content
    @State private var paywall = false

    var body: some View {
        if session.profile.isOne || store.ownsOne {
            content()
        } else {
            ScrollView {
                VStack(spacing: 18) {
                    Image(systemName: feature == .dashboard ? "square.grid.2x2.fill" : "map.fill")
                        .font(.system(size: 54))
                        .foregroundStyle(Color.mileRiver)
                        .padding(.top, 40)
                    Text(feature == .dashboard ? "Your own dashboard" : "The field map")
                        .font(.verdict(.largeTitle))
                    Text(feature == .dashboard
                         ? "Pick the readings you care about, size them, and put them in your order. Saved to your account."
                         : "Every dam and gauge from Seminoe to Alcova with live releases and storage, plus satellite imagery.")
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                    PrimaryButton(title: "Get Milecast One") { paywall = true }
                        .padding(.top, 8)
                    Text("$4.99 a month or $29.99 a year. Works on the website too.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                .padding(24)
            }
            .background(Color.milePaper.ignoresSafeArea())
            .navigationTitle(feature == .dashboard ? "Dashboard" : "Map")
            .toolbar { AccountToolbarItem() }
            .sheet(isPresented: $paywall) { PaywallView() }
        }
    }
}
