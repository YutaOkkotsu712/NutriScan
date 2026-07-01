import { useEffect, useState } from 'react'
import { useT } from '../i18n'

// Shows a thin banner when the device goes offline. Combined with the service
// worker's data cache, previously-scanned products and reference data still
// load, so this tells the user why data may be stale (spec §14 offline mode).
export default function OfflineBanner() {
  const { t } = useT()
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine)

  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  if (!offline) return null

  return (
    <div className="bg-amber-100 border-b border-amber-200 text-amber-800 text-xs text-center py-1.5 px-4 animate-fadeIn">
      📴 {t('common.offline')}
    </div>
  )
}
