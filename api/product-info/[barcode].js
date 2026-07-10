// GET /api/product-info/{barcode} — product-scoped composed endpoint (spec §15).
//
// One call returns everything the interactive layer computes for a product:
// normalized nutrition + health score, suitability verdicts for every group,
// fasting verdicts for every profile, nutrient allowance vs daily references,
// and the data-confidence block. It imports the SAME src/ modules the client
// uses, so API consumers and the app can never disagree.
//
// Optional query params:
//   ?demographic=adultWomen     allowance for one demographic (default: all;
//                               keys per GET /api/reference/nutrients)
//   ?fasting=navratri           fasting verdict for one profile (default: all)

import { normalizeOffProduct } from '../../src/utils/barcodeEngine.js'
import { getSuitability } from '../../src/utils/suitabilityEngine.js'
import { evaluateFasting } from '../../src/utils/fastingEngine.js'
import { getAllowance, DEMOGRAPHIC_KEYS } from '../../src/utils/demographicEngine.js'
import { FASTING_PROFILE_ORDER } from '../../src/data/fastingProfiles.js'
import { fetchOverrides, applyOverrides } from '../_lib/overrides.js'
import { gateProductRequest } from '../_lib/scanGate.js'

export const config = { runtime: 'edge' }

const env = (typeof process !== 'undefined' && process.env) || {}

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product'

export default async function handler(request) {
  const url = new URL(request.url)
  const barcode = url.pathname.split('/').filter(Boolean).pop()

  if (!barcode || !/^\d{6,14}$/.test(barcode)) {
    return json({ error: 'Invalid barcode' }, 400, 'no-store')
  }

  // Paywall gate (see api/_lib/scanGate.js): a metered scan when membership is
  // on, so this composed endpoint can't be used to bypass /api/scan.
  const gate = await gateProductRequest(request, env)
  if (gate.blocked) return gate.blocked

  let product
  try {
    const upstream = await fetch(`${OFF_BASE}/${barcode}.json`, {
      headers: {
        'User-Agent': 'NutriScan/1.0 (https://nutriscan.app)',
        'Accept': 'application/json',
      },
    })
    if (!upstream.ok) return json({ error: 'Upstream error' }, 502, 'no-store')
    const data = await upstream.json()
    if (data.status !== 1 || !data.product) {
      return json({ error: 'Product not found', barcode }, 404, 'no-store')
    }
    product = data.product
  } catch {
    return json({ error: 'Lookup failed' }, 502, 'no-store')
  }

  // Reviewed corrections take precedence over raw OFF data (spec §11).
  const overrides = await fetchOverrides(barcode, env)
  if (overrides) applyOverrides(product, overrides)

  const result = normalizeOffProduct(product, barcode)

  // Suitability for all groups (Kids/Jain/BP/Diabetes/…)
  const suitability = getSuitability(result)

  // Fasting verdicts — one profile if requested and known, else all.
  const fastingParam = url.searchParams.get('fasting')
  const fastingKeys = FASTING_PROFILE_ORDER.includes(fastingParam)
    ? [fastingParam]
    : FASTING_PROFILE_ORDER
  const fasting = fastingKeys.map(key => ({
    profile: key,
    ...evaluateFasting(result.parsedIngredients, key),
  }))

  // Allowance vs daily reference — per serving, per demographic.
  const demoParam = url.searchParams.get('demographic')
  const demoKeys = DEMOGRAPHIC_KEYS.includes(demoParam) ? [demoParam] : DEMOGRAPHIC_KEYS
  const allowance = demoKeys.map(key => ({
    // getAllowance's own `demographic` field is the full reference object;
    // keep the machine key alongside it.
    key,
    ...getAllowance(result.parsedNutrition, key),
  }))

  const body = {
    barcode,
    generatedAt: new Date().toISOString(),
    product: {
      name: result.productName,
      brand: result.brand,
      quantity: result.quantity,
      servingSize: result.servingSize,
      imageUrl: result.imageUrl,
      categoryTags: result.categoryTags,
      novaGroup: result.novaGroup,
      nutriScore: result.nutriScore,
    },
    score: {
      overall: result.overallScore,
      label: result.scoreLabel,
      capped: result.capped,
      capReason: result.capReason,
      categories: result.categories,
      note: 'Suitability, fasting and allowance are additional guidance and do not change this score (spec §9).',
    },
    nutrition: {
      perServing: result.parsedNutrition,
      per100g: result.nutrition100g,
    },
    allergens: result.allergens,
    traces: result.traces,
    claims: result.claims,
    flaggedItems: result.flaggedItems,
    suitability,
    fasting,
    allowance,
    dataConfidence: result.dataConfidence,
  }

  // Every response is per-user (metered): attach the allowance, never
  // shared-cache. (Fail-closed paywall: there is no public branch.)
  return json({ ...body, entitlement: gate.entitlement }, 200, 'no-store')
}

function json(body, status, cacheControl) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
    },
  })
}
