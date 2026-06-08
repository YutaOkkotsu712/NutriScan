const ICONS = {
  sugars: '🍬',
  fats: '🧈',
  sodium: '🧂',
  fiber: '🌾',
  processing: '⚙️',
  additives: '🧪',
}

const LABELS = {
  sugars: 'Sugars',
  fats: 'Fats',
  sodium: 'Sodium',
  fiber: 'Fiber',
  processing: 'Processing',
  additives: 'Additives',
}

function getCardStyle(score) {
  if (score <= 3) return 'bg-red-50 border-red-200'
  if (score <= 6) return 'bg-amber-50 border-amber-200'
  return 'bg-green-50 border-green-200'
}

function getScoreBadge(score) {
  if (score <= 3) return 'bg-red-500 text-white'
  if (score <= 6) return 'bg-amber-500 text-white'
  return 'bg-green-500 text-white'
}

export default function CategoryCard({ category, data }) {
  return (
    <div className={`rounded-xl border p-4 ${getCardStyle(data.score)}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{ICONS[category]}</span>
          <span className="font-semibold text-gray-800">{LABELS[category]}</span>
        </div>
        <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${getScoreBadge(data.score)}`}>
          {data.score}/10
        </span>
      </div>
      <p className="text-sm text-gray-600 leading-snug">{data.verdict}</p>
    </div>
  )
}
