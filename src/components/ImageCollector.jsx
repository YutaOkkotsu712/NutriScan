import { useRef, useState } from 'react'
import ImageCropper from './ImageCropper'

export default function ImageCollector({ initialImage, onScan }) {
  const [images, setImages] = useState([])
  const [pendingCrop, setPendingCrop] = useState(initialImage || null)
  const cameraRef = useRef()
  const fileRef = useRef()

  function addImage(file) {
    const url = URL.createObjectURL(file)
    setImages(prev => [...prev, { file, url, id: Date.now() + Math.random() }])
  }

  function removeImage(id) {
    setImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img) URL.revokeObjectURL(img.url)
      return prev.filter(i => i.id !== id)
    })
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (file) setPendingCrop(file)
    e.target.value = ''
  }

  function handleCrop(croppedFile) {
    addImage(croppedFile)
    setPendingCrop(null)
  }

  function handleSkipCrop() {
    addImage(pendingCrop)
    setPendingCrop(null)
  }

  function handleScan() {
    if (images.length === 0) return
    onScan(images.map(i => i.file))
  }

  if (pendingCrop) {
    return (
      <ImageCropper
        imageFile={pendingCrop}
        onCrop={handleCrop}
        onSkip={handleSkipCrop}
      />
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 min-h-[80vh]">
      <div className="text-center mb-5">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Capture Label Photos</h2>
        <p className="text-sm text-gray-500">
          Take multiple photos to capture the full label — great for curved containers like Pringles, cans, or small packages
        </p>
      </div>

      {/* Image thumbnails */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {images.map((img, idx) => (
            <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-200">
              <img
                src={img.url}
                alt={`Photo ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => removeImage(img.id)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-xs font-bold"
              >
                ×
              </button>
              <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                {idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add more photos */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => cameraRef.current?.click()}
          className="flex-1 py-3 px-4 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl border-2 border-dashed border-gray-300 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 13a3 3 0 100-6 3 3 0 000 6z" />
          </svg>
          {images.length === 0 ? 'Take Photo' : 'Add Photo'}
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          className="flex-1 py-3 px-4 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl border-2 border-dashed border-gray-300 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {images.length === 0 ? 'Upload' : 'Add File'}
        </button>
      </div>

      {/* Tips */}
      {images.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-700 font-medium mb-2">Tips for best results:</p>
          <ul className="text-sm text-blue-600 space-y-1">
            <li>• Good lighting, avoid shadows on the label</li>
            <li>• One photo for nutrition facts table</li>
            <li>• Another photo for the ingredients list</li>
            <li>• Hold camera steady and close to the text</li>
          </ul>
        </div>
      )}

      {images.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-6">
          <p className="text-sm text-green-700">
            {images.length === 1
              ? 'Got 1 photo. Add more to capture the full label, or scan now.'
              : `Got ${images.length} photos. Add more or scan now — all photos will be merged for a complete analysis.`
            }
          </p>
        </div>
      )}

      {/* Scan button */}
      <button
        onClick={handleScan}
        disabled={images.length === 0}
        className={`w-full py-4 px-6 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${
          images.length > 0
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        {images.length <= 1 ? 'Analyze Label' : `Analyze ${images.length} Photos`}
      </button>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
