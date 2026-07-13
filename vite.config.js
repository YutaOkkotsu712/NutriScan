import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

// In production, /api/* is served by the Vercel Functions in /api.
// In local dev every /api/* route (including /api/search, so its auth gate
// and param clamping apply in dev too) is served by the SAME edge-function
// modules via the dev middleware plugin, so dev and prod share one code path.

const EDGE_ROUTES = [
  // [URL prefix, module path relative to this file]
  ['/api/scan/', 'api/scan/[barcode].js'],
  ['/api/search', 'api/search.js'],
  ['/api/me/entitlement', 'api/me/entitlement.js'],
  ['/api/me/delete', 'api/me/delete.js'],
  ['/api/subscription/create', 'api/subscription/create.js'],
  ['/api/subscription/cancel', 'api/subscription/cancel.js'],
  ['/api/subscription/webhook', 'api/subscription/webhook.js'],
  ['/api/product-info/', 'api/product-info/[barcode].js'],
  ['/api/ingredients', 'api/ingredients/[id].js'],
  ['/api/reference/nutrients', 'api/reference/nutrients.js'],
  ['/api/reference/fasting', 'api/reference/fasting.js'],
  ['/api/reference/regulation', 'api/reference/regulation.js'],
  ['/api/reference/suitability', 'api/reference/suitability.js'],
  ['/api/admin/corrections', 'api/admin/corrections.js'],
  ['/api/admin/users', 'api/admin/users.js'],
  ['/api/admin/reference', 'api/admin/reference.js'],
  ['/api/admin/membership', 'api/admin/membership.js'],
  ['/api/admin/reports', 'api/admin/reports.js'],
  ['/api/corrections', 'api/corrections.js'],
  ['/api/analytics', 'api/analytics.js'],
]

// In-memory stand-in for the Vercel KV REST API (dev only) so the
// corrections queue + reviewer console work end-to-end without a real store.
// Supports exactly the commands our functions use.
function devKvMiddleware() {
  const lists = new Map()
  const strings = new Map()
  const zsets = new Map()
  const list = (k) => { if (!lists.has(k)) lists.set(k, []); return lists.get(k) }
  const zset = (k) => { if (!zsets.has(k)) zsets.set(k, new Map()); return zsets.get(k) }
  return async (req, res) => {
    const chunks = []
    for await (const c of req) chunks.push(c)
    const [cmd, key, ...args] = JSON.parse(Buffer.concat(chunks).toString() || '[]')
    let result = null
    if (cmd === 'SET') { strings.set(key, String(args[0])); result = 'OK' }
    if (cmd === 'GET') result = strings.has(key) ? strings.get(key) : null
    if (cmd === 'DEL') { result = strings.delete(key) ? 1 : 0 }
    if (cmd === 'LPUSH') { list(key).unshift(String(args[0])); result = list(key).length }
    if (cmd === 'LRANGE') result = list(key).slice(Number(args[0]), Number(args[1]) + 1)
    if (cmd === 'LREM') { const i = list(key).indexOf(args[1]); if (i >= 0) list(key).splice(i, 1); result = i >= 0 ? 1 : 0 }
    if (cmd === 'LTRIM') { lists.set(key, list(key).slice(Number(args[0]), Number(args[1]) + 1)); result = 'OK' }
    if (cmd === 'INCR') { const n = Number(strings.get(key) || 0) + 1; strings.set(key, String(n)); result = n }
    if (cmd === 'EXPIRE') result = 1
    if (cmd === 'ZINCRBY') { const z = zset(key); const n = (z.get(String(args[1])) || 0) + Number(args[0]); z.set(String(args[1]), n); result = n }
    if (cmd === 'ZREVRANGE') {
      const sorted = [...zset(key).entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      const slice = sorted.slice(Number(args[0]), Number(args[1]) === -1 ? undefined : Number(args[1]) + 1)
      result = args.some((a) => String(a).toUpperCase() === 'WITHSCORES') ? slice.flatMap(([m, s]) => [m, String(s)]) : slice.map(([m]) => m)
    }
    if (cmd === 'ZREMRANGEBYRANK') {
      const asc = [...zset(key).entries()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1))
      const n = asc.length
      let start = Number(args[0]); let stop = Number(args[1])
      if (start < 0) start = Math.max(0, n + start)
      if (stop < 0) stop = n + stop
      let removed = 0
      for (let i = start; i <= stop && i < n; i++) { zset(key).delete(asc[i][0]); removed++ }
      result = removed
    }
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ result }))
  }
}

