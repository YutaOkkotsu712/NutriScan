// GET /api/reference/regulation — structured additive regulatory records (spec §15, §21).
// Aggregates the AdditiveRegulation-shaped data from the ingredient encyclopedia.

import { INGREDIENT_ENCYCLOPEDIA, ENCYCLOPEDIA_META } from '../../src/data/ingredientEncyclopedia.js'

export const config = { runtime: 'edge' }

export default function handler(request) {
  const insFilter = new URL(request.url).searchParams.get('ins')

  const records = []
  for (const [id, e] of Object.entries(INGREDIENT_ENCYCLOPEDIA)) {
    if (!e.regulation) continue
    if (insFilter && !(e.insCodes || []).includes(insFilter)) continue
    records.push({
      id,
      canonicalName: e.canonicalName,
      insCodes: e.insCodes || [],
      ...e.regulation,
    })
  }

  return new Response(JSON.stringify({ meta: ENCYCLOPEDIA_META, count: records.length, records }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
