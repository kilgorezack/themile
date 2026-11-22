# Turning on the satellite map (Apple Maps / MapKit JS)

The Map page's **Satellite** option uses Apple Maps. Until a key is added it says
"Satellite view isn't switched on yet." You'll reuse the same Apple Developer account
as Sign in with Apple.

## 1. Make a Maps ID

developer.apple.com/account → Certificates, IDs & Profiles → **Identifiers** → **+**
→ choose **Maps IDs** → Continue.

- Description: `The Mile Maps`
- Identifier: `maps.one.summitlabs.themile`
- Continue → Register

## 2. Make a key for it

**Keys** → **+**

- Key name: `The Mile Maps`
- Tick **MapKit JS** → **Configure** → pick the Maps ID from step 1 → Save
- Continue → Register → **Download** the `.p8` file (only downloadable once)
- Note the **Key ID** on that page

## 3. Add three settings in Vercel

Vercel → the project → Settings → **Environment Variables**. Add:

| Name | Value |
| --- | --- |
| `APPLE_MAPKIT_TEAM_ID` | Your Team ID (same one used for Sign in with Apple) |
| `APPLE_MAPKIT_KEY_ID` | The Key ID from step 2 |
| `APPLE_MAPKIT_PRIVATE_KEY` | Open the `.p8` in a text editor and paste all of it, including the BEGIN/END lines |

Then **redeploy** (Deployments → ⋯ → Redeploy) so the site picks them up.

The key stays on the server; browsers only ever get a 30-minute token from `/api/mapkit-token`.

(Alternative: if you generate a MapKit JS token in Apple's portal instead, put it in
`APPLE_MAPKIT_TOKEN` and skip the three above. Those tokens expire, so the key route is
less upkeep.)
