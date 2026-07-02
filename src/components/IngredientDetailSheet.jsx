import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'
import { lookupEncyclopedia } from '../data/ingredientEncyclopedia'

// Prefer the live entry from /api/ingredients/<id> when the CMS has published
// a newer version (spec §10/§14 — reviewed edits reach users without an app
// release). Renders the bundled entry instantly; swaps in the published one
// when the fetch lands. Offline or fetch failure keeps the bundled data (the
// SW network-first caches /api/ingredients/*).
function usePublishedEntry(localEntry) {
  const [live, setLive] = useState(null)
  const id = localEntry?.id
  useEffect(() => {
    setLive(null)
    if (!id) return
    let cancelled = false
    fetch(`/api/ingredients/${id}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!cancelled && data?.published) setLive(data)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [id])
  return live || localEntry
}

const TABS = ['Simple', 'Safety', 'Regulation', 'Cultural', 'Sources']

const CULTURAL_BADGE = {
  yes: { text: 'Yes', cls: 'bg-green-100 text-green-700' },
  no: { text: 'No', cls: 'bg-red-100 text-red-700' },
  depends: { text: 'Depends', cls: 'bg-amber-100 text-amber-700' },
  unknown: { text: 'Unknown', cls: 'bg-gray-100 text-gray-500' },
}

function Badge({ state, label }) {
  const b = CULTURAL_BADGE[state] || CULTURAL_BADGE.unknown
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-700">{label}</span>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${b.cls}`}>{b.text}</span>
    </div>
  )
}

function ReportLink({ barcode }) {
  const url = barcode ? `https://world.openfoodfacts.org/product/${barcode}` : 'https://world.openfoodfacts.org'
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-medium mt-2">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      Report an issue
    </a>
  )
}

function SimpleTab({ entry, fallback }) {
  if (!entry) {
    return (
      <div className="space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800 font-medium">Information not verified yet</p>
          <p className="text-xs text-amber-700 mt-1">
            We don't have a verified encyclopedia entry for this ingredient yet.
          </p>
        </div>
        {fallback?.reason && (
          <p className="text-sm text-gray-700">{fallback.reason}</p>
        )}
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">What it is</p>
        <p className="text-sm text-gray-800 leading-snug">{entry.plainDescription}</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Why it's used</p>
        <p className="text-sm text-gray-800 leading-snug">{entry.function}</p>
      </div>
      {entry.riskSummary && (
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-sm text-gray-700 leading-snug">⚠️ {entry.riskSummary}</p>
        </div>
      )}
    </div>
  )
}

function SafetyTab({ entry, fallback, allergen }) {
  const cautions = entry?.safety?.caution || []
  const allerg = entry?.safety?.allergen || allergen
  return (
    <div className="space-y-3">
      {allerg && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm font-semibold text-red-800">Allergen: {allerg}</p>
        </div>
      )}
      {cautions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Who should be careful</p>
          <div className="flex flex-wrap gap-1.5">
            {cautions.map(c => (
              <span key={c} className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-1 rounded-full capitalize">
                {c.replace('-', ' / ')}
              </span>
            ))}
          </div>
        </div>
      )}
      {entry?.safety?.note && <p className="text-sm text-gray-700 leading-snug">{entry.safety.note}</p>}
      {!entry && fallback?.reason && <p className="text-sm text-gray-700 leading-snug">{fallback.reason}</p>}
      {!entry && !fallback?.reason && cautions.length === 0 && !allerg && (
        <p className="text-sm text-gray-500">No specific safety concerns recorded.</p>
      )}
    </div>
  )
}

function RegulationTab({ entry }) {
  if (!entry?.regulation) {
    return (
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-sm text-gray-600">Limit not available in database. This may be category-specific.</p>
      </div>
    )
  }
  const r = entry.regulation
  const maxDisplay = r.maxLevel != null
    ? `${r.maxLevel}${r.unit ? ' ' + r.unit : ''}`
    : 'Not available in database'
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="text-gray-800 capitalize">{r.status}</span></div>
      {r.category && <div className="flex justify-between gap-3"><span className="text-gray-500 shrink-0">Category</span><span className="text-gray-800 text-right">{r.category}</span></div>}
      <div className="flex justify-between gap-3">
        <span className="text-gray-500 shrink-0">Maximum level</span>
        <span className="text-gray-800 text-right">{maxDisplay}</span>
      </div>
      {r.confidence && (
        <div className="flex justify-between"><span className="text-gray-500">Confidence</span><span className="text-gray-800 capitalize">{r.confidence}</span></div>
      )}
      {r.effectiveDate && (
        <div className="flex justify-between"><span className="text-gray-500">Effective from</span><span className="text-gray-800">{r.effectiveDate}</span></div>
      )}
      {r.condition && <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5 leading-relaxed">{r.condition}</p>}
      {r.source && <p className="text-[10px] text-gray-400 leading-relaxed">Source: {r.source}</p>}
      <p className="text-[10px] text-gray-400 leading-relaxed">
        Regulatory limits can be category-specific and may change. We never guess a limit.
      </p>
    </div>
  )
}

function CulturalTab({ entry }) {
  if (!entry?.cultural) {
    return <p className="text-sm text-gray-500">Cultural suitability not verified for this ingredient.</p>
  }
  const c = entry.cultural
  const note = c.culturalNote || c.jainNote || c.veganNote || c.upvasNote
  return (
    <div className="space-y-1">
      <Badge state={c.veg} label="Vegetarian" />
      <Badge state={c.jain} label="Jain" />
      <Badge state={c.vegan} label="Vegan" />
      <Badge state={c.upvas} label="Upvas / fasting" />
      {note && <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2.5 mt-2 leading-relaxed">{note}</p>}
    </div>
  )
}

function SourcesTab({ entry, barcode }) {
  return (
    <div className="space-y-2 text-sm">
      {entry ? (
        <>
          <div className="flex justify-between">
            <span className="text-gray-500">Confidence</span>
            <span className="text-gray-800 capitalize font-medium">{entry.confidence}</span>
          </div>
          {entry.lastReviewed && (
            <div className="flex justify-between"><span className="text-gray-500">Last reviewed</span><span className="text-gray-800">{entry.lastReviewed}</span></div>
          )}
          <div>
            <p className="text-gray-500 mb-1">Sources</p>
            <ul className="list-disc list-inside text-gray-700 text-xs space-y-0.5">
              {(entry.sources || []).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </>
      ) : (
        <p className="text-gray-500">No verified source on file for this ingredient yet.</p>
      )}
      <ReportLink barcode={barcode} />
    </div>
  )
}

export default function IngredientDetailSheet({ open, onClose, ingredient, fallback, barcode }) {
  const [tab, setTab] = useState('Simple')
  const localEntry = ingredient ? lookupEncyclopedia(ingredient) : null
  const entry = usePublishedEntry(localEntry)
  const title = entry?.canonicalName || (ingredient ? ingredient.replace(/^\w/, c => c.toUpperCase()) : '')

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto -mx-1 px-1 pb-1">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              tab === t ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Simple' && <SimpleTab entry={entry} fallback={fallback} />}
      {tab === 'Safety' && <SafetyTab entry={entry} fallback={fallback} allergen={fallback?.allergen} />}
      {tab === 'Regulation' && <RegulationTab entry={entry} />}
      {tab === 'Cultural' && <CulturalTab entry={entry} />}
      {tab === 'Sources' && <SourcesTab entry={entry} barcode={barcode} />}
    </BottomSheet>
  )
}
