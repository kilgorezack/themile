import SwiftUI
import PhotosUI
import UserNotifications

/// Name → photo → how you fish → alerts. Everything is saved to the shared
/// profile at the end; the photo uploads as soon as it's chosen.
struct ProfileSetupFlow: View {
    @State private var path: [Step] = []
    enum Step: Hashable { case photo, fishing, alerts }

    var body: some View {
        NavigationStack(path: $path) {
            NameStep { path.append(.photo) }
                .navigationDestination(for: Step.self) { step in
                    switch step {
                    case .photo: PhotoStep { path.append(.fishing) }
                    case .fishing: FishingStep { path.append(.alerts) }
                    case .alerts: AlertsStep()
                    }
                }
        }
    }
}

// MARK: Name

struct NameStep: View {
    @Environment(Session.self) private var session
    let next: () -> Void
    @FocusState private var focus: Int?

    var body: some View {
        @Bindable var session = session
        OnboardingStep(step: 2, title: "What should we call you?", subtitle: "We filled in what your sign-in shared. Change it if you like.") {
            VStack(spacing: 0) {
                TextField("First name", text: $session.profile.firstName)
                    .textContentType(.givenName)
                    .focused($focus, equals: 0)
                    .submitLabel(.next)
                    .onSubmit { focus = 1 }
                    .padding(.horizontal, 16).frame(minHeight: 52)
                Divider().padding(.leading, 16)
                TextField("Last name", text: $session.profile.lastName)
                    .textContentType(.familyName)
                    .focused($focus, equals: 1)
                    .submitLabel(.continue)
                    .onSubmit(next)
                    .padding(.horizontal, 16).frame(minHeight: 52)
            }
            .background(Color.mileCard, in: .rect(cornerRadius: 16))

            HStack(spacing: 14) {
                AvatarView(profile: session.profile, size: 48)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Tight lines, \(session.profile.firstName.isEmpty ? "friend" : session.profile.firstName).")
                        .font(.verdict(.title2))
                        .contentTransition(.interpolate)
                    Text("This is how you'll show up on the app and website.")
                        .font(.footnote).opacity(0.8)
                }
            }
            .foregroundStyle(Color.mileCream)
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.mileRiverDeep, in: .rect(cornerRadius: 18))
            .animation(.smooth, value: session.profile.firstName)
        } actions: {
            PrimaryButton(title: "Continue", disabled: session.profile.firstName.trimmingCharacters(in: .whitespaces).isEmpty, action: next)
        }
        .onAppear { if session.profile.firstName.isEmpty { focus = 0 } }
    }
}

// MARK: Photo

struct PhotoStep: View {
    @Environment(Session.self) private var session
    let next: () -> Void

    @State private var pickerItem: PhotosPickerItem?
    @State private var preview: UIImage?
    @State private var uploading = false
    @State private var showCamera = false
    @State private var errorText: String?

