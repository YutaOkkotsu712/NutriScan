# Publishing NutriScan to the Play Store (TWA)

A step-by-step checklist for a solo developer wrapping the existing PWA as a
Trusted Web Activity (TWA) and shipping it on Google Play. No app rewrite —
the Play Store app *is* the deployed website in a chromeless shell.

**Hard cost:** ₹2,200 one-time (Google Play account). Everything else is free
tooling + your time. Android only (TWA does not target iOS).

Legend: `[ ]` = do this · ⚠️ = easy to get wrong / permanent decision.

---

## Phase 0 — Prerequisites

- [ ] **Deploy the PWA to a real HTTPS domain** (Vercel). TWA wraps a live URL;
      it cannot wrap localhost. Note the final URL — it is baked into the app.
- [ ] Install Node 18+ and the JDK (Bubblewrap pulls the Android SDK itself).
- [ ] ⚠️ **Decide who owns the Play Console account.** The account owner owns
      the app. For an NGO handover, either (a) create the account under the
      NGO's Google identity, or (b) plan to transfer the app later (Google
      supports app transfers, but it is paperwork). Deciding now avoids a
      messy migration after launch.

## Phase 1 — Fix icons + harden the manifest (BLOCKER)

The current `public/manifest.json` references two PNG icons that are **not in
the repo** — only `favicon.svg` and `icons.svg` exist. Until real PNGs exist,
the PWA is not installable and Bubblewrap will fail its checks.

