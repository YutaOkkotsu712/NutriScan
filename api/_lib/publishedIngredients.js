// Shared access to the CMS-published ingredient override set.
// See api/admin/reference.js for the write side and storage model.

export const PUBLISHED_KEY = 'ref:ingredients:published'

// Best-effort read: returns {} when KV is unconfigured, empty, or erroring —
// public ingredient lookups must never fail because the CMS store is down.
export async function fetchPublishedIngredients(env) {
  if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN) return {}
  try {
    const res = await fetch(env.KV_REST_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.KV_REST_API_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify(['GET', PUBLISHED_KEY]),
    })
    if (!res.ok) return {}
    const data = await res.json()
    const map = data?.result ? JSON.parse(data.result) : {}
    return map && typeof map === 'object' ? map : {}
  } catch {
    return {}
  }
}
