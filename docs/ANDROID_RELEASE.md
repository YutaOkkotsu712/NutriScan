# ZOCO Android App — Build & Play Store Release (Capacitor)

The Android (and later iOS) app is the existing web app bundled inside a
native Capacitor shell, with **native ML Kit barcode scanning** replacing the
browser camera — much better on low-end phones and in dim light. This
supersedes the TWA path in `TWA_PUBLISHING.md` (kept for reference; the Play
listing/signing/store steps there still apply and are cross-referenced below).

**Decide before first upload (permanent):** the application id is
`com.zoco.app` in `capacitor.config.json` + `android/app/build.gradle`. It can
be changed freely NOW, never after the first Play upload.

## Play-policy decisions baked into the app (2026-07)

- **Website-only billing.** Google Play forbids selling digital subscriptions
  in-app outside Play Billing, and also forbids "steering" users to an
  external purchase page. So when running natively (`isNativeApp()` in
  `src/utils/platform.js`), PaywallScreen and AccountScreen show membership
  status but **no subscribe button and no purchase link** — only the neutral
  line "Membership can't be purchased in this app" (`auth.webOnlyPurchase`).
  Users subscribe on the website; the same account is then a member in the app.
  Do NOT add wording that tells users to go to the website to pay — that is a
  steering violation. Play Billing can be added later if conversion suffers.
- **Google sign-in is hidden on native** (OAuth popups can't open in a
  WebView); email/password works everywhere. Native Google sign-in via
  `@capacitor-firebase/authentication` is a follow-up.
- **Account deletion (hard Play requirement for apps with sign-up):** in-app
  via Account → Delete account (`POST /api/me/delete` wipes the scan meter +
  subscription records and cancels active Razorpay billing, then the Firebase
  user is deleted client-side). The public deletion-instructions URL for the
  Play Console form is `https://zocolabel.com/privacy.html#delete-account`.
- **Privacy policy URL** (required in the listing): `https://zocolabel.com/privacy.html`
  (ships from `public/privacy.html` — update the contact email there if needed).

## How the pieces fit

- Web assets are **bundled in the APK** (`webDir: dist`), so the app works
  without loading a remote page. API calls therefore need an absolute backend
  URL: `VITE_API_BASE` (baked in at build time).
- The backend answers the app's cross-origin calls via `api/_lib/cors.js`
  (Capacitor origins allowed; auth still required — CORS is not a security
  gate here, the Firebase token is).
- Scanning: on native, `BarcodeScanner.jsx` uses `@capacitor-mlkit/barcode-scanning`
  (one-shot native scanner UI); on web it keeps html5-qrcode. Both feed the
  same `extractBarcode` validation.
- **Unlike a TWA, web deploys do NOT auto-update the app** — after meaningful
  web changes, rebuild and re-upload the app bundle (or plan a later switch to
  a remote-url shell if instant updates matter more than offline robustness).

## Prerequisites (one time)

1. **Android Studio** (installs the Android SDK + JDK): https://developer.android.com/studio
2. The backend deployed on Vercel with ALL env vars set (see `.env.example`),
   because the app talks to it in production.

## Build an APK to test on your phone

```bash
# 1. Build the web assets pointing at the deployed backend
VITE_API_BASE=https://zocolabel.com npm run build

# 2. Copy them into the native project
npx cap sync android

# 3. Open in Android Studio, or build from CLI:
npx cap open android          # then Run ▶ on a connected phone
# — or —
cd android && ./gradlew assembleDebug
# APK lands at android/app/build/outputs/apk/debug/app-debug.apk
```

Sideload on a real low-end phone and check: native scan on 5 real packets
(low light too), email/password login (Google button is hidden on native by
design), a metered scan (badge decrements), paywall at limit shows the
"can't purchase in this app" line (NOT a subscribe button), account page
shows Delete account, language switch, ingredient sheets. Subscribe on the
website with the same account, reopen the app → badge shows "Member".

## Release build for the Play Store

1. Generate a signing keystore (once — **back it up**, losing it means you can
   never update the app):
   `keytool -genkey -v -keystore zoco-release.keystore -alias zoco -keyalg RSA -keysize 2048 -validity 10000`
2. Configure signing in `android/app/build.gradle` (`signingConfigs.release`)
   or sign via Android Studio → Build → Generate Signed App Bundle.
3. `cd android && ./gradlew bundleRelease` →
   `android/app/build/outputs/bundle/release/app-release.aab`
4. Play Console steps (account, listing, screenshots, health disclaimer):
   follow **Phase 4–5 of `TWA_PUBLISHING.md`** — identical for a Capacitor
   app, minus the Digital Asset Links section (not needed here).
5. **New personal Play accounts** (created after Nov 2023) must run a closed
   test with **at least 12 testers continuously for 14 days** before Google
   unlocks Production access. Recruit testers early; Internal → Closed →
   Production is the realistic path and adds ~2–3 weeks to first launch.

### Data-safety form (declare exactly this)

| Question | Answer |
|---|---|
| Collects email address | Yes — account management (Firebase Auth); not shared for ads |
| Collects user IDs | Yes — Firebase uid, account management |
| Purchase history | Yes — subscription status only (payments processed by Razorpay on the web) |
| App activity / analytics | Anonymous usage events, not linked to identity |
| Photos / camera | **Not collected** — barcode decoding is on-device; images never leave the phone |
| Location, contacts, files | Not collected |
| Data encrypted in transit | Yes (HTTPS everywhere) |
| Deletion mechanism | Yes — in-app Delete account + `https://zocolabel.com/privacy.html#delete-account` |

Privacy policy URL: `https://zocolabel.com/privacy.html`. Health disclaimer: the
app gives food information, not medical advice — keep that line in the listing
description (content-rating questionnaire: it is NOT a medical app).

## iOS (phase 2)

`npx cap add ios` → Xcode → App Store. Two extra work items before submitting:
Apple requires **In-App Purchase** for the subscription (Razorpay must be
hidden on iOS; consider RevenueCat), and Google sign-in needs the native
plugin. Apple developer account: $99/yr; Small Business Program cuts the IAP
commission to 15%.

## Release checklist (every app update)

- [ ] `VITE_API_BASE=<prod url> npm run build && npx cap sync android`
- [ ] Version bump in `android/app/build.gradle` (`versionCode` +1)
- [ ] `./gradlew bundleRelease`, upload to an Internal-testing track first
- [ ] Smoke on a real device, then promote to Production
