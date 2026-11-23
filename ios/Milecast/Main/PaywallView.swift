import SwiftUI
import StoreKit

/// Milecast One, sold through StoreKit's own subscription view so pricing,
/// trials, terms and restore follow App Store rules automatically.
struct PaywallView: View {
    @Environment(StoreEntitlements.self) private var store
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        SubscriptionStoreView(productIDs: MilecastProducts.all) {
            VStack(spacing: 16) {
                Image("AppIconImage")
                    .resizable()
                    .frame(width: 76, height: 76)
                    .clipShape(.rect(cornerRadius: 18))
                Text("Milecast One").font(.verdict(.largeTitle))
                VStack(alignment: .leading, spacing: 10) {
                    Perk(symbol: "square.grid.2x2.fill", text: "Your own dashboard, saved to your account")
                    Perk(symbol: "map.fill", text: "Field map of every dam and gauge, Seminoe to Alcova")
                    Perk(symbol: "globe.americas.fill", text: "Satellite imagery of the Mile")
                    Perk(symbol: "desktopcomputer", text: "Works on themile.summitlabs.one too")
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)
        }
        .subscriptionStoreControlStyle(.prominentPicker)
        .subscriptionStoreButtonLabel(.multiline)
        .storeButton(.visible, for: .restorePurchases)
        .subscriptionStorePolicyDestination(url: URL(string: "https://themile.summitlabs.one/terms")!, for: .termsOfService)
        .subscriptionStorePolicyDestination(url: URL(string: "https://themile.summitlabs.one/privacy")!, for: .privacyPolicy)
        .tint(.mileRiver)
        .onInAppPurchaseCompletion { _, result in
            await store.refresh()
            if case .success(.success) = result { dismiss() }
        }
    }

    private struct Perk: View {
        let symbol: String
        let text: String
        var body: some View {
            Label {
                Text(text)
            } icon: {
                Image(systemName: symbol).foregroundStyle(Color.mileRiver)
            }
            .font(.subheadline)
        }
    }
}
