import { useState } from 'react'
import BottomSheet from './BottomSheet'
import { useT } from '../i18n'
import { apiUrl } from '../utils/apiBase'
import { track } from '../utils/analytics'

const TYPES = ['nutrition', 'ingredient', 'allergen', 'regulation', 'other']

// In-app correction submission (spec §15). Posts to /api/corrections, which
// queues the report for admin review. Falls back to the Open Food Facts editor
// if the request fails (e.g. offline, or the serverless fn is unavailable).
export default function CorrectionSheet({ open, onClose, result, defaultType = 'other', defaultField = '' }) {
  const { t } = useT()
  const [type, setType] = useState(defaultType)
  const [detail, setDetail] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | done | error

  const offUrl = result?.barcode
    ? `https://world.openfoodfacts.org/product/${result.barcode}`
    : 'https://world.openfoodfacts.org'

  async function submit() {
    if (detail.trim().length < 3) { setStatus('needDetail'); return }
    setStatus('submitting')
    try {
      const res = await fetch(apiUrl('/api/corrections'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          barcode: result?.barcode || '',
          productName: result?.productName || '',
          type,
          field: defaultField,
          detail: detail.trim(),
          sourceUrl: '',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setStatus('done')
        setDetail('')
        track('correction_submit', { type })
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  const typeLabels = {
    nutrition: t('correction.typeNutrition'),
    ingredient: t('correction.typeIngredient'),
    allergen: t('correction.typeAllergen'),
    regulation: t('correction.typeRegulation'),
    other: t('correction.typeOther'),
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t('correction.title')}>
      {status === 'done' ? (
        <div className="text-center py-6">
          <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-3">
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-sm text-gray-700 mb-4">{t('correction.thanks')}</p>
          <button onClick={onClose} className="py-2.5 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-sm">
            {t('common.done')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">{t('correction.intro')}</p>

          {/* Type */}
          <div>
            <label className="text-sm font-semibold text-gray-800 block mb-1.5">{t('correction.whatType')}</label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map(ty => (
                <button
                  key={ty}
                  onClick={() => setType(ty)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    type === ty ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {typeLabels[ty]}
                </button>
              ))}
            </div>
          </div>

          {/* Detail */}
          <div>
            <label className="text-sm font-semibold text-gray-800 block mb-1.5">{t('correction.detailLabel')}</label>
            <textarea
              value={detail}
              onChange={e => { setDetail(e.target.value); if (status === 'needDetail') setStatus('idle') }}
              rows={4}
              maxLength={1000}
              placeholder={t('correction.detailPlaceholder')}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
            {status === 'needDetail' && (
              <p className="text-xs text-red-600 mt-1">{t('correction.needDetail')}</p>
            )}
          </div>

          {status === 'error' && (
            <p className="text-xs text-red-600">{t('correction.failed')}</p>
          )}

          <button
            onClick={submit}
            disabled={status === 'submitting'}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {status === 'submitting' && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {status === 'submitting' ? t('correction.submitting') : t('correction.submit')}
          </button>

          <a
            href={offUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-xs text-green-600 hover:text-green-700 font-medium"
          >
            {t('correction.editOnOFF')}
          </a>

          <p className="text-[10px] text-gray-400 text-center leading-relaxed">{t('correction.reviewNote')}</p>
        </div>
      )}
    </BottomSheet>
  )
}
