# NutriScan — Admin & Operations Guide

This guide is for the team operating NutriScan (content reviewers, nutrition
experts, and the person deploying it). No backend servers are involved:
everything runs on Vercel Edge Functions + Vercel KV.

## 1. Deployment (one time)

1. Import the repository into Vercel (framework preset: Vite). `/api/*` is
   auto-deployed as Edge Functions.
2. Create a **Vercel KV** store and link it to the project — the
   `KV_REST_API_URL` and `KV_REST_API_TOKEN` env vars are added automatically.
   KV stores the corrections queue, review archive, audit log, product data
   overrides, CMS users, and published reference entries.
3. Set a bootstrap admin credential:
   - `ADMIN_TOKEN` — a single strong secret (audits as "admin"), and/or
   - `ADMIN_TOKENS` — named admins: `asha:long-random-secret,ravi:other-secret`
4. Optional: `ALLOWED_ORIGIN` — locks the public corrections endpoint to your
   own domain.

## 2. The admin console — `/admin.html`

Log in with your token. What you see depends on your role:

| Tab         | reviewer | admin |
|-------------|----------|-------|
| Queue       | ✓        | ✓     |
| Reviewed    | ✓        | ✓     |
| Audit log   | ✓        | ✓     |
| Ingredients |          | ✓     |
| Users       |          | ✓     |

### Users (admin only)
Create console users with their own tokens — **the token is shown exactly
once**; share it over a secure channel. Only a SHA-256 hash is stored. If a
token is lost or a person leaves, disable or delete the user (their access
stops immediately). Env-token admins are managed on Vercel, not here.

- `reviewer` — reviews user-submitted corrections.
- `admin` — everything, including the reference database and user management.

### Queue — reviewing corrections
Users report data problems from the app ("Report or correct this data").
Nothing users submit is ever shown to other users automatically (spec §11).

- **Approve / Reject** with a short note describing what you verified.
- On approve you may attach a **data override** — the corrected value for a
  whitelisted field. Nutrients are entered **per 100 g in Open Food Facts
  units: sodium and salt in grams**, not milligrams. Overrides are merged onto
  product data for every user within ~5 minutes and the product card shows
  "correction verified by NutriScan review".

### Ingredients (admin only) — the reference database
The ingredient encyclopedia (what each ingredient is, safety, FSSAI status,
Jain/fasting suitability, sources) ships with the app as a reviewed base
release. This tab publishes **versioned overrides** on top of it:

- **Edit** an entry (JSON), then **Publish new version**. Validation enforces
  a name, at least one source, whitelisted fields, and strips HTML.
- Every publish is a new version; **Version history** shows all of them and
  any version can be **restored** (a restore is itself a new version — the
  history is append-only, nothing is ever rewritten).
- **Unpublish** falls back to the built-in entry.
- **+ New ingredient** adds entries that don't exist in the base at all.
- Changes reach the app and the public API (`/api/ingredients/*`) within
  ~5 minutes, no app release needed.

Nutrient reference tables (ICMR-NIN/WHO) and fasting profiles are scientific
tables that ship as code releases after expert review; they are intentionally
not editable here.

### Audit log
Every review decision, override, publish, revert, and user change is recorded
with actor, action, target, and timestamp.

## 3. Content guardrails (please keep these)

- Never guess regulatory limits — leave `maxLevel` null with a
  "verification pending" condition when a verified FSSAI figure isn't known.
- Every published entry needs at least one named source (enforced).
- Ambiguous Jain/fasting suitability is "depends"/"unknown", never "yes".
- The app's health prose is machine-translated into 9 languages; have native
  speakers review `src/i18n.js` before major campaigns.

## 4. Public read APIs (no auth)

- `GET /api/product-info/<barcode>` — product + score + suitability + fasting
  + allowances in one call
- `GET /api/ingredients/all`, `/api/ingredients/<id>` — encyclopedia (with
  published CMS versions merged)
- `GET /api/reference/nutrients | fasting | regulation | suitability`

## 5. Local development

`npm install && npm run dev` — every API route runs locally through the same
edge-function code, with an in-memory KV and a default admin token
`dev-admin-token` (dev only; production auth comes exclusively from the env
vars). `npm test` runs the full suite (170 tests).

## 6. Security posture (audited 2026-07)

- **Auth**: console-created tokens are 256-bit random, stored only as SHA-256
  hashes, compared in constant time. More than 30 failed attempts from one IP
  in 15 minutes blocks that IP (even with a valid token) until the window
  expires. Keep at least one strong `ADMIN_TOKEN` env var as the bootstrap
  credential — console-created admins could otherwise delete themselves into a
  lockout.
- **CSRF/CORS**: admin endpoints authenticate via the `Authorization` header
  (no cookies) and send no CORS headers, so cross-site pages can neither
  authenticate nor read responses. Public write endpoints only echo CORS for
  the origin in the optional `ALLOWED_ORIGIN` env var.
- **Input handling**: every public and admin write is whitelist-validated,
  HTML-stripped, and length-capped server-side; the console HTML-escapes
  everything it renders. Prototype-key lookups are guarded with
  `Object.hasOwn` throughout.
- **Abuse limits**: corrections 20/hr/IP and analytics 600/hr/IP, keyed on the
  platform-set `x-real-ip` (not the spoofable `x-forwarded-for`). All KV lists
  are capped (queue 5 000, analytics 20 000, audit/archive 2 000, history 50
  per ingredient), so floods can't grow storage without bound.
- **Headers** (`vercel.json`): CSP allowing only same-origin code and Open
  Food Facts images, `X-Content-Type-Options: nosniff`, `X-Frame-Options:
  DENY`, strict referrer policy, and a Permissions-Policy granting only the
  camera. If you integrate an external service, extend the CSP deliberately
  rather than removing it.
- **Privacy**: no accounts, no cookies; family profiles never leave the
  device's localStorage; analytics accepts only whitelisted non-personal keys.
- **Token rotation**: delete the console user and create a new one (old token
  dies immediately); env tokens rotate in Vercel project settings.