- [ ] **Generate PNG icons from the existing SVG.** You need at minimum:
      - `icon-192.png` (192×192)
      - `icon-512.png` (512×512)
      - `icon-512-maskable.png` (512×512, with ~10% safe padding around the
        logo so Android's circle/squircle mask doesn't crop it)
      Tooling: [maskable.app](https://maskable.app) to preview/pad, or
      `@capacitor/assets` / any SVG→PNG export. Put them in `public/`.
- [ ] **Add a `maskable` icon entry + `purpose` to the manifest:**
      ```json
      "icons": [
        { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
        { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
        { "src": "/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
      ]
      ```
- [ ] Add these fields to the manifest (all improve the Play/TWA experience):
      - `"id": "/"` — stable app identity
      - `"scope": "/"` — keeps in-app navigation inside the TWA (external links
        open the browser, which is what you want)
      - `"orientation": "portrait"` — the app is a portrait phone experience
      - `"lang": "en"`, `"dir": "ltr"`
- [ ] **Verify installability.** Deploy, open the site in desktop Chrome →
      DevTools → **Application → Manifest**: no icon errors, "Installability"
      shows no warnings. Then Lighthouse → PWA category should pass. If Chrome
      offers "Install app," the install criteria are met and TWA will work.

## Phase 2 — Bubblewrap init & build

- [ ] Install: `npm i -g @bubblewrap/cli`
- [ ] Initialize against your live manifest:
      `bubblewrap init --manifest https://YOUR_DOMAIN/manifest.json`
- [ ] ⚠️ **Set the Application ID (package name) carefully — it is PERMANENT.**
      Reverse-DNS, all lowercase, e.g. `org.<ngo-domain>.nutriscan` or
      `app.nutriscan`. It can **never** be changed after the first publish, and
      it should ideally sit under the NGO's domain since they'll own the app.
- [ ] During init, accept: app name **NutriScan**, theme color `#16a34a`,
      background `#f9fafb`, display **standalone**, icon = your 512 PNG.
- [ ] Build: `bubblewrap build` → produces `app-release-bundle.aab` (upload to
      Play) and `app-release-signed.apk` (for local test installs).
- [ ] Sideload the APK onto a real low-end Android phone and smoke-test:
      camera scan, a barcode lookup, language switch, offline behaviour.

## Phase 3 — Signing key + Digital Asset Links (the make-or-break step)

This is the step everyone trips on. If Digital Asset Links isn't set up
correctly, the app launches **with a browser address bar** across the top —
which looks broken and gets rejected in review.

- [ ] ⚠️ **Back up the signing keystore Bubblewrap generates** (`android.keystore`
      + the passwords it prints). If you lose it you can **never ship an update**
      to this app again — you'd have to publish a brand-new listing. Store it
      somewhere permanent (password manager + offline copy), and hand a copy to
      the NGO at handover.
- [ ] Get the key's SHA-256 fingerprint:
      `bubblewrap fingerprint` (or `keytool -list -v -keystore android.keystore`).
- [ ] Create `public/.well-known/assetlinks.json` in the web app with that
      fingerprint (Bubblewrap prints the exact JSON, form below), commit, deploy:
      ```json
      [{
        "relation": ["delegate_permission/common.handle_all_urls"],
        "target": {
          "namespace": "android_app",
          "package_name": "YOUR.PACKAGE.NAME",
          "sha256_cert_fingerprints": ["AA:BB:CC:..."]
        }
      }]
      ```
- [ ] ⚠️ Confirm your Vercel rewrite does **not** swallow `/.well-known/*`.
      Current `vercel.json` rewrites everything except `/api/` to `index.html`;
      `/.well-known/assetlinks.json` must return the JSON file, not the SPA.
      Test after deploy: `curl https://YOUR_DOMAIN/.well-known/assetlinks.json`
      returns the JSON with `content-type: application/json`.
- [ ] ⚠️ **Google Play App Signing re-signs your app**, so the fingerprint that
      matters is Play's, not your local one. After creating the Play listing
      (Phase 4), copy the **App signing key SHA-256** from Play Console →
      *Setup → App integrity* and make sure it is in `assetlinks.json` too
      (list both your upload key and Play's signing key fingerprints).
- [ ] Verify with Google's tester:
      `https://developers.google.com/digital-asset-links/tools/generator`

## Phase 4 — Play Console listing

- [ ] Pay the **$25 (~₹2,200)** one-time registration; complete identity
      verification (Google now requires ID for new developer accounts — allow
      a couple days).
- [ ] Create the app: default language English, category **Health & Fitness**,
      free, not primarily child-directed.
- [ ] **Store listing assets:**
      - App icon 512×512 (reuse your maskable master)
      - Feature graphic 1024×500 (simple branded banner)
      - ⚠️ **At least 2 phone screenshots** — take these from the real app
        (results screen with score dial + suitability chips is your money shot;
        a Hindi screenshot showcases the localisation for the Indian audience).
      - Short description (≤80 chars) + full description. Reuse the manifest
        line: "Scan barcodes or search products for instant WHO-aligned health
        scores." Mention: India-first, 9 languages, veg/Jain/fasting guidance.
- [ ] **Data safety form** — this app is the easy case: no accounts, no login,
      family profile stays in on-device `localStorage`, analytics collects only
      whitelisted non-personal events. Declare: *no data collected, no data
      shared, data processed on-device.* (Double-check the analytics endpoint
      declaration matches what you actually send.)
- [ ] **Content rating** questionnaire → will come back "Everyone."
- [ ] ⚠️ **Health disclaimer in the listing.** The app already shows "guidance,
      not medical advice" in-app; put the same line in the store description so
      review doesn't flag medical claims. FSSAI = licensing status, not health
      approval — keep that framing.
- [ ] Privacy policy URL (required for Health apps). A simple hosted page
      stating "no personal data collected; profiles stay on your device"
      satisfies it — host it at `/privacy` on the same domain.

## Phase 5 — Submit, test track, launch

- [ ] Upload the `.aab` to **Internal testing** first (instant, up to 100
      testers by email). Install from the test link on 2–3 real phones and
      confirm: **no address bar** (Asset Links working), scanning, offline,
      languages.
- [ ] Promote to **Production**. First review for a new account typically takes
      a few days to ~2 weeks.
- [ ] Keep the plain PWA URL alive as the **zero-install channel** — a
      WhatsApp-forwardable link that opens instantly is huge in India and
      complements the store app.

## Ongoing (hand this to the NGO)

- [ ] Google bumps the **required `targetSdkVersion`** roughly yearly; you must
      rebuild with a newer Bubblewrap and re-upload or the app gets delisted
      from search. Budget ~1 dev-day/year.
- [ ] Updates: because it's a TWA, **web changes go live instantly** via Vercel
      with no store update — you only touch the Play Console for the yearly SDK
      bump or listing/icon changes. This is the big operational win of TWA.
- [ ] Handover artifacts the NGO needs: the signing keystore + passwords, the
      Play Console account (or an app transfer), and this document.

---

### Reality-check before you start (from earlier discussion)

Do the **5-packet scan test** on a real ₹8k Android phone with the deployed PWA
first. If browser scanning is reliable → TWA is the right call. If it fumbles
worn barcodes / dim light → the app still ships fine as a TWA, but plan the
Capacitor + native ML Kit upgrade as a fast follow (the Play listing, icons,
signing, and Asset Links from this checklist all carry over unchanged).
