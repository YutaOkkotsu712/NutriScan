// Subscription plan registry (ZOCO). Three tiers, each backed by a Razorpay
// plan created in the dashboard. The KEY ('monthly'|'quarterly'|'yearly') is
// what the client sends and what we store; the Razorpay plan_id lives only in
// server env vars (RAZORPAY_PLAN_ID_<KEY>).
//
// Back-compat: if a specific per-key id isn't set, we fall back to the legacy
// single RAZORPAY_PLAN_ID so an older single-plan config keeps working in dev.

export const PLAN_KEYS = ['monthly', 'quarterly', 'yearly']

function envKey(key) {
  return `RAZORPAY_PLAN_ID_${key.toUpperCase()}`
}

// Razorpay plan_id for a plan key, or null if neither the per-key nor the
// legacy env var is configured.
export function planIdFor(env, key) {
  if (!PLAN_KEYS.includes(key)) return null
  return env[envKey(key)] || env.RAZORPAY_PLAN_ID || null
}

// Reverse: given a Razorpay plan_id (from a webhook), which of our keys is it?
// Lets the account screen show the tier name. null if unrecognised.
export function planKeyFor(env, planId) {
  if (!planId) return null
  for (const key of PLAN_KEYS) {
    if (env[envKey(key)] === planId) return key
  }
  if (env.RAZORPAY_PLAN_ID === planId) return null // legacy single plan: no tier
  return null
}

// True when at least one plan (per-key or legacy) is configured.
export function anyPlanConfigured(env) {
  return PLAN_KEYS.some((k) => Boolean(env[envKey(k)])) || Boolean(env.RAZORPAY_PLAN_ID)
}
