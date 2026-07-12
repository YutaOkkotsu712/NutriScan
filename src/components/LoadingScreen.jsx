// Analyzing / loading — src/components/LoadingScreen.jsx (full replacement)
import { useT } from '../i18n'
import { BarcodeIcon } from './ZocoBrand'

// The engine emits progress statuses as English strings; translate the known
// ones at render (unknown strings pass through untranslated).
const KNOWN_STATUSES = new Set([
  'Looking up product...', 'Analyzing nutrition...', 'Calculating health score...',
])

export default function LoadingScreen({ status }) {
  const { t } = useT()
  const label = status
    ? (KNOWN_STATUSES.has(status) ? t(`loadingStatus.${status}`) : status)
    : t('loading.analyzing')
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 bg-cream">
      <div className="relative w-[88px] h-[88px] mb-6">
        <div className="absolute inset-0 rounded-full border-[7px] border-mint" />
        <div className="absolute inset-0 rounded-full border-[7px] border-brand border-t-transparent border-r-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <BarcodeIcon className="w-[30px] h-[30px] text-brand" strokeWidth={1.8} />
        </div>
      </div>
      <p className="font-display font-bold text-[19px] text-ink">{label}</p>
    </div>
  )
}
