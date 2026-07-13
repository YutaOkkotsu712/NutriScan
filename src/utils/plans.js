// Subscription plan display metadata (client). Prices are ₹ numerals (same in
// every language); the period + badge labels are i18n keys. The `key` is what
// gets sent to /api/subscription/create, which maps it to the Razorpay plan id.
// Keep the keys in sync with api/_lib/plans.js PLAN_KEYS.
export const PLANS = [
  { key: 'monthly',   price: '₹99',  periodKey: 'plan.perMonth' },
  { key: 'quarterly', price: '₹249', periodKey: 'plan.perQuarter', badgeKey: 'plan.save16' },
  { key: 'yearly',    price: '₹799', periodKey: 'plan.perYear',    badgeKey: 'plan.bestValue', highlight: true },
]
