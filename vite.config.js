import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// In production, /api/* is served by the Vercel Edge Functions in /api.
// In local dev there's no serverless runtime, so we proxy /api/* straight to
// Open Food Facts here — same client code path, no CORS, no caching (dev only).
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
