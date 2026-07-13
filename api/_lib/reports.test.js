import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { createFakeKv } from './fakeKv.js'
import { bumpReport, bumpConversion, bumpSearchTerm, readReports, reportsToCsv } from './reports.js'

const kv = createFakeKv()
const realFetch = globalThis.fetch
const env = { KV_REST_API_URL: 'https://fake-kv.test', KV_REST_API_TOKEN: 'x' }

beforeEach(() => {
  kv.reset()
  globalThis.fetch = kv.fetchImpl
})
afterAll(() => { globalThis.fetch = realFetch })

describe('report counters', () => {
  it('counts scans, lookup failures and total searches', async () => {
    await bumpReport(env, 'scans'); await bumpReport(env, 'scans')
    await bumpReport(env, 'lookupFail')
    const r = await readReports(env)
    expect(r).toMatchObject({ scans: 2, lookupFail: 1 })
  })

  it('ignores unknown metrics', async () => {
    await bumpReport(env, 'evil')
    expect(kv.strings.get('report:evil')).toBeUndefined()
  })

  it('counts a conversion once per subscription id', async () => {
    await bumpConversion(env, 'sub_1')
    await bumpConversion(env, 'sub_1') // duplicate delivery
    await bumpConversion(env, 'sub_2')
    expect((await readReports(env)).conversions).toBe(2)
  })
})

describe('most-searched leaderboard', () => {
  it('ranks search terms by count, sanitises, bumps searchTotal', async () => {
    await bumpSearchTerm(env, 'Maggi'); await bumpSearchTerm(env, 'maggi!!')
    await bumpSearchTerm(env, 'parle-g')
    const r = await readReports(env)
    expect(r.searchTotal).toBe(3)
    expect(r.topSearches[0]).toEqual({ term: 'maggi', count: 2 }) // case/punct folded together
    expect(r.topSearches.map(s => s.term)).toContain('parleg')
  })

  it('ignores empty/whitespace terms', async () => {
    await bumpSearchTerm(env, '   ')
    await bumpSearchTerm(env, '')
    expect((await readReports(env)).topSearches).toHaveLength(0)
  })
})

describe('CSV export', () => {
  it('renders counters and the leaderboard as CSV', async () => {
    await bumpReport(env, 'scans')
    await bumpSearchTerm(env, 'oreo')
    const csv = reportsToCsv(await readReports(env))
    expect(csv).toContain('Successful scans,1')
    expect(csv).toContain('Search term,Count')
    expect(csv).toContain('oreo,1')
  })

  it('quotes terms containing commas', () => {
    const csv = reportsToCsv({ scans: 0, lookupFail: 0, conversions: 0, searchTotal: 0, topSearches: [{ term: 'lay,s', count: 3 }] })
    expect(csv).toContain('"lay,s",3')
  })
})

describe('without KV', () => {
  it('reads back zeroes and never throws', async () => {
    const r = await readReports({})
    expect(r).toMatchObject({ configured: false, scans: 0, topSearches: [] })
    await bumpReport({}, 'scans') // no-op, no throw
  })
})
