# ZOCO "Bazaar Fresh" — copy-paste code package

Drop-in files for the **zoco branch**. Frontend only — no backend, API, auth,
or engine code is touched. All screen props and logic are identical to the
current components; only markup/styling changed.

## Install (5 steps)

1. **Fonts** — add the 3 lines from `index-head-snippet.html` into `index.html` `<head>`.
2. **Styles** — replace `src/index.css` with `index.css` (adds the token set via Tailwind v4 `@theme`; all existing animation classes kept, plus new `animate-beamSweep`).
3. **New components** — copy into `src/components/`:
   - `ZocoBrand.jsx` (brand mark, wordmark, veg mark, trust badge, image placeholder, icons)
   - `BottomNav.jsx` (mobile nav: Scan · Search · Plan · Profile)
4. **i18n** — paste the small key blocks from `i18n-additions.md` into the `en`
   and `hi` dictionaries in `src/i18n.js` (nav labels, plan copy, readout,
   swap.better). Other languages fall back automatically.
5. **Replacements** — overwrite these files in `src/`:
   - `App.jsx`
   - `components/LandingScreen.jsx`
   - `components/BarcodeScanner.jsx`
   - `components/SearchScreen.jsx`
   - `components/LoadingScreen.jsx`
   - `components/ResultsScreen.jsx`
   - `components/WelcomeScreen.jsx`
   - `components/LoginScreen.jsx`
   - `components/PaywallScreen.jsx`
   - `components/AccountScreen.jsx`
   - **Inner result cards**: `components/CategoryCard.jsx`, `NutritionDetail.jsx`,
     `ScoreExplainer.jsx`, `SuitabilityChips.jsx`, `NutrientAllowanceCard.jsx`,
     `FastingCard.jsx`, `IngredientDeepDive.jsx`, `DataConfidenceCard.jsx`,
     `SmartSwapCard.jsx`, `BottomSheet.jsx`
6. `npm run dev` — nothing else changes (utils, engines, backend untouched).

## What changed (and what to know)

- **OCR scrapped**: LandingScreen no longer has "Upload Barcode Photo"; its
  replacement quick actions are Search + Enter Code (inline numeric form that
  calls the existing `onBarcodeDetected`).
- **No numeric score**: ResultsScreen renders a verdict-first "ZOCO Readout"
  hero instead of ScoreDial (which is no longer imported; `ScoreDial.jsx` can
  stay in the repo, unused). The score still drives the verdict internally via
  the existing `getVerdict` thresholds and i18n `verdict.*` strings.
- **Sign-out moved** from the App header into AccountScreen (grid next to
  Delete account).
- **New props**: LandingScreen now accepts optional `entitlement` +
  `onOpenAccount` (App.jsx passes them) to render the Free-plan card. Free
  scans are indefinite — no "first month" copy anywhere.
- **BottomNav** shows on mobile (`md:hidden`), hidden during the full-screen
  scanner. Desktop (`md:`) gets a top nav (Scan / Search / Membership) in the
  header. When a Help screen exists, swap the Profile item for Help.
- **Scanner** is now a full-screen dark viewfinder (`fixed inset-0 z-40`) with
  marigold corner brackets + sweeping beam. All ML Kit / html5-qrcode logic is
  byte-identical to the original.
- **Bilingual labels**: all new UI strings use i18n keys (`nav.*`, `plan.*`,
  `results.readout`, `swap.better`, `swap.neverSponsored`) — see
  `i18n-additions.md`. No inline language ternaries.
- **Inner cards restyled too**: SmartSwapCard now shows the scoreword pill and
  a "Better" tag instead of numeric scores (verdict-first rule); ingredient
  rows are divider-list style; emoji icons replaced with line icons
  everywhere. Still untouched (rarely seen, old styling, works fine):
  CompareScreen, ProfileSheet, IngredientDetailSheet, CorrectionSheet.

## Token cheat-sheet (defined in index.css `@theme`)

Surfaces: `bg-cream` `bg-white` `border-line` `border-edge` `border-hairline` `bg-stone`
Ink: `text-ink` (headings) `text-leaf` `text-fern` `text-sage` `text-moss` `text-faint` `text-mute`
Brand: `text-brand` `text-deep` `bg-mint` gradient `bg-gradient-to-br from-brand-hi to-brand-lo`
Accent: `bg-marigold` + `text-spice`; amber status `bg-sand text-ochre border-sand-line`
Red status: `bg-blush text-chili-ink border-blush-line`, solid `bg-chili`
Scanner: `bg-night` `text-cornsilk`
Type: `font-display` (Bricolage Grotesque) for headings/buttons, `font-sans` (Instrument Sans) body.

Full visual reference: open `../ZOCO Frontend Directions.dc.html` — mobile
finals are turn 2 (ids 2a–2i), desktop turn 3 (3a–3d).
