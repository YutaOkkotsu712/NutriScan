// Basic admin reporting (spec §18): a handful of global counters + a
// most-searched leaderboard, all in KV. Deliberately aggregate-only — no
// per-user rows, no free text beyond product search terms — so it stays inside
// the app's privacy posture while still answering "how is ZOCO being used".
//
//   report:scans        total successful product scans      (INCR)
//   report:lookupFail   scans where the product wasn't found (INCR)
//   report:conversions  subscriptions activated (deduped)    (INCR)
//   report:searchTotal  total product searches               (INCR)
//   report:searches     sorted set of search term -> count   (ZINCRBY)

import { kvCmd, kvConfigured } from './auth.js'

const COUNTERS = ['scans', 'lookupFail', 'conversions', 'searchTotal']

// Fire-and-forget counter bump. Never throws — reporting must not break a scan.
export async function bumpReport(env, metric) {
  if (!kvConfigured(env) || !COUNTERS.includes(metric)) return
  try { await kvCmd(env, ['INCR', `report:${metric}`]) } catch { /* ignore */ }
}

// Count subscription conversions once per subscription id.
export async function bumpConversion(env, subscriptionId) {
  if (!kvConfigured(env)) return
  try {
    const key = `report:converted:${subscriptionId || 'unknown'}`
    const already = await kvCmd(env, ['GET', key])
    if (already) return
    await kvCmd(env, ['SET', key, '1'])
    await kvCmd(env, ['INCR', 'report:conversions'])
  } catch { /* ignore */ }
}

// Add a product search term to the leaderboard. Lowercased and stripped to a
// safe, bounded token; empty terms are ignored.
export async function bumpSearchTerm(env, term) {
  if (!kvConfigured(env)) return
  const t = String(term || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40)
  if (!t) return
  try {
    await kvCmd(env, ['ZINCRBY', 'report:searches', '1', t])
    await kvCmd(env, ['INCR', 'report:searchTotal'])
  } catch { /* ignore */ }
}

// Read the full report: counters + top search terms.
export async function readReports(env, topN = 20) {
  if (!kvConfigured(env)) return { configured: false, scans: 0, lookupFail: 0, conversions: 0, searchTotal: 0, topSearches: [] }
  const num = async (m) => Number((await kvCmd(env, ['GET', `report:${m}`])) || 0)
  const [scans, lookupFail, conversions, searchTotal] = await Promise.all(COUNTERS.map(num))
  const topSearches = []
  try {
    const raw = (await kvCmd(env, ['ZREVRANGE', 'report:searches', '0', String(topN - 1), 'WITHSCORES'])) || []
    for (let i = 0; i < raw.length; i += 2) topSearches.push({ term: raw[i], count: Number(raw[i + 1]) })
  } catch { /* sorted set may not exist yet */ }
  return { configured: true, scans, lookupFail, conversions, searchTotal, topSearches }
}

// Render the report as CSV for download.
export function reportsToCsv(r) {
  const lines = [
    'Metric,Value',
    `Successful scans,${r.scans}`,
    `Product lookup failures,${r.lookupFail}`,
    `Subscription conversions,${r.conversions}`,
    `Total product searches,${r.searchTotal}`,
    '',
    'Search term,Count',
    ...r.topSearches.map((s) => `${csvCell(s.term)},${s.count}`),
  ]
  return lines.join('\n')
}

function csvCell(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
