// Where is this build running? The same web bundle ships to the website and
// (via Capacitor) to the Play Store app, but the stores have policy rules the
// web doesn't: Google Play forbids in-app purchase of digital subscriptions
// outside Play Billing, so the native app hides all purchase UI (website-only
// billing — the "Netflix model") and hides Google sign-in (popup auth cannot
// work inside a WebView).
import { Capacitor } from '@capacitor/core'

export function isNativeApp() {
  return Capacitor.isNativePlatform()
}
