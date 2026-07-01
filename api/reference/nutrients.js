// GET /api/reference/nutrients — demographic daily nutrient references (spec §15).
// Serves the same reference table the client uses (single source of truth).

import {
  DEMOGRAPHIC_REFERENCE, DEMOGRAPHIC_ORDER, NUTRIENT_DIRECTION,
  NUTRIENT_UNITS, NUTRIENT_LABELS, NUTRIENT_REFERENCE_META,
} from '../../src/data/nutrientReference.js'

export const config = { runtime: 'edge' }

export default function handler() {
  return new Response(JSON.stringify({
    meta: NUTRIENT_REFERENCE_META,
    order: DEMOGRAPHIC_ORDER,
    direction: NUTRIENT_DIRECTION,
    units: NUTRIENT_UNITS,
    labels: NUTRIENT_LABELS,
    demographics: DEMOGRAPHIC_REFERENCE,
  }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
