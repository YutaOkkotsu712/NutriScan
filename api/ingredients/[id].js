// GET /api/ingredients/{id}  — structured ingredient encyclopedia (spec §15).
// GET /api/ingredients/all   — list of {id, canonicalName}.
//
// Serves the SAME data module the client uses (../../src/data), so the
// encyclopedia has a single source of truth. Read-only, edge-cached.

import { INGREDIENT_ENCYCLOPEDIA, ENCYCLOPEDIA_META } from '../../src/data/ingredientEncyclopedia.js'

export const config = { runtime: 'edge' }

function json(body, status = 200, cache = 'public, s-maxage=86400, stale-while-revalidate=604800') {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': status === 200 ? cache : 'no-store',
    },
  })
}

export default function handler(request) {
  const id = new URL(request.url).pathname.split('/').filter(Boolean).pop()

  if (!id || id === 'all' || id === 'ingredients') {
    const list = Object.entries(INGREDIENT_ENCYCLOPEDIA).map(([key, e]) => ({
      id: key, canonicalName: e.canonicalName, confidence: e.confidence,
    }))
    return json({ meta: ENCYCLOPEDIA_META, count: list.length, ingredients: list })
  }

  // Own-property check prevents prototype keys (__proto__, constructor,
  // toString…) from returning built-in objects instead of a 404.
  if (!Object.hasOwn(INGREDIENT_ENCYCLOPEDIA, id)) {
    return json({ error: 'Ingredient not found', id }, 404)
  }
  const entry = INGREDIENT_ENCYCLOPEDIA[id]
  return json({ meta: ENCYCLOPEDIA_META, id, ...entry })
}
