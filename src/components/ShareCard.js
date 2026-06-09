/**
 * Generate a shareable results card as a PNG image.
 * Uses Canvas API — no external libraries.
 */

const SCORE_COLORS = {
  bad: { bg: '#fef2f2', ring: '#ef4444', text: '#991b1b' },
  ok: { bg: '#fff7ed', ring: '#f97316', text: '#9a3412' },
  mid: { bg: '#fefce8', ring: '#eab308', text: '#854d0e' },
  good: { bg: '#f0fdf4', ring: '#22c55e', text: '#166534' },
}

function getColors(score) {
  if (score <= 3) return SCORE_COLORS.bad
  if (score <= 5) return SCORE_COLORS.ok
  if (score <= 7) return SCORE_COLORS.mid
  return SCORE_COLORS.good
}

const CATEGORY_ICONS = {
  calories: '\u{1F525}',  // 🔥
  sugars: '\u{1F36C}',    // 🍬
  fats: '\u{1F9C8}',      // 🧈
  sodium: '\u{1F9C2}',    // 🧂
  fiber: '\u{1F33E}',     // 🌾
  processing: '⚙️', // ⚙️
  additives: '\u{1F9EA}', // 🧪
}

const CATEGORY_LABELS = {
  calories: 'Calories',
  sugars: 'Sugars',
  fats: 'Fats',
  sodium: 'Sodium',
  protein: 'Protein',
  fiber: 'Fiber',
  processing: 'Processing',
  additives: 'Additives',
}

export async function generateShareImage(result) {
  const W = 600
  const H = 860
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, W, H)

  // Header bar
  ctx.fillStyle = '#16a34a'
  ctx.fillRect(0, 0, W, 70)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 26px -apple-system, Arial, sans-serif'
  ctx.fillText('\u{1F52C} NutriScan', 24, 46)

  // Product name
  ctx.fillStyle = '#1e293b'
  ctx.font = 'bold 22px -apple-system, Arial, sans-serif'
  const name = result.productName || 'Product'
  const truncName = name.length > 40 ? name.slice(0, 37) + '...' : name
  ctx.fillText(truncName, 24, 110)

  // Score circle
  const colors = getColors(result.overallScore)
  const cx = W / 2
  const cy = 230
  const r = 70

  // Ring background
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 12
  ctx.stroke()

  // Ring progress
  const progress = result.overallScore / 10
  ctx.beginPath()
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2)
  ctx.strokeStyle = colors.ring
  ctx.lineWidth = 12
  ctx.lineCap = 'round'
  ctx.stroke()

  // Score text
  ctx.fillStyle = colors.text
  ctx.font = 'bold 48px -apple-system, Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(result.overallScore.toFixed(1), cx, cy + 16)
  ctx.font = '14px -apple-system, Arial, sans-serif'
  ctx.fillStyle = '#64748b'
  ctx.fillText('out of 10', cx, cy + 38)

  // Score label badge
  ctx.fillStyle = colors.bg
  const labelW = ctx.measureText(result.scoreLabel).width + 32
  roundRect(ctx, cx - labelW / 2, cy + 52, labelW, 30, 15)
  ctx.fill()
  ctx.fillStyle = colors.text
  ctx.font = 'bold 14px -apple-system, Arial, sans-serif'
  ctx.fillText(result.scoreLabel, cx, cy + 72)

  // Category bars
  ctx.textAlign = 'left'
  const cats = ['calories', 'sugars', 'fats', 'sodium', 'protein', 'fiber', 'processing', 'additives']
  const barY = 340
  const barH = 28
  const barGap = 36

  for (let i = 0; i < cats.length; i++) {
    const cat = cats[i]
    const data = result.categories?.[cat]
    if (!data) continue

    const y = barY + i * barGap
    const catColors = getColors(data.score)

    // Label
    ctx.fillStyle = '#475569'
    ctx.font = '13px -apple-system, Arial, sans-serif'
    ctx.fillText(`${CATEGORY_LABELS[cat]}`, 24, y + 18)

    // Score
    ctx.textAlign = 'right'
    ctx.fillStyle = catColors.text
    ctx.font = 'bold 13px -apple-system, Arial, sans-serif'
    ctx.fillText(`${data.score}/10`, W - 24, y + 18)

    // Bar background
    const barX = 140
    const barW = W - 200
    ctx.fillStyle = '#e2e8f0'
    roundRect(ctx, barX, y + 4, barW, 16, 8)
    ctx.fill()

    // Bar fill
    ctx.fillStyle = catColors.ring
    const fillW = Math.max(barW * (data.score / 10), 8)
    roundRect(ctx, barX, y + 4, fillW, 16, 8)
    ctx.fill()

    ctx.textAlign = 'left'
  }

  // Misleading claims callout (if any)
  const misleading = (result.claims || []).filter(c => c.isMisleading)
  if (misleading.length > 0) {
    const claimY = barY + cats.length * barGap + 10
    ctx.fillStyle = '#fef2f2'
    roundRect(ctx, 16, claimY, W - 32, 50, 12)
    ctx.fill()
    ctx.strokeStyle = '#fecaca'
    ctx.lineWidth = 1
    roundRect(ctx, 16, claimY, W - 32, 50, 12)
    ctx.stroke()

    ctx.fillStyle = '#991b1b'
    ctx.font = 'bold 13px -apple-system, Arial, sans-serif'
    ctx.fillText(`⚠️ ${misleading.length} misleading claim${misleading.length > 1 ? 's' : ''} detected`, 32, claimY + 22)
    ctx.fillStyle = '#b91c1c'
    ctx.font = '12px -apple-system, Arial, sans-serif'
    const claimText = misleading.map(c => `"${c.claim}"`).join(', ')
    const truncClaim = claimText.length > 65 ? claimText.slice(0, 62) + '...' : claimText
    ctx.fillText(truncClaim, 32, claimY + 40)
  }

  // Footer
  ctx.fillStyle = '#94a3b8'
  ctx.font = '12px -apple-system, Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Scanned with NutriScan — WHO-aligned food health scores', W / 2, H - 24)

  return canvas.toDataURL('image/png')
}

export async function shareResult(result) {
  const imageDataUrl = await generateShareImage(result)

  // Convert data URL to blob
  const res = await fetch(imageDataUrl)
  const blob = await res.blob()
  const file = new File([blob], 'nutriscan-result.png', { type: 'image/png' })

  // Try native share (works on mobile)
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: `NutriScan: ${result.productName} scored ${result.overallScore}/10`,
        text: `${result.productName} scored ${result.overallScore}/10 on NutriScan's WHO-aligned health analysis.`,
        files: [file],
      })
      return 'shared'
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled'
    }
  }

  // Fallback: download the image
  const link = document.createElement('a')
  link.href = imageDataUrl
  link.download = 'nutriscan-result.png'
  link.click()
  return 'downloaded'
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
