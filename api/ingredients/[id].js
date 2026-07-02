// GET /api/ingredients/{id}  — structured ingredient encyclopedia (spec §15).
// GET /api/ingredients/all   — list of {id, canonicalName}.
//
// Serves the static src/data module (single source of truth for the reviewed
// base release) merged with CMS-published versions from KV (spec §10/§14 —
// admin edits go live without a redeploy). Published entries win over base
// and carry {published: {version, updatedAt}} provenance. CMS-touched
// responses use a short edge cache so publishes appear quickly.

import { INGREDIENT_ENCYCLOPEDIA, ENCYCLOPEDIA_META } from '../../src/data/ingredientEncyclopedia.js'
import { fetchPublishedIngredients } from '../_lib/publishedIngredients.js'

export const config = { runtime: 'edge' }

const env = (typeof process !== 'undefined' && process.env) || {}

const CACHE_LONG = 'public, s-maxage=86400, stale-while-revalidate=604800'
const CACHE_SHORT = 'public, s-maxage=300, stale-while-revalidate=3600'

function json(body, status = 200, cache = CACHE_LONG) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': status === 200 ? cache : 'no-store',
    },
  })
}

export default async function handler(request) {
  const id = new URL(request.url).pathname.split('/').filter(Boolean).pop()
  const published = await fetchPublishedIngredients(env)
  const anyPublished = Object.keys(published).length > 0

  if (!id || id === 'all' || id === 'ingredients') {
    const ids = new Set([...Object.keys(INGREDIENT_ENCYCLOPEDIA), ...Object.keys(published)])
    const list = [...ids].sort().map(key => {
      const pub = published[key]
      const e = pub?.entry || INGREDIENT_ENCYCLOPEDIA[key]
      return {
        id: key, canonicalName: e.canonicalName, confidence: e.confidence,
        ...(pub ? { published: { version: pub.version, updatedAt: pub.updatedAt } } : {}),
      }
    })
    return json(
      { meta: ENCYCLOPEDIA_META, count: list.length, ingredients: list },
      200, anyPublished ? CACHE_SHORT : CACHE_LONG,
    )
  }

  // Own-property checks prevent prototype keys (__proto__, constructor,
  // toString…) from returning built-in objects instead of a 404.
  const pub = Object.hasOwn(published, id) ? published[id] : null
  if (pub?.entry) {
    return json(
      { meta: ENCYCLOPEDIA_META, id, ...pub.entry, published: { version: pub.version, updatedAt: pub.updatedAt } },
      200, CACHE_SHORT,
    )
  }
  if (!Object.hasOwn(INGREDIENT_ENCYCLOPEDIA, id)) {
    return json({ error: 'Ingredient not found', id }, 404)
  }
  return json({ meta: ENCYCLOPEDIA_META, id, ...INGREDIENT_ENCYCLOPEDIA[id] })
}
