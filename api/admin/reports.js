// Vercel Edge Function — basic usage reports (spec §18).
//
//   GET /api/admin/reports            → { scans, lookupFail, conversions,
//                                         searchTotal, topSearches }
//   GET /api/admin/reports?format=csv → downloadable CSV
//
// Admin role only (console auth — ADMIN_TOKEN / KV admin users). Read-only;
// numbers are aggregate counters + a most-searched leaderboard, no per-user data.

import {
  authenticate, adminConfigured, kvConfigured,
  authThrottled, recordAuthFailure,
} from '../_lib/auth.js'
import { readReports, reportsToCsv } from '../_lib/reports.js'

export const config = { runtime: 'edge' }

const env = (typeof process !== 'undefined' && process.env) || {}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

export default async function handler(request) {
  if (!adminConfigured(env)) return json({ error: 'Admin API disabled.' }, 503)
  if (await authThrottled(request, env)) return json({ error: 'Too many failed attempts — try again later.' }, 429)
  const user = await authenticate(request, env)
  if (!user) { await recordAuthFailure(request, env); return json({ error: 'Unauthorized' }, 401) }
  if (user.role !== 'admin') return json({ error: 'Admin role required' }, 403)
  if (!kvConfigured(env)) return json({ error: 'Storage not configured.' }, 503)
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  try {
    const report = await readReports(env)
    if (new URL(request.url).searchParams.get('format') === 'csv') {
      return new Response(reportsToCsv(report), {
        status: 200,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'cache-control': 'no-store',
          'content-disposition': `attachment; filename="zoco-report-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }
    return json({ ok: true, report, me: { name: user.name, role: user.role } })
  } catch (err) {
    console.error('[ZOCO admin/reports]', err)
    return json({ error: 'Storage error — try again.' }, 502)
  }
}
