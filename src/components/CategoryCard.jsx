// Category score card — src/components/CategoryCard.jsx (full replacement)
// Emoji icons → line icons; status tints → ZOCO tokens. Logic unchanged.
import { useT } from '../i18n'

const ICON_PATHS = {
  calories: <path d="M12 21a6 6 0 006-6c0-3-2.5-4.5-6-9-3.5 4.5-6 6-6 9a6 6 0 006 6z" />,
  sugars: <><rect x="5" y="8" width="14" height="12" rx="2" /><path d="M8 8l2-4h4l2 4M9.5 12.5h.01M14.5 14.5h.01M11.5 16.5h.01" /></>,
  fats: <path d="M12 21a6 6 0 006-6c0-4-6-11-6-11S6 11 6 15a6 6 0 006 6z" />,
  sodium: <><rect x="8" y="9" width="8" height="12" rx="2" /><path d="M9 9l1-5h4l1 5M10.5 13h.01M13.5 15h.01M11.5 17h.01" /></>,
  protein: <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />,
  fiber: <path d="M12 21V8M12 8C12 5 10 3 7 3c0 3 2 5 5 5zm0 0c0-3 2-5 5-5 0 3-2 5-5 5z" />,
  processing: <><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.2 2.2M16.9 16.9l2.2 2.2M19.1 4.9L16.9 7.1M7.1 16.9l-2.2 2.2" /></>,
  additives: <path d="M10 3v6l-5 9a2 2 0 001.8 3h10.4a2 2 0 001.8-3l-5-9V3M8 3h8" />,
}

function getTone(score) {
  if (score <= 3) return { card: 'bg-blush border-blush-line', badge: 'bg-blush-line/60 text-chili-ink', bar: 'bg-chili', icon: 'text-chili-ink' }
  if (score <= 6) return { card: 'bg-sand border-sand-line', badge: 'bg-sand-line/60 text-ochre', bar: 'bg-amberdot', icon: 'text-ochre' }
  return { card: 'bg-mint border-mint', badge: 'bg-white/60 text-deep', bar: 'bg-brand', icon: 'text-deep' }
}

export default function CategoryCard({ category, data, index = 0 }) {
  const { t } = useT()
  const tone = getTone(data.score)
  return (
    <div
      className={`rounded-[18px] border p-4 animate-fadeSlideIn ${tone.card}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg className={`w-[17px] h-[17px] shrink-0 ${tone.icon}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {ICON_PATHS[category]}
          </svg>
          <span className="font-display font-bold text-sm text-ink">{t(`category.${category}`)}</span>
        </div>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${tone.badge}`}>
          {data.score}/10
        </span>
      </div>

      {/* Score bar */}
      <div className="w-full bg-white/60 rounded-full h-[5px] mb-2 overflow-hidden">
        <div
          className={`h-full rounded-full animate-barGrow ${tone.bar}`}
          style={{
            width: `${data.score * 10}%`,
            animationDelay: `${index * 80 + 200}ms`,
          }}
        />
      </div>

      <p className="text-[13px] text-fern leading-snug">{data.verdict}</p>
    </div>
  )
}
