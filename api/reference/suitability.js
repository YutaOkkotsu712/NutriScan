// GET /api/reference/suitability — descriptors for the suitability groups (spec §7, §15).
// The verdict itself is computed per-product client-side; this endpoint documents
// the groups, what each considers, and the possible verdicts (for admin/consumers).

export const config = { runtime: 'edge' }

const GROUPS = [
  { id: 'kids', label: 'Kids', considers: ['sugar', 'sodium', 'protein', 'fibre', 'additives'], verdicts: ['Suitable', 'Occasional', 'Limit', 'Avoid'] },
  { id: 'jain', label: 'Jain', considers: ['animal-derived', 'root vegetables', 'ambiguous additives'], verdicts: ['Suitable', 'Depends', 'Avoid', 'Unknown'] },
  { id: 'adultMen', label: 'Adult men', considers: ['daily nutrient references (adult male)'], verdicts: ['Suitable', 'Occasional', 'Limit'] },
  { id: 'adultWomen', label: 'Adult women', considers: ['daily nutrient references (adult female)'], verdicts: ['Suitable', 'Occasional', 'Limit'] },
  { id: 'elderly', label: 'Elderly', considers: ['sodium', 'saturated fat', 'protein', 'fibre'], verdicts: ['Suitable', 'Limit'] },
  { id: 'bp-sodium', label: 'BP / Sodium', considers: ['sodium vs daily reference'], verdicts: ['Good choice', 'Limit', 'Avoid', 'Unknown'] },
  { id: 'diabetes', label: 'Diabetes caution', considers: ['sugar', 'refined carbs', 'fibre'], verdicts: ['Occasional', 'Limit', 'Avoid', 'Unknown'] },
  { id: 'weight-loss', label: 'Weight loss', considers: ['calories', 'protein', 'fibre', 'sugar'], verdicts: ['Good choice', 'Occasional', 'Limit'] },
]

export default function handler() {
  return new Response(JSON.stringify({
    meta: { version: '2024.1', note: 'Verdicts are computed per product from nutrition + ingredient data; these are additional guidance and do not change the general score.' },
    count: GROUPS.length,
    groups: GROUPS,
  }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
