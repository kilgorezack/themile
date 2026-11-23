# Milecast for iOS

SwiftUI app for iOS 26 (Liquid Glass). Same Firebase project and accounts as
themile.summitlabs.one. Home and Conditions read the website's `/api/summary`,
so the verdict and best window always match the site.

```
Milecast/
  App/         MilecastApp (Firebase setup), RootView (loading / signed out / setup / app)
  Core/        Session (auth + profile), Profile, AvatarUploader, SummaryAPI,
               Sites, StoreEntitlements, Theme
  Onboarding/  SignedOutFlow (welcome, Apple / Google / email),
               ProfileSetupFlow (name, photo, how you fish, alerts)
  Main/        MainTabView, Home, Conditions, Dashboard, Map, Account, Paywall,
               LandscapeView, Components
```

## Add it to the Xcode project

1. Drag the `Milecast/App`, `Core`, `Onboarding` and `Main` folders into the
   project navigator (Copy items if needed, Create groups, app target checked).
   Delete the template's `ContentView.swift` and its `@main` App file
   (`App/MilecastApp.swift` replaces it).
2. Target → General: iOS 26.0 minimum deployment.
3. Swift Packages (File → Add Package Dependencies):
   - `https://github.com/firebase/firebase-ios-sdk`: FirebaseAuth,
     FirebaseFirestore, FirebaseStorage (FirebaseAnalytics optional)
   - `https://github.com/google/GoogleSignIn-iOS`: GoogleSignIn
4. Firebase console → Project settings → Add app → iOS with your bundle ID.
   Download `GoogleService-Info.plist` and add it to the target.
5. Target → Info → URL Types: add one with URL Schemes set to the
   `REVERSED_CLIENT_ID` value from `GoogleService-Info.plist` (Google sign-in).
6. Target → Signing & Capabilities → add **Sign in with Apple**,
   **Push Notifications**, **Time Sensitive Notifications** and **In-App Purchase**.
7. Info.plist keys:
   - `NSCameraUsageDescription`: "Take a profile photo."
   - `NSLocationWhenInUseUsageDescription`: "Show where you are on the map."
8. Assets: add an image set **AppIconImage** (a copy of the icon artwork, used
   in onboarding and the paywall) and **GoogleG** (Google's "G" logo, template
   rendering off).
9. App Store Connect → the app → Subscriptions: one group with
   `one.milecast.monthly` ($4.99) and `one.milecast.yearly` ($29.99). For local
   testing, add a StoreKit Configuration file with the same IDs and select it in
   the scheme's Run options.

## Firebase

- Authentication: Apple, Google and Email/Password are already on for the web.
  Native Sign in with Apple uses the bundle ID, so nothing else is needed there.
- Storage: enable it in the console (Build → Storage) if it isn't yet.
- Deploy the rules from the repo root:

  ```bash
  firebase deploy --only firestore:rules,storage
  ```

## Data model

`users/{uid}` (Firestore), shared with the website:

| field | notes |
| --- | --- |
| `firstName`, `lastName`, `displayName`, `email` | from onboarding / sign-in |
| `photoURL` | download URL of `users/{uid}/avatar.jpg` in Storage |
| `fishing.methods` | `fly`, `spin`, `bait` |
| `fishing.styles` | `wade`, `boat`, `bank` |
| `fishing.experience` / `frequency` | `new/some/lifer`, `few/monthly/weekly` |
| `fishing.isGuide`, `fishing.homeBase` | guide flag, "driving from" (≤ 80 chars) |
| `alerts.flow/calm/lightning/outlook` | notification choices |
| `plan` | set only by the server (rules block clients from writing it) |
| `createdVia`, `createdAt`, `updatedAt`, `onboardedAt` | bookkeeping |

Profile photos are center-cropped to a square, resized to 512 × 512 and saved
as JPEG at the highest quality that fits in 300 KB. Storage rules accept only
`image/jpeg` under 1 MB at the owner's own path.

## Not done yet

- Alert delivery needs a server job (Cloud Functions + APNs) that reads
  `alerts` and sends pushes; the app only records the choices and asks permission.
- App Store purchases unlock One on the device right away. To unlock the
  website too, a server needs to verify App Store notifications and set `plan`.
