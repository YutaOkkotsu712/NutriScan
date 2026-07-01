import { useState, useMemo } from 'react'
import { HIDDEN_SUGARS, INGREDIENT_FLAGS } from '../utils/additiveFlags'
import IngredientDetailSheet from './IngredientDetailSheet'
import { useT } from '../i18n'

// INS / E-number pattern
const INS_E_REGEX = /\b(?:INS|E)\s*\d{3,4}[a-z]?\b/gi

function classifyIngredient(ingredient) {
  const lower = ingredient.toLowerCase().trim()
  if (!lower || lower.length < 2) return null

  // Check harmful / high concern
  for (const flag of INGREDIENT_FLAGS) {
    for (const term of flag.terms) {
      if (lower.includes(term)) {
        return {
          name: ingredient.trim(),
          level: flag.concern === 'high' ? 'red' : 'amber',
          tag: flag.concern === 'high' ? 'Avoid' : 'Review',
          reason: flag.reason,
        }
      }
    }
  }

  // Check hidden sugars
  for (const sugar of HIDDEN_SUGARS) {
    if (lower.includes(sugar)) {
      return {
        name: ingredient.trim(),
        level: 'amber',
        tag: 'Hidden sugar',
        reason: 'This is an added/free sugar source — contributes to total sugar intake.',
      }
    }
  }

  // Check INS/E numbers
  const insMatch = ingredient.match(INS_E_REGEX)
  if (insMatch) {
    return {
      name: ingredient.trim(),
      level: 'amber',
      tag: 'Additive',
      reason: 'Food additive — check specific code for safety details.',
    }
  }

  // If it passed all the harmful checks above, it's fine.
  // Only things explicitly matched as harmful/hidden-sugar/additive get flagged.
  // This avoids false positives on non-English ingredient names.
  return {
    name: ingredient.trim(),
    level: 'green',
    tag: 'OK',
    reason: 'No known concerns identified for this ingredient.',
  }
}

function parseIngredients(text) {
  if (!text) return []

  // Split by commas, semicolons, or periods (common separators)
  // But preserve parenthetical content as part of the ingredient
  const parts = text
    .replace(/\.$/, '') // remove trailing period
    .split(/,(?![^(]*\))/) // split on commas not inside parens
    .map(s => s.trim())
    .filter(s => s.length > 1)

  // Further split by semicolons
  const flattened = parts.flatMap(p => p.split(/;/).map(s => s.trim()).filter(s => s.length > 1))

  return flattened
}

const LEVEL_STYLES = {
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-500 text-white',
    dot: 'bg-red-500',
    text: 'text-red-700',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-500 text-white',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-600 text-white',
    dot: 'bg-green-500',
    text: 'text-green-700',
  },
}

function IngredientRow({ item, index, position, onOpen }) {
  const style = LEVEL_STYLES[item.level]

  return (
    <div className="animate-fadeSlideIn" style={{ animationDelay: `${index * 30}ms` }}>
      <button
        onClick={onOpen}
        className={`w-full text-left rounded-lg p-2.5 border transition-all active:scale-[0.99] ${style.bg} ${style.border}`}
        style={{ minHeight: '44px' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-gray-400 shrink-0 w-4 text-right">{position}</span>
          <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
          <span className="text-sm text-gray-800 flex-1 capitalize leading-tight underline decoration-dotted decoration-gray-300 underline-offset-2">
            {item.name.toLowerCase()}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${style.badge}`}>
            {item.tag}
          </span>
          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    </div>
  )
}

export default function IngredientDeepDive({ ingredientText, barcode }) {
  const { t } = useT()
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  const classified = useMemo(() => {
    const raw = parseIngredients(ingredientText)
    return raw.map(classifyIngredient).filter(Boolean)
  }, [ingredientText])

  if (!ingredientText || classified.length === 0) return null

  const redCount = classified.filter(i => i.level === 'red').length
  const amberCount = classified.filter(i => i.level === 'amber').length
  const greenCount = classified.filter(i => i.level === 'green').length

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 animate-fadeSlideIn">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🧬</span>
          <span className="font-semibold text-gray-800">{t('ingredients.title')}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Summary dots */}
          <div className="flex items-center gap-1.5">
            {redCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-600">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {redCount}
              </span>
            )}
            {amberCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {amberCount}
              </span>
            )}
            {greenCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-green-600">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {greenCount}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400">{t('ingredients.items', { n: classified.length })}</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-1.5">
          {/* Legend */}
          <div className="flex items-center gap-3 mb-2 px-1">
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="w-2 h-2 rounded-full bg-red-500" /> {t('ingredients.avoid')}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> {t('ingredients.review')}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="w-2 h-2 rounded-full bg-green-500" /> {t('ingredients.ok')}
            </span>
          </div>

          {/* Original label order — ingredients are declared in descending
              order of composition, so we preserve it (spec §5.1). Concern is
              conveyed by the colour dot/badge, not by re-sorting. */}
          {classified.map((item, i) => (
            <IngredientRow
              key={`${item.name}-${i}`}
              item={item}
              index={i}
              position={i + 1}
              onOpen={() => setSelected(item)}
            />
          ))}

          <p className="text-[10px] text-gray-400 mt-2 px-1">
            {t('ingredients.tapHint')}
          </p>
        </div>
      )}

      <IngredientDetailSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        ingredient={selected?.name}
        fallback={selected}
        barcode={barcode}
      />
    </div>
  )
}
