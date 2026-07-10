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
  ['/api/corrections', 'api/corrections.js'],
  ['/api/analytics', 'api/analytics.js'],
]

// In-memory stand-in for the Vercel KV REST API (dev only) so the
// corrections queue + reviewer console work end-to-end without a real store.
// Supports exactly the commands our functions use.
function devKvMiddleware() {
  const lists = new Map()
  const strings = new Map()
  const list = (k) => { if (!lists.has(k)) lists.set(k, []); return lists.get(k) }
  return async (req, res) => {
    const chunks = []
    for await (const c of req) chunks.push(c)
    const [cmd, key, ...args] = JSON.parse(Buffer.concat(chunks).toString() || '[]')
    let result = null
    if (cmd === 'SET') { strings.set(key, String(args[0])); result = 'OK' }
    if (cmd === 'GET') result = strings.has(key) ? strings.get(key) : null
    if (cmd === 'LPUSH') { list(key).unshift(String(args[0])); result = list(key).length }
    if (cmd === 'LRANGE') result = list(key).slice(Number(args[0]), Number(args[1]) + 1)
    if (cmd === 'LREM') { const i = list(key).indexOf(args[1]); if (i >= 0) list(key).splice(i, 1); result = i >= 0 ? 1 : 0 }
    if (cmd === 'LTRIM') { lists.set(key, list(key).slice(Number(args[0]), Number(args[1]) + 1)); result = 'OK' }
    if (cmd === 'INCR') { const n = Number(strings.get(key) || 0) + 1; strings.set(key, String(n)); result = n }
    if (cmd === 'EXPIRE') result = 1
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

export default defineConfig({
  plugins: [react(), tailwindcss(), edgeFunctionsDev()],
})
