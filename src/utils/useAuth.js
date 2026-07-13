// Consumer auth hook (ZOCO membership). Wraps Firebase Auth with a small,
// app-shaped API. Exposes the current user, loading state, sign-in/up/out, and
// getIdToken() — the token every gated API call (e.g. /api/scan) must send as
// `Authorization: Bearer <token>`.
//
// getIdToken() returns a FRESH token (Firebase caches + auto-refreshes hourly);
// the server verifies it, so the client can't fake identity or entitlement.

import { useSyncExternalStore } from 'react'
import {
  GoogleAuthProvider, signInWithPopup, signInWithCredential, signOut as fbSignOut,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  onAuthStateChanged, deleteUser,
} from 'firebase/auth'
import { auth, authEnabled } from '../firebase'
import { apiUrl } from './apiBase.js'
import { isNativeApp } from './platform.js'

// Sign in with Google.
//   Web:    the standard popup flow.
//   Native: the popup is blocked inside a WebView, so we use the native Google
//           account picker (@capacitor-firebase/authentication) and then hand
//           the returned Google credential to the SAME Firebase JS SDK via
//           signInWithCredential — so getIdToken()/API calls/sign-out all keep
//           working through one JS session (skipNativeAuth is set in
//           capacitor.config.json so the plugin only returns the credential).
async function signInWithGoogle() {
  if (!isNativeApp()) {
    return signInWithPopup(auth, new GoogleAuthProvider())
  }
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
  const result = await FirebaseAuthentication.signInWithGoogle()
  const idToken = result?.credential?.idToken
  if (!idToken) throw Object.assign(new Error('No Google credential'), { code: 'auth/no-credential' })
  return signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
}

// --- Singleton auth-state store (useSyncExternalStore) ---------------------
let currentUser = null
let ready = !authEnabled // when auth is off, we're immediately "ready" (no user)
const listeners = new Set()

if (authEnabled) {
  onAuthStateChanged(auth, (user) => {
    currentUser = user
    ready = true
    listeners.forEach((l) => l())
  })
}

function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
// Cache the snapshot so useSyncExternalStore sees a stable reference until a
// real change fires (returning a fresh object every call causes render loops).
let snapshot = { user: currentUser, ready }
function getSnapshot() {
  if (snapshot.user !== currentUser || snapshot.ready !== ready) {
    snapshot = { user: currentUser, ready }
  }
  return snapshot
}

export function useAuth() {
  const { user, ready: isReady } = useSyncExternalStore(subscribe, getSnapshot)
  return {
    user,
    ready: isReady,
    authEnabled,
    email: user?.email || null,
    signInWithGoogle,
    signInWithEmail: (e, p) => signInWithEmailAndPassword(auth, e, p),
    signUpWithEmail: (e, p) => createUserWithEmailAndPassword(auth, e, p),
    signOut: doSignOut,
  }
}

// Sign out of the JS SDK, and on native also clear the plugin's Google client
// so the account picker re-prompts on the next sign-in.
async function doSignOut() {
  if (isNativeApp()) {
    try {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
      await FirebaseAuthentication.signOut()
    } catch { /* JS sign-out below is the one that matters */ }
  }
  return fbSignOut(auth)
}

// Fresh ID token for API calls, or null if signed out / auth disabled.
export async function getIdToken() {
  if (!authEnabled || !auth?.currentUser) return null
  return auth.currentUser.getIdToken()
}

// Convenience: build the Authorization header for a gated fetch.
export async function authHeader() {
  const token = await getIdToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Full account deletion (Play Store requirement): server-side data first
// (meter, subscription — the endpoint also cancels Razorpay billing), then the
// Firebase user itself. Firebase may reject the delete with
// 'auth/requires-recent-login' — callers surface that as "sign in again".
// Server-first order is deliberate: if the Firebase delete fails the user
// still exists and can retry; the reverse would orphan server records.
export async function deleteAccount() {
  if (!authEnabled || !auth?.currentUser) throw new Error('not signed in')

  // Firebase refuses deleteUser() unless the user signed in within the last
  // ~5 minutes (auth/requires-recent-login). Check BEFORE the server cleanup:
  // otherwise a stale session cancels billing and wipes server records, then
  // fails to delete the login — leaving a confusing half-deleted account.
  const { claims } = await auth.currentUser.getIdTokenResult()
  const authAgeSec = Date.now() / 1000 - Number(claims.auth_time || 0)
  if (!Number.isFinite(authAgeSec) || authAgeSec > 4 * 60) {
    const err = new Error('recent login required')
    err.code = 'auth/requires-recent-login'
    throw err
  }

  const res = await fetch(apiUrl('/api/me/delete'), { method: 'POST', headers: await authHeader() })
  if (!res.ok) throw new Error('server cleanup failed')
  await deleteUser(auth.currentUser) // signs the user out via onAuthStateChanged
}
