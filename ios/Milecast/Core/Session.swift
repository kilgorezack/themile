import SwiftUI
import AuthenticationServices
import CryptoKit
import FirebaseAuth
import FirebaseCore
import FirebaseFirestore
import FirebaseStorage
import GoogleSignIn

/// Who is signed in and their profile. One Firebase account is shared with the
/// website, so someone who signed up on the web lands straight in profile
/// setup (or the app) here.
@MainActor
@Observable
final class Session {
    enum Phase: Equatable { case loading, signedOut, profileSetup, ready }

    private(set) var phase: Phase = .loading
    private(set) var user: User?
    var profile = Profile()
    /// Name parts Apple shares only on the very first Sign in with Apple.
    private(set) var appleName: PersonNameComponents?

    private var listener: AuthStateDidChangeListenerHandle?
    private var currentNonce: String?
    private let db = Firestore.firestore()

    init() {
        listener = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            Task { @MainActor in await self?.userChanged(user) }
        }
    }

    // MARK: Auth state

    private func userChanged(_ user: User?) async {
        self.user = user
        guard let user else {
            profile = Profile()
            phase = .signedOut
            return
        }
        await loadProfile(for: user)
        phase = profile.onboardedAt == nil ? .profileSetup : .ready
    }

    private func loadProfile(for user: User) async {
        let ref = db.collection("users").document(user.uid)
        if let snap = try? await ref.getDocument(), snap.exists, let p = try? snap.data(as: Profile.self) {
            profile = p
        } else {
            profile = Profile()
        }
        // Prefill from the sign-in provider where the profile is still blank.
        if profile.email == nil { profile.email = user.email }
        if profile.firstName.isEmpty, profile.lastName.isEmpty {
            if let given = appleName?.givenName { profile.firstName = given }
            if let family = appleName?.familyName { profile.lastName = family }
            if profile.firstName.isEmpty, let display = user.displayName {
                let parts = display.split(separator: " ", maxSplits: 1).map(String.init)
                profile.firstName = parts.first ?? ""
                profile.lastName = parts.count > 1 ? parts[1] : ""
            }
        }
        if profile.photoURL == nil { profile.photoURL = user.photoURL?.absoluteString }
    }

    // MARK: Saving

    /// Writes the editable profile fields. `plan`, `createdAt` and `createdVia`
    /// are protected by the security rules, so they are only set on first save.
    func saveProfile(finishingOnboarding: Bool = false) async throws {
        guard let user else { return }
        let ref = db.collection("users").document(user.uid)
        let exists = (try? await ref.getDocument())?.exists ?? false

        profile.displayName = profile.fullName.isEmpty ? nil : profile.fullName
        if finishingOnboarding, profile.onboardedAt == nil { profile.onboardedAt = Date() }

        var data = try Firestore.Encoder().encode(profile)
        data.removeValue(forKey: "plan")
        data.removeValue(forKey: "createdVia")
        data["updatedAt"] = FieldValue.serverTimestamp()
        if !exists {
            data["createdAt"] = FieldValue.serverTimestamp()
            data["createdVia"] = "ios"
        }
        try await ref.setData(data, merge: true)

        // Keep Firebase Auth's own profile in step so the website shows the same name/photo.
        let change = user.createProfileChangeRequest()
        change.displayName = profile.displayName
        if let url = profile.photoURL.flatMap(URL.init(string:)) { change.photoURL = url }
        try? await change.commitChanges()

        if finishingOnboarding { phase = .ready }
    }

    // MARK: Sign in with Apple

    /// Configure the `SignInWithAppleButton` request with a hashed nonce.
    func prepare(_ request: ASAuthorizationAppleIDRequest) {
        let nonce = Self.randomNonce()
        currentNonce = nonce
        request.requestedScopes = [.fullName, .email]
        request.nonce = Self.sha256(nonce)
    }

    func completeApple(_ result: Result<ASAuthorization, Error>) async throws {
        let authorization = try result.get()
        guard
            let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let nonce = currentNonce,
            let tokenData = credential.identityToken,
            let idToken = String(data: tokenData, encoding: .utf8)
        else { throw SessionError.appleTokenMissing }

        appleName = credential.fullName
        let firebaseCredential = OAuthProvider.appleCredential(
            withIDToken: idToken,
            rawNonce: nonce,
            fullName: credential.fullName
        )
        try await Auth.auth().signIn(with: firebaseCredential)
    }

    // MARK: Google

    func signInWithGoogle() async throws {
        guard let clientID = FirebaseApp.app()?.options.clientID else { throw SessionError.googleNotConfigured }
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        guard let presenter = Self.topViewController() else { throw SessionError.noPresenter }

        let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenter)
        guard let idToken = result.user.idToken?.tokenString else { throw SessionError.googleTokenMissing }
        let credential = GoogleAuthProvider.credential(
            withIDToken: idToken,
            accessToken: result.user.accessToken.tokenString
        )
        try await Auth.auth().signIn(with: credential)
    }

    // MARK: Email

    func signIn(email: String, password: String) async throws {
        try await Auth.auth().signIn(withEmail: email.trimmingCharacters(in: .whitespaces), password: password)
    }

    func createAccount(email: String, password: String) async throws {
        try await Auth.auth().createUser(withEmail: email.trimmingCharacters(in: .whitespaces), password: password)
    }

    func sendPasswordReset(email: String) async throws {
        try await Auth.auth().sendPasswordReset(withEmail: email.trimmingCharacters(in: .whitespaces))
    }

    // MARK: Sign out / delete

    func signOut() {
        GIDSignIn.sharedInstance.signOut()
        try? Auth.auth().signOut()
    }

    /// App Store guideline 5.1.1(v): accounts created in the app must be deletable in the app.
    /// Removes the avatar, the profile document, then the Firebase account.
    func deleteAccount() async throws {
        guard let user else { return }
        let uid = user.uid
        try? await Storage.storage().reference(withPath: "users/\(uid)/avatar.jpg").delete()
        try await db.collection("users").document(uid).delete()
        do {
            try await user.delete()
        } catch let error as NSError where error.code == AuthErrorCode.requiresRecentLogin.rawValue {
            throw SessionError.needsRecentSignIn
        }
    }

    // MARK: Helpers

    private static func randomNonce(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var bytes = [UInt8](repeating: 0, count: length)
        _ = SecRandomCopyBytes(kSecRandomDefault, length, &bytes)
        return String(bytes.map { charset[Int($0) % charset.count] })
    }

    private static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
    }

    private static func topViewController() -> UIViewController? {
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
        var top = scene?.keyWindow?.rootViewController
        while let presented = top?.presentedViewController { top = presented }
        return top
    }
}

