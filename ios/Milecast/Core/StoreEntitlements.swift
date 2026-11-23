import StoreKit

/// Milecast One via StoreKit 2. Create these auto-renewable subscriptions in
/// App Store Connect (one subscription group) with exactly these product IDs.
enum MilecastProducts {
    static let yearly = "one.milecast.yearly"
    static let monthly = "one.milecast.monthly"
    static let all = [yearly, monthly]
}

/// Tracks whether this Apple ID currently owns Milecast One. The profile's
/// server-set `plan` covers web purchases; this covers App Store purchases
/// instantly, before the server catches up.
@MainActor
@Observable
final class StoreEntitlements {
    private(set) var ownsOne = false
    private var updates: Task<Void, Never>?

    func start() async {
        updates?.cancel()
        updates = Task { [weak self] in
            for await result in Transaction.updates {
                if case .verified(let transaction) = result { await transaction.finish() }
                await self?.refresh()
            }
        }
        await refresh()
    }

    func refresh() async {
        var owns = false
        for await result in Transaction.currentEntitlements {
            if case .verified(let t) = result, MilecastProducts.all.contains(t.productID), t.revocationDate == nil {
                owns = true
            }
        }
        ownsOne = owns
    }
}
