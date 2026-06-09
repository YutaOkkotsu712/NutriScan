const ICONS = {
  calories: '\u{1F525}',
  sugars: '\u{1F36C}',
  fats: '\u{1F9C8}',
  sodium: '\u{1F9C2}',
  protein: '\u{1F4AA}',
  fiber: '\u{1F33E}',
  processing: '⚙️',
  additives: '\u{1F9EA}',
}

const LABELS = {
  calories: 'Calories',
  sugars: 'Sugars',
  fats: 'Fats',
  sodium: 'Sodium',
  protein: 'Protein',
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

function getBarColor(score) {
  if (score <= 3) return 'bg-red-400'
  if (score <= 6) return 'bg-amber-400'
  return 'bg-green-400'
}

export default function CategoryCard({ category, data, index = 0 }) {
  return (
    <div
      className={`rounded-xl border p-4 animate-fadeSlideIn ${getCardStyle(data.score)}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{ICONS[category]}</span>
          <span className="font-semibold text-gray-800">{LABELS[category]}</span>
        </div>
        <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${getScoreBadge(data.score)}`}>
          {data.score}/10
        </span>
      </div>

      {/* Score bar */}
      <div className="w-full bg-white/60 rounded-full h-1.5 mb-2 overflow-hidden">
        <div
          className={`h-1.5 rounded-full animate-barGrow ${getBarColor(data.score)}`}
          style={{
            width: `${data.score * 10}%`,
            animationDelay: `${index * 80 + 200}ms`,
          }}
        />
      </div>

      <p className="text-sm text-gray-600 leading-snug">{data.verdict}</p>
    </div>
  )
}
