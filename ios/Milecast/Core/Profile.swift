import Foundation

/// Firestore `users/{uid}`, shared with the website. Field names and allowed
/// values must match `firestore.rules` in the repo root.
struct Profile: Codable, Equatable {
    var firstName: String = ""
    var lastName: String = ""
    var displayName: String?
    var email: String?
    var photoURL: String?
    var fishing = Fishing()
    var alerts = Alerts()
    /// Set by the server only ("free" | "one"). Never written by the app.
    var plan: String?
    var createdVia: String?
    var onboardedAt: Date?

    struct Fishing: Codable, Equatable {
        var methods: [Method] = []
        var styles: [Style] = []
        var experience: Experience?
        var frequency: Frequency?
        var isGuide = false
        var homeBase: String?
    }

    struct Alerts: Codable, Equatable {
        var flow = true
        var calm = true
        var lightning = true
        var outlook = false
    }

    enum Method: String, Codable, CaseIterable, Identifiable {
        case fly, spin, bait
        var id: String { rawValue }
        var label: String {
            switch self {
            case .fly: "Fly"
            case .spin: "Spin & lures"
            case .bait: "Bait"
            }
        }
    }

    enum Style: String, Codable, CaseIterable, Identifiable {
        case wade, boat, bank
        var id: String { rawValue }
        var label: String {
            switch self {
            case .wade: "Wading"
            case .boat: "Drift boat"
            case .bank: "From the bank"
            }
        }
    }

    enum Experience: String, Codable, CaseIterable, Identifiable {
        case new, some, lifer
        var id: String { rawValue }
        var label: String {
            switch self {
            case .new: "New to it"
            case .some: "A few seasons"
            case .lifer: "A lifetime"
            }
        }
    }

    enum Frequency: String, Codable, CaseIterable, Identifiable {
        case few, monthly, weekly
        var id: String { rawValue }
        var label: String {
            switch self {
            case .few: "A few times a year"
            case .monthly: "Monthly"
            case .weekly: "Weekly or more"
            }
        }
    }

    var fullName: String {
        [firstName, lastName].map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }.joined(separator: " ")
    }

    var initials: String {
        let letters = [firstName.first, lastName.first].compactMap { $0 }
        return letters.isEmpty ? "?" : String(letters).uppercased()
    }

    var isOne: Bool { plan == "one" }
}
