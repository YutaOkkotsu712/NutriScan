import { useState } from 'react'
import BottomSheet from './BottomSheet'
import {
  useProfile, setProfile, resetProfile,
  COMMON_ALLERGENS, DIET_OPTIONS,
} from '../utils/profile'
import { DEMOGRAPHIC_ORDER } from '../data/nutrientReference'
import { FASTING_PROFILE_ORDER, FASTING_PROFILES } from '../data/fastingProfiles'
import { useT, LANGUAGES } from '../i18n'

function TokenEditor({ label, tokens, onAdd, onRemove, placeholder, color }) {
  const [text, setText] = useState('')
  const add = () => {
    const v = text.trim().toLowerCase()
    if (v && !tokens.includes(v)) onAdd(v)
    setText('')
  }
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
      <div className="flex gap-2 mb-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button onClick={add} className="px-3 py-2 bg-gray-800 text-white text-sm rounded-lg font-medium">Add</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tokens.map(t => (
          <span key={t} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${color}`}>
            {t}
            <button onClick={() => onRemove(t)} aria-label={`Remove ${t}`} className="hover:opacity-70">✕</button>
          </span>
        ))}
        {tokens.length === 0 && <span className="text-xs text-gray-400">None yet</span>}
      </div>
    </div>
  )
}

export default function ProfileSheet({ open, onClose }) {
  const profile = useProfile()
  const { t } = useT()

  const toggleAllergen = (key) => {
    const has = profile.allergens.includes(key)
    setProfile({ allergens: has ? profile.allergens.filter(a => a !== key) : [...profile.allergens, key] })
  }

  const addToken = (field, token) => {
    setProfile({ customFasting: { ...profile.customFasting, [field]: [...profile.customFasting[field], token] } })
  }
  const removeToken = (field, token) => {
    setProfile({ customFasting: { ...profile.customFasting, [field]: profile.customFasting[field].filter(t => t !== token) } })
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t('profile.title')}>
      <div className="space-y-5">
        <p className="text-xs text-gray-500 leading-relaxed">
          {t('profile.intro')}
        </p>

        {/* Language */}
        <div>
          <label className="text-sm font-semibold text-gray-800 block mb-1.5">{t('profile.language')}</label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => setProfile({ language: l.code })}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  (profile.language || 'en') === l.code
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Demographic */}
        <div>
          <label className="text-sm font-semibold text-gray-800 block mb-1.5">{t('profile.whoShoppingFor')}</label>
          <select
            value={profile.demographic}
            onChange={e => setProfile({ demographic: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {DEMOGRAPHIC_ORDER.map(k => (
              <option key={k} value={k}>{t(`demographic.${k}`)}</option>
            ))}
          </select>
        </div>

        {/* Diet */}
        <div>
          <label className="text-sm font-semibold text-gray-800 block mb-1.5">{t('profile.dietPref')}</label>
          <div className="flex flex-wrap gap-2">
            {DIET_OPTIONS.map(d => (
              <button
                key={d.key}
                onClick={() => setProfile({ diet: d.key })}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  profile.diet === d.key
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {t(`diet.${d.key}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Allergens */}
        <div>
          <label className="text-sm font-semibold text-gray-800 block mb-1.5">{t('profile.myAllergens')}</label>
          <div className="flex flex-wrap gap-2">
            {COMMON_ALLERGENS.map(a => {
              const on = profile.allergens.includes(a.key)
              return (
                <button
                  key={a.key}
                  onClick={() => toggleAllergen(a.key)}
                  className={`inline-flex items-center gap-1 text-sm px-2.5 py-1.5 rounded-full border transition-colors ${
                    on ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span>{a.icon}</span>{a.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Fasting */}
        <div>
          <label className="text-sm font-semibold text-gray-800 block mb-1.5">{t('profile.fastingUpvas')}</label>
          <select
            value={profile.fastingProfile}
            onChange={e => setProfile({ fastingProfile: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="none">{t('fasting.notFasting')}</option>
            {FASTING_PROFILE_ORDER.map(k => (
              <option key={k} value={k}>{FASTING_PROFILES[k].label}</option>
            ))}
            <option value="custom">{t('fasting.customOption')}</option>
          </select>

          {profile.fastingProfile === 'custom' && (
            <div className="mt-3 space-y-3 bg-gray-50 rounded-lg p-3">
              <TokenEditor
                label={t('profile.notAllowed')}
                tokens={profile.customFasting.restrict}
                onAdd={tok => addToken('restrict', tok)}
                onRemove={tok => removeToken('restrict', tok)}
                placeholder="e.g. regular salt, wheat"
                color="bg-red-100 text-red-700"
              />
              <TokenEditor
                label={t('profile.allowed')}
                tokens={profile.customFasting.allow}
                onAdd={tok => addToken('allow', tok)}
                onRemove={tok => removeToken('allow', tok)}
                placeholder="e.g. sendha namak, potato"
                color="bg-green-100 text-green-700"
              />
              <p className="text-[11px] text-gray-500">Fasting rules vary by family and region — these are your own.</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
          >
            {t('common.done')}
          </button>
          <button
            onClick={() => { resetProfile() }}
            className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-xl text-sm transition-colors"
          >
            {t('common.reset')}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
