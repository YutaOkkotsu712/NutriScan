export default function SwapCard({ suggestion }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">💡</span>
        <span className="font-semibold text-blue-800">Healthier Alternative</span>
      </div>
      <p className="text-sm text-blue-700 leading-snug">{suggestion}</p>
    </div>
  )
}
