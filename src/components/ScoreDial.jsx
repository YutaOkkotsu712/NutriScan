import { useEffect, useState } from 'react'

function getScoreColor(score) {
  if (score <= 3) return { ring: '#ef4444', bg: '#fef2f2', text: '#991b1b' }
  if (score <= 5) return { ring: '#f97316', bg: '#fff7ed', text: '#9a3412' }
  if (score <= 7) return { ring: '#eab308', bg: '#fefce8', text: '#854d0e' }
  return { ring: '#22c55e', bg: '#f0fdf4', text: '#166534' }
}

export default function ScoreDial({ score, label }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const colors = getScoreColor(score)

  useEffect(() => {
    let frame
    const start = performance.now()
    const duration = 1200

    const animate = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(eased * score)
      if (progress < 1) frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [score])

  const radius = 80
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (animatedScore / 10) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-52 h-52">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle
            cx="100" cy="100" r={radius}
            fill="none" stroke="#e5e7eb" strokeWidth="12"
          />
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke={colors.ring}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke 0.3s' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold" style={{ color: colors.text }}>
            {animatedScore.toFixed(1)}
          </span>
          <span className="text-sm text-gray-500 mt-1">out of 10</span>
        </div>
      </div>
      <span
        className="text-lg font-semibold px-4 py-1 rounded-full"
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        {label}
      </span>
    </div>
  )
}
