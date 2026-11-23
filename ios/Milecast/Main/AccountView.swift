import SwiftUI
import PhotosUI
import StoreKit

/// Profile, plan and sign-out. Changes save to the shared profile, so they
/// show up on the website too.
struct AccountView: View {
    @Environment(Session.self) private var session
    @Environment(StoreEntitlements.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var pickerItem: PhotosPickerItem?
    @State private var uploading = false
    @State private var paywall = false
    @State private var manageSubs = false
    @State private var confirmDelete = false
    @State private var errorText: String?

    var body: some View {
        @Bindable var session = session
        NavigationStack {
            Form {
                Section {
                    HStack(spacing: 16) {
                        PhotosPicker(selection: $pickerItem, matching: .images) {
                            AvatarView(profile: session.profile, size: 72)
                                .overlay(alignment: .bottomTrailing) {
                                    Image(systemName: uploading ? "arrow.up.circle.fill" : "camera.circle.fill")
                                        .symbolRenderingMode(.palette)
                                        .foregroundStyle(.white, Color.mileRiver)
                                        .font(.title2)
                                        .symbolEffect(.pulse, isActive: uploading)
                                }
                        }
                        .accessibilityLabel("Change profile photo")
                        VStack(alignment: .leading, spacing: 2) {
                            Text(session.profile.fullName).font(.title3.weight(.semibold))
                            if let email = session.user?.email { Text(email).font(.subheadline).foregroundStyle(.secondary) }
                        }
                    }
                    .listRowBackground(Color.clear)
                }

                Section("Name") {
                    TextField("First name", text: $session.profile.firstName).textContentType(.givenName)
                    TextField("Last name", text: $session.profile.lastName).textContentType(.familyName)
                }

                Section {
                    TextField("Town or ZIP", text: Binding(
                        get: { session.profile.fishing.homeBase ?? "" },
                        set: { session.profile.fishing.homeBase = $0.isEmpty ? nil : String($0.prefix(80)) }))
                        .textContentType(.addressCity)
                } header: {
                    Text("Driving from")
                } footer: {
                    Text("Used later for drive times and \"worth the trip\" alerts.")
                }

                Section("How you fish") {
                    NavigationLink {
                        FishingEditor()
                    } label: {
                        LabeledContent("Methods", value: session.profile.fishing.methods.map(\.label).joined(separator: ", ").ifEmpty("Not set"))
                    }
                    Toggle("Guide or outfitter", isOn: $session.profile.fishing.isGuide)
                }

                Section("Notifications") {
                    Toggle("Flow changes", isOn: $session.profile.alerts.flow)
                    Toggle("Calm windows", isOn: $session.profile.alerts.calm)
                    Toggle("Lightning nearby", isOn: $session.profile.alerts.lightning)
                    Toggle("Weekend outlook", isOn: $session.profile.alerts.outlook)
                }

                Section("Plan") {
                    if session.profile.isOne || store.ownsOne {
                        LabeledContent("Milecast One", value: "Active")
                        if store.ownsOne { Button("Manage subscription") { manageSubs = true } }
                    } else {
                        LabeledContent("Plan", value: "Free")
                        Button("Get Milecast One") { paywall = true }
                    }
                    Button("Restore purchases") { Task { try? await AppStore.sync(); await store.refresh() } }
                }

                Section {
                    Button("Sign out") { session.signOut(); dismiss() }
                    Button("Delete account", role: .destructive) { confirmDelete = true }
                } footer: {
                    Text("Milecast is a product of Summit Labs.")
                }
            }
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        Task {
                            do { try await session.saveProfile(); dismiss() } catch { errorText = error.localizedDescription }
                        }
                    }
                    .disabled(session.profile.firstName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .onChange(of: pickerItem) { _, item in
                guard let item, let uid = session.user?.uid else { return }
                Task {
                    uploading = true
                    defer { uploading = false }
                    do {
                        guard let data = try await item.loadTransferable(type: Data.self), let image = UIImage(data: data) else {
                            throw AvatarUploader.Failure.unreadable
                        }
                        let jpeg = try AvatarUploader.prepare(image)
                        let url = try await AvatarUploader.upload(jpeg, uid: uid)
                        session.profile.photoURL = url.absoluteString
                        try await session.saveProfile()
                    } catch { errorText = error.localizedDescription }
                }
            }
            .sheet(isPresented: $paywall) { PaywallView() }
            .manageSubscriptionsSheet(isPresented: $manageSubs)
            .confirmationDialog("Delete your account?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Delete account", role: .destructive) {
                    Task {
                        do { try await session.deleteAccount(); dismiss() } catch { errorText = error.localizedDescription }
                    }
                }
            } message: {
                Text("This removes your profile and photo on the app and website. App Store subscriptions are managed separately in Settings.")
            }
            .alert("Something went wrong", isPresented: Binding(get: { errorText != nil }, set: { if !$0 { errorText = nil } })) {
                Button("OK", role: .cancel) {}
            } message: { Text(errorText ?? "") }
        }
    }
}

private struct FishingEditor: View {
    @Environment(Session.self) private var session

    var body: some View {
        @Bindable var session = session
        Form {
            Section("Mostly fishing with") {
                ForEach(Profile.Method.allCases) { m in
                    Toggle(m.label, isOn: Binding(
                        get: { session.profile.fishing.methods.contains(m) },
                        set: { _ in session.profile.fishing.methods.toggle(m) }))
                }
            }
            Section("On the water by") {
                ForEach(Profile.Style.allCases) { s in
                    Toggle(s.label, isOn: Binding(
                        get: { session.profile.fishing.styles.contains(s) },
                        set: { _ in session.profile.fishing.styles.toggle(s) }))
                }
            }
            Picker("Fishing for", selection: $session.profile.fishing.experience) {
                Text("Not set").tag(Profile.Experience?.none)
                ForEach(Profile.Experience.allCases) { Text($0.label).tag(Optional($0)) }
            }
            Picker("On the Mile", selection: $session.profile.fishing.frequency) {
                Text("Not set").tag(Profile.Frequency?.none)
                ForEach(Profile.Frequency.allCases) { Text($0.label).tag(Optional($0)) }
            }
        }
        .navigationTitle("How you fish")
    }
}

extension String {
    func ifEmpty(_ fallback: String) -> String { isEmpty ? fallback : self }
}
