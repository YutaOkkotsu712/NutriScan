// In-memory stand-in for the Upstash/Vercel KV REST API — TEST SUPPORT ONLY.
// Mirrors the command subset our functions use. The underscore directory is
// not routed by Vercel, and nothing in production imports this module.

export function createFakeKv() {
  const lists = new Map()
  const strings = new Map()
  const list = (key) => {
    if (!lists.has(key)) lists.set(key, [])
    return lists.get(key)
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
    return Promise.resolve(new Response(JSON.stringify({ result }), { status: 200 }))
  }

  return {
    fetchImpl,
    lists,
    strings,
    list,
    reset() { lists.clear(); strings.clear() },
  }
}
