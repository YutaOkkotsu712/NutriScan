# i18n additions — paste into `src/i18n.js`

The new UI strings now use proper i18n keys (no inline `lang === 'hi'`
ternaries). Add the blocks below to the `en` and `hi` dictionaries in
`STRINGS`. Missing keys in other languages (Hinglish, Marathi, …) fall back
per the file's existing config-driven behavior — add translations there the
same way when ready.

## 1. Inside `en: { ... }` (e.g. right after the `landing` section):

```js
    nav: {
      scan: 'Scan',
      search: 'Search',
      plan: 'Plan',
      profile: 'Profile',
      membership: 'Membership',
    },
    plan: {
      free: 'Free plan',
      current: 'Current plan',
    },
```

## 2. Inside `en.results: { ... }` add:

```js
      readout: 'ZOCO Readout',
```

## 3. Inside `en.swap: { ... }` add:

```js
      better: 'Better',
      neverSponsored: 'never sponsored',
```

## 4. Inside `hi: { ... }` (same positions):

```js
    nav: {
      scan: 'स्कैन',
      search: 'खोजें',
      plan: 'प्लान',
      profile: 'प्रोफ़ाइल',
      membership: 'सदस्यता',
    },
    plan: {
      free: 'फ़्री प्लान',
      current: 'वर्तमान प्लान',
    },
```

Inside `hi.results`:
```js
      readout: 'ज़ोको रीडआउट',
```

Inside `hi.swap`:
```js
      better: 'बेहतर',
      neverSponsored: 'कभी प्रायोजित नहीं',
```

## Used by

- `nav.*` — BottomNav.jsx, App.jsx (desktop top-nav)
- `plan.*` — LandingScreen.jsx (free-plan card), AccountScreen.jsx (plan card)
- `results.readout` — ResultsScreen.jsx (verdict hero kicker)
- `swap.better`, `swap.neverSponsored` — SmartSwapCard.jsx
