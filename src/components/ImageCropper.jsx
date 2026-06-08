import { useRef, useState, useEffect, useCallback } from 'react'

export default function ImageCropper({ imageFile, onCrop, onSkip }) {
  const containerRef = useRef(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 })
  const [crop, setCrop] = useState(null)
  const [dragging, setDragging] = useState(null)

  useEffect(() => {
    const reader = new FileReader()
    reader.onload = (e) => setImageUrl(e.target.result)
    reader.readAsDataURL(imageFile)
    return () => reader.readyState === FileReader.LOADING && reader.abort()
  }, [imageFile])

  useEffect(() => {
    if (!imageUrl) return
    const img = new Image()
    img.onload = () => {
      setImgSize({ w: img.width, h: img.height })

      const maxW = Math.min(window.innerWidth - 32, 500)
      const maxH = window.innerHeight * 0.55
      const scale = Math.min(maxW / img.width, maxH / img.height, 1)
      const dw = Math.round(img.width * scale)
      const dh = Math.round(img.height * scale)
      setDisplaySize({ w: dw, h: dh })

      const pad = 0.1
      setCrop({
        x: Math.round(dw * pad),
        y: Math.round(dh * pad),
        w: Math.round(dw * (1 - 2 * pad)),
        h: Math.round(dh * (1 - 2 * pad)),
      })
    }
    img.src = imageUrl
  }, [imageUrl])

  const getPointerPos = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const touch = e.touches?.[0] || e
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
  }, [])

  const handlePointerDown = useCallback((e) => {
    e.preventDefault()
    const pos = getPointerPos(e)
    if (!crop) return

    const edgeThreshold = 20
    const edges = {
      left: Math.abs(pos.x - crop.x) < edgeThreshold,
      right: Math.abs(pos.x - (crop.x + crop.w)) < edgeThreshold,
      top: Math.abs(pos.y - crop.y) < edgeThreshold,
      bottom: Math.abs(pos.y - (crop.y + crop.h)) < edgeThreshold,
    }

    const isInside = pos.x > crop.x && pos.x < crop.x + crop.w &&
                     pos.y > crop.y && pos.y < crop.y + crop.h

    if (edges.left || edges.right || edges.top || edges.bottom) {
      setDragging({ type: 'resize', edges, startPos: pos, startCrop: { ...crop } })
    } else if (isInside) {
      setDragging({ type: 'move', startPos: pos, startCrop: { ...crop } })
    }
  }, [crop, getPointerPos])

  const handlePointerMove = useCallback((e) => {
    if (!dragging || !crop) return
    e.preventDefault()
    const pos = getPointerPos(e)
    const dx = pos.x - dragging.startPos.x
    const dy = pos.y - dragging.startPos.y
    const sc = dragging.startCrop

    if (dragging.type === 'move') {
      setCrop({
        ...crop,
        x: Math.max(0, Math.min(displaySize.w - sc.w, sc.x + dx)),
        y: Math.max(0, Math.min(displaySize.h - sc.h, sc.y + dy)),
      })
    } else {
      let { x, y, w, h } = sc
      if (dragging.edges.left) { x += dx; w -= dx }
      if (dragging.edges.right) { w += dx }
      if (dragging.edges.top) { y += dy; h -= dy }
      if (dragging.edges.bottom) { h += dy }

      w = Math.max(50, w)
      h = Math.max(50, h)
      x = Math.max(0, Math.min(displaySize.w - 50, x))
      y = Math.max(0, Math.min(displaySize.h - 50, y))

      setCrop({ x, y, w: Math.min(w, displaySize.w - x), h: Math.min(h, displaySize.h - y) })
    }
  }, [dragging, crop, displaySize, getPointerPos])

  const handlePointerUp = useCallback(() => {
    setDragging(null)
  }, [])

  const handleCrop = useCallback(() => {
    if (!crop || !imageUrl) return

    const scaleX = imgSize.w / displaySize.w
    const scaleY = imgSize.h / displaySize.h

    const sx = Math.round(crop.x * scaleX)
    const sy = Math.round(crop.y * scaleY)
    const sw = Math.round(crop.w * scaleX)
    const sh = Math.round(crop.h * scaleY)

    const canvas = document.createElement('canvas')
    canvas.width = sw
    canvas.height = sh
    const ctx = canvas.getContext('2d')

    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
      canvas.toBlob((blob) => {
        const croppedFile = new File([blob], 'cropped.png', { type: 'image/png' })
        onCrop(croppedFile)
      }, 'image/png')
    }
    img.src = imageUrl
  }, [crop, imageUrl, imgSize, displaySize, onCrop])

  if (!imageUrl || !crop) return null

  return (
    <div className="flex flex-col items-center px-4 py-6 min-h-[80vh]">
      <p className="text-sm text-gray-600 mb-3 text-center">
        Drag the box to cover the nutrition label, then tap Scan
      </p>

      <div
        ref={containerRef}
        className="relative select-none touch-none"
        style={{ width: displaySize.w, height: displaySize.h }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        <img
          src={imageUrl}
          className="block w-full h-full"
          style={{ width: displaySize.w, height: displaySize.h }}
          draggable={false}
          alt="Captured"
        />

        {/* Darkened overlay outside crop area */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bg-black/50" style={{ top: 0, left: 0, right: 0, height: crop.y }} />
          <div className="absolute bg-black/50" style={{ top: crop.y + crop.h, left: 0, right: 0, bottom: 0 }} />
          <div className="absolute bg-black/50" style={{ top: crop.y, left: 0, width: crop.x, height: crop.h }} />
          <div className="absolute bg-black/50" style={{ top: crop.y, left: crop.x + crop.w, right: 0, height: crop.h }} />
        </div>

        {/* Crop border with corner handles */}
        <div
          className="absolute border-2 border-green-400 pointer-events-none"
          style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h }}
        >
          {/* Corner handles */}
          {[
            { top: -6, left: -6 },
            { top: -6, right: -6 },
            { bottom: -6, left: -6 },
            { bottom: -6, right: -6 },
          ].map((pos, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 bg-white border-2 border-green-500 rounded-full"
              style={pos}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-4 w-full max-w-xs">
        <button
          onClick={onSkip}
          className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
        >
          Scan Full Image
        </button>
        <button
          onClick={handleCrop}
          className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
        >
          Scan Selection
        </button>
      </div>
    </div>
  )
}
