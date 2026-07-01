// GET /api/reference/fasting — fasting/Upvas profiles with source & confidence (spec §8, §15).

import { FASTING_PROFILES, FASTING_PROFILE_ORDER, FASTING_META, FASTING_CONFIDENCE } from '../../src/data/fastingProfiles.js'

export const config = { runtime: 'edge' }

export default function handler() {
  const profiles = FASTING_PROFILE_ORDER.map(key => ({
    id: key,
    ...FASTING_PROFILES[key],
    confidence: FASTING_CONFIDENCE[key] || 'medium',
  }))
  return new Response(JSON.stringify({ meta: FASTING_META, count: profiles.length, profiles }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
