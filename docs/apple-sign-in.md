# Setting up Sign in with Apple

The site already has the **Continue with Apple** button (Firebase `apple.com` provider).
Until the steps below are done, clicking it shows "That sign-in method isn't turned on yet."

You need a paid Apple Developer Program membership.

## 1. Apple Developer: App ID

developer.apple.com → Certificates, Identifiers & Profiles → **Identifiers** → **+**

- Type: **App IDs** → App
- Description: `The Mile`
- Bundle ID (explicit): e.g. `one.summitlabs.themile` (reuse this for a future iOS app)
- Capabilities: tick **Sign in with Apple** → Continue → Register

## 2. Apple Developer: Services ID (the web "client ID")

Identifiers → **+** → **Services IDs**

- Description: `The Mile Web`
- Identifier: e.g. `one.summitlabs.themile.web` ← this is the **Services ID**
- Register, then open it, tick **Sign in with Apple** → **Configure**:
  - Primary App ID: the App ID from step 1
  - Domains and Subdomains: `the-mile-2c303.firebaseapp.com`
  - Return URLs: `https://the-mile-2c303.firebaseapp.com/__/auth/handler`
  - Next → Done → Continue → **Save**

## 3. Apple Developer: private key

**Keys** → **+**

- Name: `The Mile Sign in with Apple`
- Tick **Sign in with Apple** → Configure → choose the App ID from step 1 → Save
- Continue → Register → **Download** the `.p8` file (you can only download it once)
- Note the **Key ID** shown on that page

Your **Team ID** is in the top right of the developer site (or Membership details).

## 4. Firebase console

Authentication → Sign-in method → **Add new provider** → **Apple** → Enable

- Services ID: from step 2 (`one.summitlabs.themile.web`)
- OAuth code flow configuration:
  - Apple team ID: from step 3
  - Key ID: from step 3
  - Private key: open the `.p8` in a text editor and paste all of it, including the BEGIN/END lines
- Save

Authentication → Settings → **Authorized domains** should already include `themile.summitlabs.one`.

## 5. Email relay (so emails reach "Hide My Email" users)

Apple users can hide their email behind `@privaterelay.appleid.com`. Apple only forwards mail
from senders you register:

developer.apple.com → Certificates, Identifiers & Profiles → **Services** → Sign in with Apple
for Email Communication → **Configure** → add the address Firebase sends from. By default
that's `noreply@the-mile-2c303.firebaseapp.com` (check Authentication → Templates for the
exact sender). Register the domain `the-mile-2c303.firebaseapp.com` too if asked.

## Notes

- Apple only sends the user's name the first time they sign in, and Firebase doesn't store it
  on the web, so Apple users appear by email (or initials) in the account menu.
- If someone already has an account under the same email via Google or a password, Apple
  sign-in is refused with "You already have an account with that email using a different
  sign-in method." Firebase can link providers later if you want one account per person.