    var body: some View {
        OnboardingStep(step: 3, title: "Add a profile photo", subtitle: "A grip-and-grin works. So does your dog.", onSkip: next) {
            VStack(spacing: 14) {
                ZStack(alignment: .bottomTrailing) {
                    if preview != nil || session.profile.photoURL != nil {
                        AvatarView(profile: session.profile, size: 180, localImage: preview)
                            .overlay(Circle().stroke(.white, lineWidth: 5))
                            .transition(.scale.combined(with: .opacity))
                    } else {
                        Circle()
                            .strokeBorder(style: StrokeStyle(lineWidth: 2.5, dash: [7, 6]))
                            .foregroundStyle(.secondary)
                            .background(Circle().fill(Color.mileCard))
                            .overlay(Image(systemName: "camera").font(.system(size: 40)).foregroundStyle(Color.mileRiver))
                            .frame(width: 180, height: 180)
                    }
                    if uploading {
                        ProgressView().padding(10).glassEffect(in: .circle)
                    }
                }
                .frame(maxWidth: .infinity)
                .animation(.spring(duration: 0.5, bounce: 0.4), value: preview)

                Text(preview == nil ? "Shown on your account here and on the website. Change it anytime." : "Cropped to a square and shrunk to a small file before it uploads.")
                    .font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
            }
        } actions: {
            if session.profile.photoURL != nil && !uploading {
                PrimaryButton(title: "Looks good", action: next)
            }
            PhotosPicker(selection: $pickerItem, matching: .images, photoLibrary: .shared()) {
                Label(session.profile.photoURL == nil ? "Choose from Photos" : "Choose another", systemImage: "photo.on.rectangle")
                    .font(.headline).frame(maxWidth: .infinity, minHeight: 50)
            }
            .buttonStyle(session.profile.photoURL == nil ? AnyPrimitiveButtonStyle(.glassProminent) : AnyPrimitiveButtonStyle(.glass))
            if UIImagePickerController.isSourceTypeAvailable(.camera) {
                Button { showCamera = true } label: {
                    Label("Take a photo", systemImage: "camera").font(.headline).frame(maxWidth: .infinity, minHeight: 50)
                }
                .buttonStyle(.glass)
            }
        }
        .disabled(uploading)
        .onChange(of: pickerItem) { _, item in
            guard let item else { return }
            Task {
                guard let data = try? await item.loadTransferable(type: Data.self), let image = UIImage(data: data) else {
                    errorText = AvatarUploader.Failure.unreadable.errorDescription
                    return
                }
                await upload(image)
            }
        }
        .fullScreenCover(isPresented: $showCamera) {
            CameraPicker { image in Task { await upload(image) } }.ignoresSafeArea()
        }
        .alert("Photo didn't upload", isPresented: Binding(get: { errorText != nil }, set: { if !$0 { errorText = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(errorText ?? "") }
    }

    private func upload(_ image: UIImage) async {
        guard let uid = session.user?.uid else { return }
        uploading = true
        defer { uploading = false }
        do {
            let jpeg = try AvatarUploader.prepare(image)
            preview = UIImage(data: jpeg)
            let url = try await AvatarUploader.upload(jpeg, uid: uid)
            session.profile.photoURL = url.absoluteString
        } catch {
            preview = nil
            errorText = error.localizedDescription
        }
    }
}

/// Type-erased button style so the picker can switch between glass styles.
struct AnyPrimitiveButtonStyle: PrimitiveButtonStyle {
    private let make: (Configuration) -> AnyView
    init<S: PrimitiveButtonStyle>(_ style: S) { make = { AnyView(style.makeBody(configuration: $0)) } }
    func makeBody(configuration: Configuration) -> some View { make(configuration) }
}

/// The camera, via UIKit's picker (SwiftUI has no camera view).
struct CameraPicker: UIViewControllerRepresentable {
    let onImage: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.cameraDevice = .front
        picker.delegate = context.coordinator
        return picker
    }
    func updateUIViewController(_ controller: UIImagePickerController, context: Context) {}
    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPicker
        init(_ parent: CameraPicker) { self.parent = parent }
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage { parent.onImage(image) }
            parent.dismiss()
        }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { parent.dismiss() }
    }
}

// MARK: How you fish

struct FishingStep: View {
    @Environment(Session.self) private var session
    let next: () -> Void

