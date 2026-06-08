function loadImage(imageSource) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)

    if (typeof imageSource === 'string') {
      img.src = imageSource
    } else {
      const reader = new FileReader()
      reader.onload = (e) => { img.src = e.target.result }
      reader.readAsDataURL(imageSource)
    }
  })
}

function resizeToCanvas(img, maxDim = 2000) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  let { width, height } = img
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  canvas.width = width
  canvas.height = height
  ctx.drawImage(img, 0, 0, width, height)
  return { canvas, ctx, width, height }
}

function toGrayscale(imageData) {
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    data[i] = data[i + 1] = data[i + 2] = gray
  }
}

function stretchContrast(imageData) {
  const data = imageData.data
  const len = data.length

  const histogram = new Uint32Array(256)
  for (let i = 0; i < len; i += 4) histogram[data[i]]++

  const totalPixels = len / 4
  const clipCount = Math.floor(totalPixels * 0.01)

  let min = 0, max = 255
  let cumulative = 0
  for (let i = 0; i < 256; i++) {
    cumulative += histogram[i]
    if (cumulative > clipCount) { min = i; break }
  }
  cumulative = 0
  for (let i = 255; i >= 0; i--) {
    cumulative += histogram[i]
    if (cumulative > clipCount) { max = i; break }
  }

  const range = max - min || 1
  for (let i = 0; i < len; i += 4) {
    const val = Math.round(((Math.min(Math.max(data[i], min), max) - min) / range) * 255)
    data[i] = data[i + 1] = data[i + 2] = val
  }
}

// Enhanced: grayscale + contrast stretch (safe, preserves details)
export async function preprocessImage(imageSource) {
  const img = await loadImage(imageSource)
  const { canvas, ctx, width, height } = resizeToCanvas(img)

  const imageData = ctx.getImageData(0, 0, width, height)
  toGrayscale(imageData)
  stretchContrast(imageData)
  ctx.putImageData(imageData, 0, 0)

  return canvas.toDataURL('image/png')
}

// Inverted: for white text on dark/colored backgrounds
export async function preprocessImageInverted(imageSource) {
  const img = await loadImage(imageSource)
  const { canvas, ctx, width, height } = resizeToCanvas(img)

  const imageData = ctx.getImageData(0, 0, width, height)
  toGrayscale(imageData)

  const data = imageData.data
  let darkPixels = 0
  const total = width * height
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 128) darkPixels++
  }

  if (darkPixels > total * 0.3) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = data[i + 1] = data[i + 2] = 255 - data[i]
    }
  }

  stretchContrast(imageData)
  ctx.putImageData(imageData, 0, 0)

  return canvas.toDataURL('image/png')
}

// Original: just resized, no processing (let Tesseract handle it)
export async function getOriginalDataUrl(imageSource) {
  const img = await loadImage(imageSource)
  const { canvas } = resizeToCanvas(img)
  return canvas.toDataURL('image/jpeg', 0.92)
}
