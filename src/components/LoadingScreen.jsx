import { useT } from '../i18n'

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
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 border-4 border-green-200 rounded-full" />
        <div className="absolute inset-0 border-4 border-green-600 rounded-full border-t-transparent animate-spin" />
      </div>
      <p className="text-lg font-medium text-gray-700 mb-2">
        {label}
      </p>
    </div>
  )
}