    var body: some View {
        @Bindable var session = session
        OnboardingStep(step: 4, title: "How do you fish the Mile, \(session.profile.firstName)?", onSkip: next) {
            Question("Mostly fishing with") {
                ForEach(Profile.Method.allCases) { m in
                    Chip(label: m.label, selected: session.profile.fishing.methods.contains(m)) {
                        session.profile.fishing.methods.toggle(m)
                    }
                }
            }
            Question("On the water by") {
                ForEach(Profile.Style.allCases) { s in
                    Chip(label: s.label, selected: session.profile.fishing.styles.contains(s)) {
                        session.profile.fishing.styles.toggle(s)
                    }
                }
            }
            Question("Fishing for") {
                ForEach(Profile.Experience.allCases) { e in
                    Chip(label: e.label, selected: session.profile.fishing.experience == e) { session.profile.fishing.experience = e }
                }
            }
            Question("On the Mile") {
                ForEach(Profile.Frequency.allCases) { f in
                    Chip(label: f.label, selected: session.profile.fishing.frequency == f) { session.profile.fishing.frequency = f }
                }
            }
            Toggle("I'm a guide or outfitter", isOn: $session.profile.fishing.isGuide)
                .padding(.horizontal, 16).frame(minHeight: 52)
                .background(Color.mileCard, in: .rect(cornerRadius: 16))
        } actions: {
            PrimaryButton(title: "Continue", action: next)
        }
    }

    private struct Question<C: View>: View {
        let title: String
        @ViewBuilder let chips: () -> C
        init(_ title: String, @ViewBuilder chips: @escaping () -> C) { self.title = title; self.chips = chips }
        var body: some View {
            VStack(alignment: .leading, spacing: 10) {
                Text(title).font(.subheadline.weight(.semibold))
                FlowLayout { chips() }
            }
        }
    }
}

extension Array where Element: Equatable {
    mutating func toggle(_ item: Element) {
        if let i = firstIndex(of: item) { remove(at: i) } else { append(item) }
    }
}

// MARK: Alerts

struct AlertsStep: View {
    @Environment(Session.self) private var session
    @State private var saving = false
    @State private var errorText: String?

    var body: some View {
        @Bindable var session = session
        OnboardingStep(step: 5, title: "Want a heads-up?", subtitle: "Only when it matters. Pick what to hear about.") {
            VStack(spacing: 0) {
                AlertRow(symbol: "drop.fill", tint: .mileRiver, title: "Flow changes", detail: "Kortes release moves 100+ cfs", isOn: $session.profile.alerts.flow)
                Divider().padding(.leading, 60)
                AlertRow(symbol: "wind", tint: .mileSlate, title: "Calm windows", detail: "Wind under 10 mph in daylight", isOn: $session.profile.alerts.calm)
                Divider().padding(.leading, 60)
                AlertRow(symbol: "bolt.fill", tint: .red, title: "Lightning nearby", detail: "Time Sensitive · within 10 miles", isOn: $session.profile.alerts.lightning)
                Divider().padding(.leading, 60)
                AlertRow(symbol: "calendar", tint: .mileOchre, title: "Weekend outlook", detail: "Fridays at 6 PM", isOn: $session.profile.alerts.outlook)
            }
            .background(Color.mileCard, in: .rect(cornerRadius: 16))
        } actions: {
            PrimaryButton(title: "Turn on notifications", busy: saving) { finish(requestNotifications: true) }
            Button("Not now") { finish(requestNotifications: false) }
                .font(.subheadline.weight(.medium)).frame(minHeight: 44)
        }
        .alert("Couldn't save", isPresented: Binding(get: { errorText != nil }, set: { if !$0 { errorText = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(errorText ?? "") }
    }

    private func finish(requestNotifications: Bool) {
        Task {
            saving = true
            defer { saving = false }
            if requestNotifications {
                _ = try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
            }
            do { try await session.saveProfile(finishingOnboarding: true) } catch { errorText = error.localizedDescription }
        }
    }

    private struct AlertRow: View {
        let symbol: String
        let tint: Color
        let title: String
        let detail: String
        @Binding var isOn: Bool
        var body: some View {
            Toggle(isOn: $isOn) {
                HStack(spacing: 12) {
                    Image(systemName: symbol)
                        .foregroundStyle(.white)
                        .frame(width: 32, height: 32)
                        .background(tint, in: .rect(cornerRadius: 9))
                    VStack(alignment: .leading, spacing: 1) {
                        Text(title)
                        Text(detail).font(.footnote).foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.horizontal, 16).frame(minHeight: 64)
        }
    }
}
