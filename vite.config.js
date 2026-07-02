import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

// In production, /api/* is served by the Vercel Edge Functions in /api.
// In local dev:
//  - /api/product and /api/search proxy straight to Open Food Facts (below)
//  - every other /api/* route is served by the SAME edge-function modules via
//    the dev middleware plugin — they are plain (Request) => Response
//    functions, so dev and prod share one code path.

const EDGE_ROUTES = [
  // [URL prefix, module path relative to this file]
  ['/api/product-info/', 'api/product-info/[barcode].js'],
  ['/api/ingredients', 'api/ingredients/[id].js'],
  ['/api/reference/nutrients', 'api/reference/nutrients.js'],
  ['/api/reference/fasting', 'api/reference/fasting.js'],
  ['/api/reference/regulation', 'api/reference/regulation.js'],
  ['/api/reference/suitability', 'api/reference/suitability.js'],
  ['/api/admin/corrections', 'api/admin/corrections.js'],
  ['/api/corrections', 'api/corrections.js'],
  ['/api/analytics', 'api/analytics.js'],
]

// In-memory stand-in for the Vercel KV REST API (dev only) so the
// corrections queue + reviewer console work end-to-end without a real store.
// Supports exactly the commands our functions use.
function devKvMiddleware() {
  const lists = new Map()
  const counters = new Map()
  const list = (k) => { if (!lists.has(k)) lists.set(k, []); return lists.get(k) }
  return async (req, res) => {
    const chunks = []
    for await (const c of req) chunks.push(c)
    const [cmd, key, ...args] = JSON.parse(Buffer.concat(chunks).toString() || '[]')
    let result = null
    if (cmd === 'LPUSH') { list(key).unshift(String(args[0])); result = list(key).length }
    if (cmd === 'LRANGE') result = list(key).slice(Number(args[0]), Number(args[1]) + 1)
    if (cmd === 'LREM') { const i = list(key).indexOf(args[1]); if (i >= 0) list(key).splice(i, 1); result = i >= 0 ? 1 : 0 }
    if (cmd === 'LTRIM') { lists.set(key, list(key).slice(Number(args[0]), Number(args[1]) + 1)); result = 'OK' }
    if (cmd === 'INCR') { const n = (counters.get(key) || 0) + 1; counters.set(key, n); result = n }
    if (cmd === 'EXPIRE') result = 1
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ result }))
  }
}

function edgeFunctionsDev() {
  return {
    name: 'nutriscan-edge-functions-dev',
    configureServer(server) {
      // Dev-only admin credential + in-memory KV so the corrections flow is
      // fully testable locally. Prod uses the real ADMIN_TOKEN / KV env vars
      // on Vercel; nothing here ships in the build.
      if (!process.env.ADMIN_TOKEN) process.env.ADMIN_TOKEN = 'dev-admin-token'
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
          const response = await mod.default(request)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          console.error(`[edge-dev] ${req.url}`, err)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Dev edge function error' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), edgeFunctionsDev()],
  server: {
    proxy: {
      // /api/product/<barcode>  ->  OFF product endpoint
      '/api/product': {
        target: 'https://world.openfoodfacts.org',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/product\/([^/?]+)/, '/api/v2/product/$1.json'),
      },
      // /api/search?...  ->  OFF v2 search
      '/api/search': {
        target: 'https://world.openfoodfacts.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/search/, '/api/v2/search'),
      },
    },
  },
})
