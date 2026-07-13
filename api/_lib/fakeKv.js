// In-memory stand-in for the Upstash/Vercel KV REST API — TEST SUPPORT ONLY.
// Mirrors the command subset our functions use. The underscore directory is
// not routed by Vercel, and nothing in production imports this module.

export function createFakeKv() {
  const lists = new Map()
  const strings = new Map()
  const zsets = new Map() // key -> Map(member -> score)
  const list = (key) => {
    if (!lists.has(key)) lists.set(key, [])
    return lists.get(key)
  }
  const zset = (key) => {
    if (!zsets.has(key)) zsets.set(key, new Map())
    return zsets.get(key)
  }

  function fetchImpl(url, opts) {
    const [cmd, key, ...args] = JSON.parse(opts.body)
    let result = null
    if (cmd === 'SET') { strings.set(key, String(args[0])); result = 'OK' }
    if (cmd === 'GET') result = strings.has(key) ? strings.get(key) : null
    if (cmd === 'DEL') { result = strings.delete(key) ? 1 : 0 }
    if (cmd === 'LPUSH') { list(key).unshift(String(args[0])); result = list(key).length }
    if (cmd === 'LRANGE') { const [s, e] = args.map(Number); result = list(key).slice(s, e + 1) }
    if (cmd === 'LREM') { const i = list(key).indexOf(args[1]); if (i >= 0) list(key).splice(i, 1); result = i >= 0 ? 1 : 0 }
    if (cmd === 'LTRIM') { lists.set(key, list(key).slice(Number(args[0]), Number(args[1]) + 1)); result = 'OK' }
    // INCR is stored as a plain string so GET sees it, matching real Redis.
    if (cmd === 'INCR') { const n = Number(strings.get(key) || 0) + 1; strings.set(key, String(n)); result = n }
    if (cmd === 'EXPIRE') result = 1
    // Sorted sets: ZINCRBY key increment member ; ZREVRANGE key start stop [WITHSCORES]
    if (cmd === 'ZINCRBY') {
      const z = zset(key); const member = String(args[1])
      const n = (z.get(member) || 0) + Number(args[0]); z.set(member, n); result = n
    }
    if (cmd === 'ZREVRANGE') {
      const z = zset(key)
      const sorted = [...z.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      const start = Number(args[0]); const stop = Number(args[1])
      const slice = sorted.slice(start, stop === -1 ? undefined : stop + 1)
      const withScores = args.some((a) => String(a).toUpperCase() === 'WITHSCORES')
      result = withScores ? slice.flatMap(([m, s]) => [m, String(s)]) : slice.map(([m]) => m)
    }
    // ZREMRANGEBYRANK key start stop — rank 0 = lowest score; negatives count from end.
    if (cmd === 'ZREMRANGEBYRANK') {
      const z = zset(key)
      const asc = [...z.entries()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1))
      const n = asc.length
      let start = Number(args[0]); let stop = Number(args[1])
      if (start < 0) start = Math.max(0, n + start)
      if (stop < 0) stop = n + stop
      let removed = 0
      for (let i = start; i <= stop && i < n; i++) { z.delete(asc[i][0]); removed++ }
      result = removed
    }
    return Promise.resolve(new Response(JSON.stringify({ result }), { status: 200 }))
  }

  return {
    fetchImpl,
    lists,
    strings,
    zsets,
    list,
    reset() { lists.clear(); strings.clear(); zsets.clear() },
  }
}
