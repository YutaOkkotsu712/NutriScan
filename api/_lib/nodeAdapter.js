// Adapter: run a web-standard (Request → Response) handler on Vercel's Node
// serverless runtime, which invokes functions Node-style as (req, res).
//
// Why it exists: the endpoints that call Razorpay must run on the Node runtime
// (Razorpay's WAF 406-rejects edge runtimes), but everything else here — the
// edge functions, the vite dev bridge, and the unit tests — speaks the web
// signature. Wrapping with asNodeHandler keeps ONE handler implementation
// working everywhere: when invoked with a single Request argument (dev bridge,
// tests) it passes straight through; when invoked as (req, res) it converts.

export function asNodeHandler(webHandler) {
  return async function handler(reqOrRequest, res) {
    // Web signature (edge-style callers): single fetch Request, no res.
    if (!res || typeof res.end !== 'function') return webHandler(reqOrRequest)

    const req = reqOrRequest
    // Node's req.headers may hold string arrays (set-cookie style) — Headers
    // rejects arrays, so join them.
    const headers = new Headers()
    for (const [k, v] of Object.entries(req.headers || {})) {
      if (typeof v === 'string') headers.set(k, v)
      else if (Array.isArray(v)) headers.set(k, v.join(', '))
    }

    const isBodyless = req.method === 'GET' || req.method === 'HEAD'
    let body
    if (!isBodyless) {
      const chunks = []
      for await (const c of req) chunks.push(c)
      if (chunks.length) body = Buffer.concat(chunks)
    }

    const request = new Request(`https://${req.headers?.host || 'localhost'}${req.url}`, {
      method: req.method,
      headers,
      body,
    })

    const response = await webHandler(request)
    res.statusCode = response.status
    response.headers.forEach((v, k) => res.setHeader(k, v))
    res.end(Buffer.from(await response.arrayBuffer()))
  }
}
