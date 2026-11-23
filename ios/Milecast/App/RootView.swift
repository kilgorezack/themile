import SwiftUI

/// Signed out → welcome + account. Signed in without a finished profile →
/// profile setup. Otherwise the app.
struct RootView: View {
    @Environment(Session.self) private var session

    var body: some View {
        Group {
            switch session.phase {
            case .loading:
                ProgressView()
                    .controlSize(.large)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.milePaper)
            case .signedOut:
                SignedOutFlow()
            case .profileSetup:
                ProfileSetupFlow()
            case .ready:
                MainTabView()
            }
        }
        .animation(.smooth, value: session.phase)
    }
}
