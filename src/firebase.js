// Firebase client initialisation (consumer auth for ZOCO membership).
// Config comes from VITE_FIREBASE_* env vars (public web config by design —
// see .env.example). When unconfigured (e.g. a plain NutriScan build), auth is
// simply disabled and `auth` is null, so the app can still run without login.

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const authEnabled = Boolean(config.apiKey && config.projectId)

export const auth = authEnabled ? getAuth(initializeApp(config)) : null
