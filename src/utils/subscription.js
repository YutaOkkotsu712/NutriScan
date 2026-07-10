// Client-side Razorpay subscription flow (ZOCO membership).
// Opens Razorpay Checkout for a subscription created server-side. Membership is
// activated by the signature-verified webhook, so after checkout we poll
// /api/me/entitlement until the server reflects "subscribed".

import { authHeader } from './useAuth'
import { apiUrl } from './apiBase'

let scriptPromise = null
function loadRazorpay() {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://checkout.razorpay.com/v1/checkout.js'
      s.onload = resolve
      s.onerror = () => reject(new Error('Failed to load Razorpay'))
      document.head.appendChild(s)
    })
  }
  return scriptPromise
}

async function fetchEntitlement() {
  const res = await fetch(apiUrl('/api/me/entitlement'), { headers: await authHeader() })
  return res.ok ? (await res.json()).entitlement : null
}

// Poll for the webhook to activate membership (usually a few seconds).
async function waitForActivation(tries = 10, delayMs = 1500) {
  for (let i = 0; i < tries; i++) {
    const e = await fetchEntitlement()
    if (e?.subscribed) return e
    await new Promise(r => setTimeout(r, delayMs))
  }
  return fetchEntitlement()
}

/**
 * Start the subscription checkout.
 * @param onActivated called with the fresh entitlement once membership is live
 * @param onError     called with an Error (load/create/checkout failure)
 * @param onDismiss   called if the user closes the checkout without paying
 */
export async function startCheckout({ onActivated, onError, onDismiss } = {}) {
  try {
    await loadRazorpay()
    const res = await fetch(apiUrl('/api/subscription/create'), { method: 'POST', headers: await authHeader() })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Could not start subscription')

    const rzp = new window.Razorpay({
      key: data.keyId,
      subscription_id: data.subscriptionId,
      name: 'ZOCO',
      description: 'ZOCO Membership',
      theme: { color: '#16a34a' },
      handler: async () => { onActivated?.(await waitForActivation()) },
      modal: { ondismiss: () => onDismiss?.() },
    })
    rzp.open()
  } catch (err) {
    onError?.(err)
  }
}

export async function cancelMembership() {
  const res = await fetch(apiUrl('/api/subscription/cancel'), { method: 'POST', headers: await authHeader() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Cancel failed')
  return data
}
