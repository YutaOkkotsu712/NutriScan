// Ingredient deep dive (§5) — src/components/IngredientDeepDive.jsx (full replacement)
// Classification/parsing logic unchanged; row + legend styling on ZOCO tokens.
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

  // Only things explicitly matched as harmful/hidden-sugar/additive get flagged.
  return {
    name: ingredient.trim(),
    level: 'green',
    tag: 'OK',
    reason: 'No known concerns identified for this ingredient.',
  }
}

function parseIngredients(text) {
  if (!text) return []
  const parts = text
    .replace(/\.$/, '')
    .split(/,(?![^(]*\))/)
    .map(s => s.trim())
    .filter(s => s.length > 1)
  const flattened = parts.flatMap(p => p.split(/;/).map(s => s.trim()).filter(s => s.length > 1))
  return flattened
}

const LEVEL_STYLES = {
  red: { badge: 'bg-blush text-chili-ink', dot: 'bg-chili', count: 'text-chili-ink' },
  amber: { badge: 'bg-sand text-ochre', dot: 'bg-amberdot', count: 'text-ochre' },
  green: { badge: 'bg-mint text-deep', dot: 'bg-brand', count: 'text-deep' },
}

function IngredientRow({ item, index, position, onOpen, isLast }) {
  const style = LEVEL_STYLES[item.level]

  return (
    <div className="animate-fadeSlideIn" style={{ animationDelay: `${index * 30}ms` }}>
      <button
        onClick={onOpen}
        className={`w-full text-left py-2.5 transition-all active:scale-[0.99] ${isLast ? '' : 'border-b border-hairline'}`}
        style={{ minHeight: '44px' }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-mono text-faint shrink-0 w-4 text-right">{position}</span>
          <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
          <span className="text-[13.5px] text-fern flex-1 capitalize leading-tight">
            {item.name.toLowerCase()}
          </span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${style.badge}`}>
            {item.tag}
          </span>
          <svg className="w-3.5 h-3.5 text-faint shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className="bg-white border border-line rounded-[18px] p-4 animate-fadeSlideIn">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between"
      >
        <span className="font-display font-bold text-[15.5px] text-ink">{t('ingredients.title')}</span>
        <div className="flex items-center gap-2">
          {/* Summary dots */}
          <div className="flex items-center gap-1.5">
            {redCount > 0 && (
              <span className={`flex items-center gap-1 text-[10px] font-bold ${LEVEL_STYLES.red.count}`}>
                <span className={`w-2 h-2 rounded-full ${LEVEL_STYLES.red.dot}`} />
                {redCount}
              </span>
            )}
            {amberCount > 0 && (
              <span className={`flex items-center gap-1 text-[10px] font-bold ${LEVEL_STYLES.amber.count}`}>
                <span className={`w-2 h-2 rounded-full ${LEVEL_STYLES.amber.dot}`} />
                {amberCount}
              </span>
            )}
            {greenCount > 0 && (
              <span className={`flex items-center gap-1 text-[10px] font-bold ${LEVEL_STYLES.green.count}`}>
                <span className={`w-2 h-2 rounded-full ${LEVEL_STYLES.green.dot}`} />
                {greenCount}
              </span>
            )}
          </div>
          <span className="text-xs text-faint">{t('ingredients.items', { n: classified.length })}</span>
          <svg
            className={`w-4 h-4 text-faint transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="mt-3">
          {/* Legend */}
          <div className="flex items-center gap-3 mb-1 px-1">
            <span className="flex items-center gap-1 text-[10px] text-moss">
              <span className="w-2 h-2 rounded-full bg-chili" /> {t('ingredients.avoid')}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-moss">
              <span className="w-2 h-2 rounded-full bg-amberdot" /> {t('ingredients.review')}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-moss">
              <span className="w-2 h-2 rounded-full bg-brand" /> {t('ingredients.ok')}
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
              isLast={i === classified.length - 1}
              onOpen={() => setSelected(item)}
            />
          ))}

          <p className="text-[10px] text-faint mt-2 px-1">
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
