import SwiftUI
import FirebaseCore
import GoogleSignIn

/// Firebase must be configured before any Auth / Firestore / Storage call.
final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        FirebaseApp.configure()
        return true
    }
}

@main
struct MilecastApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var session = Session()
    @State private var store = StoreEntitlements()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .environment(store)
                .tint(.mileRiver)
                // Google Sign-In returns to the app through its URL scheme.
                .onOpenURL { url in _ = GIDSignIn.sharedInstance.handle(url) }
                .task { await store.start() }
        }
    }
}