enum SessionError: LocalizedError {
    case appleTokenMissing, googleNotConfigured, googleTokenMissing, noPresenter, needsRecentSignIn

    var errorDescription: String? {
        switch self {
        case .appleTokenMissing: "Apple didn't return a sign-in token. Please try again."
        case .googleNotConfigured: "Google sign-in isn't set up in this build."
        case .googleTokenMissing: "Google didn't return a sign-in token. Please try again."
        case .noPresenter: "Couldn't open the sign-in screen."
        case .needsRecentSignIn: "For your security, sign out and back in, then delete your account."
        }
    }
}

/// Plain-language messages for Firebase Auth errors.
func friendlyAuthMessage(_ error: Error) -> String? {
    let ns = error as NSError
    if ns.domain == ASAuthorizationError.errorDomain, ns.code == ASAuthorizationError.canceled.rawValue { return nil }
    if ns.domain == "com.google.GIDSignIn", ns.code == -5 { return nil } // user cancelled
    switch AuthErrorCode(rawValue: ns.code) {
    case .wrongPassword, .invalidCredential, .userNotFound: return "That email and password don't match an account."
    case .emailAlreadyInUse: return "There's already an account with that email. Try signing in."
    case .weakPassword: return "Use at least 6 characters for your password."
    case .invalidEmail: return "That doesn't look like an email address."
    case .networkError: return "No connection. Check your signal and try again."
    case .accountExistsWithDifferentCredential: return "You already have an account with that email using a different sign-in method."
    case .tooManyRequests: return "Too many tries. Wait a minute and try again."
    default: return error.localizedDescription
    }
}