function edgeFunctionsDev() {
  // Shared between the dev server and `vite preview` (prod-bundle testing):
  // same env bootstrap, same in-memory KV, same edge-function bridge.
  function setup(server) {
      // Vite only exposes VITE_* to the client. The edge functions run here in
      // Node and read process.env, so load the non-VITE server vars (Firebase
      // project id, Razorpay secrets) from .env.local into process.env.
      const fileEnv = loadEnv(server.config.mode, process.cwd(), '')
      for (const key of ['FIREBASE_PROJECT_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'RAZORPAY_PLAN_ID', 'VITE_RAZORPAY_KEY_ID']) {
        if (!process.env[key] && fileEnv[key]) process.env[key] = fileEnv[key]
      }

      // Dev-only admin credential + in-memory KV so the corrections flow is
      // fully testable locally. Prod uses the real ADMIN_TOKEN / KV env vars
      // on Vercel; nothing here ships in the build.
      if (!process.env.ADMIN_TOKEN) process.env.ADMIN_TOKEN = 'dev-admin-token'
      // Dev-only webhook secret so a simulated Razorpay webhook can be tested
      // locally (real webhooks can't reach localhost). Prod uses the real
      // RAZORPAY_WEBHOOK_SECRET from Vercel.
      if (!process.env.RAZORPAY_WEBHOOK_SECRET) process.env.RAZORPAY_WEBHOOK_SECRET = 'dev-webhook-secret'
      const kvHandler = devKvMiddleware()
      server.httpServer?.once('listening', () => {
        const { port } = server.httpServer.address()
        if (!process.env.KV_REST_API_URL) {
          process.env.KV_REST_API_URL = `http://localhost:${port}/__dev-kv`
          process.env.KV_REST_API_TOKEN = 'dev-kv-token'
        }
      })

      server.middlewares.use(async (req, res, next) => {
        if (req.url.startsWith('/__dev-kv')) return kvHandler(req, res)
        const route = EDGE_ROUTES.find(([prefix]) => req.url.startsWith(prefix))
        if (!route) return next()
        try {
          const mod = await import(pathToFileURL(path.resolve(__dirname, route[1])).href)
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) {
            if (typeof v === 'string') headers.set(k, v)
          }
          const isBodyless = req.method === 'GET' || req.method === 'HEAD'
          const chunks = []
          if (!isBodyless) for await (const c of req) chunks.push(c)
          const request = new Request(`http://${req.headers.host || 'localhost'}${req.url}`, {
            method: req.method,
            headers,
            body: isBodyless ? undefined : Buffer.concat(chunks),
          })
          const methodHandler = mod[req.method]
          const handler = typeof mod.default === 'function'
            ? mod.default
            : mod.default?.fetch || methodHandler
          if (!handler) throw new Error(`No handler exported for ${route[1]}`)
          const response = await handler(request)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          console.error(`[edge-dev] ${req.url}`, err)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Dev edge function error' }))
        }
      })
  }

  return {
    name: 'nutriscan-edge-functions-dev',
    configureServer: setup,
    // `vite preview` serves the PROD bundle — register the same API bridge so
    // the production build is fully testable locally (never ships to Vercel).
    configurePreviewServer: setup,
  }
}

// Tailwind v4 emits responsive breakpoints as CSS range-syntax media queries
// — `@media (width>=48rem)` — which only Safari 16.4+, Chrome 104+ and
// Firefox 102+ understand. Older browsers ignore the whole block, so EVERY
// `md:`/`sm:`/`lg:` rule silently fails and the layout is stuck in its mobile
// (base) form no matter the screen size. Our audience includes older Android
// Chrome and iOS Safari, so we rewrite the range syntax to the classic
// `(min-width: …)` / `(max-width: …)` forms, which are equivalent and
// supported everywhere back to ~2017. Runs in dev (transform) and build
// (generateBundle) so the preview matches production.
function widthRangeToMinMax(css) {
  return css
    .replace(/\(\s*width\s*>=\s*([0-9.]+)(rem|px|em)\s*\)/g, '(min-width:$1$2)')
    .replace(/\(\s*width\s*<=\s*([0-9.]+)(rem|px|em)\s*\)/g, '(max-width:$1$2)')
}

function cssBreakpointCompat() {
  return {
    name: 'css-breakpoint-compat',
    enforce: 'post',
    transform(code, id) {
      if (id.includes('.css') && /\(\s*width\s*[<>]=/.test(code)) {
        return { code: widthRangeToMinMax(code), map: null }
      }
      return null
    },
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'asset' && file.fileName.endsWith('.css') && typeof file.source === 'string') {
          file.source = widthRangeToMinMax(file.source)
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cssBreakpointCompat(), edgeFunctionsDev()],
})
