import SwiftUI
import AuthenticationServices

/// Welcome → create account / sign in. Once Firebase signs someone in, the
/// session moves them on to profile setup (or straight into the app).
struct SignedOutFlow: View {
    @State private var path: [Route] = []
    enum Route: Hashable { case account(signIn: Bool) }

    var body: some View {
        NavigationStack(path: $path) {
            WelcomeView(
                getStarted: { path.append(.account(signIn: false)) },
                signIn: { path.append(.account(signIn: true)) }
            )
            .navigationDestination(for: Route.self) { route in
                switch route {
                case .account(let signIn): AccountStep(startInSignIn: signIn)
                }
            }
        }
    }
}

// MARK: Welcome

struct WelcomeView: View {
    let getStarted: () -> Void
    let signIn: () -> Void
    @State private var appeared = false

    var body: some View {
        ZStack(alignment: .bottom) {
            LandscapeView(style: .dusk).ignoresSafeArea()

            VStack(alignment: .leading, spacing: 10) {
                Text("MIRACLE MILE · NORTH PLATTE")
                    .font(.footnote.weight(.semibold)).tracking(1.4).opacity(0.85)
                Text("Milecast").font(.system(size: 64, design: .serif).italic())
                Text("Know the Mile before you make the drive.")
                    .font(.title3)
                Spacer()
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 28)
            .padding(.top, 70)
            .opacity(appeared ? 1 : 0)
            .offset(y: appeared ? 0 : 14)

            VStack(spacing: 14) {
                VStack(alignment: .leading, spacing: 12) {
                    Feature(symbol: "drop.fill", tint: .green, text: "Live flows, wind and pressure from the Mile")
                    Feature(symbol: "clock.fill", tint: .yellow, text: "Your best window to fish, every day")
                    Feature(symbol: "bolt.fill", tint: .orange, text: "A heads-up when lightning gets close")
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .glassEffect(.regular.tint(.black.opacity(0.15)), in: .rect(cornerRadius: 22))

                Button(action: getStarted) {
                    Text("Get started").font(.headline).frame(maxWidth: .infinity, minHeight: 50)
                }
                .buttonStyle(.glassProminent)
                .tint(.mileCream)
                .foregroundStyle(Color.mileRiverDeep)

                Button("I already have an account", action: signIn)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.white)
                    .frame(minHeight: 44)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 12)
        }
        .toolbarVisibility(.hidden, for: .navigationBar)
        .onAppear { withAnimation(.smooth(duration: 1.1)) { appeared = true } }
    }

    private struct Feature: View {
        let symbol: String
        let tint: Color
        let text: String
        var body: some View {
            Label {
                Text(text).foregroundStyle(.white)
            } icon: {
                Image(systemName: symbol)
                    .foregroundStyle(tint)
                    .frame(width: 30, height: 30)
                    .background(tint.opacity(0.22), in: .rect(cornerRadius: 9))
            }
            .font(.subheadline)
        }
    }
}

// MARK: Create account / sign in

struct AccountStep: View {
    @Environment(Session.self) private var session
    @Environment(\.colorScheme) private var colorScheme
    let startInSignIn: Bool

    @State private var emailSheet = false
    @State private var busy = false
    @State private var errorText: String?

    var body: some View {
        OnboardingStep(
            step: 1,
            title: startInSignIn ? "Welcome back" : "Create your account",
            subtitle: "One account for the app and the website. Sign in on either and you're all set."
        ) {
            Image("AppIconImage")
                .resizable()
                .frame(width: 64, height: 64)
                .clipShape(.rect(cornerRadius: 15))
                .shadow(radius: 6, y: 3)
                .accessibilityHidden(true)
        } actions: {
            SignInWithAppleButton(startInSignIn ? .signIn : .continue) { request in
                session.prepare(request)
            } onCompletion: { result in
                run { try await session.completeApple(result) }
            }
            .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
            .frame(height: 52)
            .clipShape(.capsule)

            Button {
                run { try await session.signInWithGoogle() }
            } label: {
                Label("Continue with Google", image: "GoogleG")
                    .font(.headline)
                    .frame(maxWidth: .infinity, minHeight: 50)
            }
            .buttonStyle(.glass)

            Button {
                emailSheet = true
            } label: {
                Label("Continue with Email", systemImage: "envelope")
                    .font(.headline)
                    .frame(maxWidth: .infinity, minHeight: 50)
            }
            .buttonStyle(.glass)

            Text("By continuing you agree to the [Terms](https://themile.summitlabs.one/terms) and [Privacy Policy](https://themile.summitlabs.one/privacy).")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.top, 4)
        }
        .disabled(busy)
        .overlay { if busy { ProgressView().controlSize(.large) } }
        .sheet(isPresented: $emailSheet) {
            EmailAuthSheet(startInSignIn: startInSignIn)
                .presentationDetents([.medium, .large])
        }
        .alert("Couldn't sign in", isPresented: Binding(get: { errorText != nil }, set: { if !$0 { errorText = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorText ?? "")
        }
    }

    private func run(_ work: @escaping () async throws -> Void) {
        Task {
            busy = true
            defer { busy = false }
            do { try await work() } catch { errorText = friendlyAuthMessage(error) }
        }
    }
}

// MARK: Email

struct EmailAuthSheet: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State var startInSignIn: Bool
    @State private var email = ""
    @State private var password = ""
    @State private var busy = false
    @State private var message: String?
    @FocusState private var focus: Field?
    enum Field { case email, password }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .focused($focus, equals: .email)
                        .submitLabel(.next)
                        .onSubmit { focus = .password }
                    SecureField("Password", text: $password)
                        .textContentType(startInSignIn ? .password : .newPassword)
                        .focused($focus, equals: .password)
                        .submitLabel(.go)
                        .onSubmit(submit)
                } footer: {
                    if let message { Text(message) }
                }

                Section {
                    Button(startInSignIn ? "Sign in" : "Create account", action: submit)
                        .disabled(email.isEmpty || password.count < 6 || busy)
                    if startInSignIn {
                        Button("Forgot password?") {
                            Task {
                                do {
                                    try await session.sendPasswordReset(email: email)
                                    message = "If there's an account for that email, a reset link is on its way."
                                } catch { message = friendlyAuthMessage(error) }
                            }
                        }
                        .disabled(email.isEmpty)
                    }
                    Button(startInSignIn ? "New here? Create an account" : "Have an account? Sign in") {
                        startInSignIn.toggle()
                        message = nil
                    }
                }
            }
            .navigationTitle(startInSignIn ? "Sign in" : "Create account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
            .onAppear { focus = .email }
        }
    }

    private func submit() {
        guard !busy else { return }
        Task {
            busy = true
            defer { busy = false }
            do {
                if startInSignIn { try await session.signIn(email: email, password: password) }
                else { try await session.createAccount(email: email, password: password) }
                dismiss()
            } catch {
                message = friendlyAuthMessage(error)
            }
        }
    }
}
