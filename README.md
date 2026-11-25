# The Mile

Live fishing conditions for the **Miracle Mile** of the North Platte River, Wyoming — between Kortes Dam and Pathfinder Reservoir.

Built with Next.js (App Router) and deployed on Vercel.

## What's on the page

| Section | Source |
| --- | --- |
| Hero verdict + stats | Derived from everything below (`lib/verdict.ts`) |
| Station (wind, air, barometer, rain, UV, solar, lightning) | **Tempest** → Weather Underground → nearest NWS station (Rawlins) as fallback |
| Kortes Dam release (the Mile's flow), reservoir storage | USBR Great Plains Hydromet (`KORR QD`, `SEMR AF/FB`, `PATR AF/FB`) |
| Upstream inflow | USGS 06630000, North Platte above Seminoe |
| 36-hour wind + 7-day forecast | Tempest station forecast, or NWS gridpoint CYS/44,68 |
| Sun, moon, solunar periods | Computed locally with `suncalc` |
| Hatch calendar | `lib/hatches.ts` (edit freely) |

The page renders on the server (re-generated every 2 minutes) and the browser polls `/api/conditions` every minute and `/api/water` every 30 minutes.

## Pages

| Path | What |
| --- | --- |
| `/` | Home (public): verdict, six key metrics, "Today on the Mile" timeline with a computed best window (`lib/bestWindow.ts`), water / 3-day / hatch summaries |
| `/conditions` | Members: the full scrolling conditions report |
| `/dashboard` | Customizable tile dashboard (show/hide, reorder, resize). Layout lives in `lib/dashboard/layout.ts`; today it's saved per browser via `browserLayoutStore`, and a Firestore-backed `LayoutStore` can drop in once Firebase Auth gates the page. |
| `/map` | Pan/zoom map from Seminoe to Alcova with layer toggles. Dams (USBR Hydromet: release, inflow, storage, elevation) and USGS gauges; tap a site for history. `?site=<id>` deep-links (ids in `lib/sites.ts`). Field map / Satellite switch; satellite uses Apple MapKit JS (setup: `docs/apple-maps.md`). |
| `/pricing` | Plans: Free (Home, Conditions, Low-data) and Milecast One ($4.99/mo or $29.99/yr: dashboard, field map, satellite). Checkout not wired yet. |
| `/lite` | Low-data page (below) |

Map geometry (`lib/regionGeo.ts`, `lib/mileGeo.ts`) is generated from USGS NHD waterbodies and NLDI flowlines.

## Accounts

Firebase Auth (Google + email/password) via `components/auth/`. The **Sign in** button / account menu sits top right; `/conditions`, `/dashboard` and `/map` show a sign-in prompt until you're signed in (`RequireAuth`). The gate is client-side, which is fine for the public data on those pages; anything private later should also be checked server-side or with Firestore Security Rules.

Firebase console setup: Authentication → Settings → **Authorized domains** must include the production domain (and any Vercel preview domains you test sign-in on).

## Analytics

Microsoft Clarity and Firebase (Analytics) load on the full site via `app/layout.tsx`. Firebase config is in `lib/firebase.ts`; those values are public identifiers, so access control belongs in Firebase Auth + Security Rules. `/lite` loads neither.

## Low-data page

`/lite` (linked from the footer, `noindex`) is a backup for one-bar cell service: plain server-rendered HTML with no JavaScript, fonts or images (~1.5 KB gzipped). It shows current wind/air/pressure/flow, a lightning warning, the next 12 hours, three days, and light/solunar times. `/lite?auto` adds a 5-minute auto-refresh.

## Environment variables (set in Vercel → Project → Settings → Environment Variables)

| Name | What |
| --- | --- |
| `TEMPEST_TOKEN` | Personal access token from tempestwx.com → Settings → Data Authorizations |
| `TEMPEST_STATION_ID` | The number in your `tempestwx.com/station/<ID>` URL |
| `WU_API_KEY` | *(optional fallback)* Weather Underground PWS API key |
| `WU_STATION_ID` | *(optional fallback)* Your PWS ID, e.g. `KWYSINCL12` |
| `NWS_CONTACT` | *(optional)* contact string sent to api.weather.gov in the User-Agent |

Keys are only ever used server-side; nothing is exposed to the browser. With no keys set the site still works using the nearest NWS observation station.

## App Store subscriptions (Cloud Functions)

Milecast One bought in the iOS app sets `plan: "one"` on the profile, so it
works here too. `functions/src/appStore.ts`:

- `verifyAppStorePurchase` runs when the app writes
  `users/{uid}/subscriptions/appStore`: checks Apple's signature, the product,
  and that the purchase was made with this account, then sets `plan`.
- `appStoreNotifications` receives App Store Server Notifications V2
  (renewals, expiries, refunds).
- `expireLapsedPlans` checks lapsed subscriptions with Apple once a day.

Everything is logged in Firestore (server-only): `appStoreSubscriptions/{originalTransactionId}`
(current state), `appStoreEvents` (every purchase, renewal, notification and
plan change) and `appStoreAccountTokens` (matches notifications to accounts).

Setup, once:

1. App Store Connect → Users and Access → Integrations → In-App Purchase:
   generate a key. Then store it:
   ```bash
   firebase functions:secrets:set APP_STORE_ISSUER_ID
   firebase functions:secrets:set APP_STORE_KEY_ID
   firebase functions:secrets:set APP_STORE_PRIVATE_KEY < SubscriptionKey_XXXXXXXXXX.p8
   ```
2. `firebase deploy --only functions` asks for `APP_STORE_APP_APPLE_ID`: the
   number under App Store Connect → the app → App Information → Apple ID.
3. App Store Connect → the app → App Information → App Store Server
   Notifications: set the Production and Sandbox URLs to the deployed
   `appStoreNotifications` URL (Version 2).

Sandbox purchases (TestFlight, App Review) count too, so the whole flow can be
tested before launch. Purchases from Xcode's local StoreKit testing are logged
but never grant anything.

## Local development

```bash
cp .env.example .env.local   # fill in keys
npm install
npm run dev
```

## Tuning

- Flow bands ("Prime wading" etc.): `FLOW_BANDS` in `lib/config.ts`
- Verdict rules: `lib/verdict.ts`
- Location, gauge IDs, reservoir capacities: `lib/config.ts`

## Screenshots

![Hero](docs/screenshots/desk-light-hero.png)

Full page: [light](docs/screenshots/desk-light-full.png) · [dark](docs/screenshots/desk-dark-full.png) · [phone](docs/screenshots/phone-hero.png)
