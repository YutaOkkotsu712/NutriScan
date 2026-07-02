// Product barcodes are numeric (EAN/UPC/GTIN, 6–14 digits). Packs often also
// carry promo QR codes with URLs, which the camera decodes far more easily
// than the striped barcode — those must NOT be treated as a product code.
export function extractBarcode(decodedText) {
  const text = String(decodedText || '').trim()
  if (/^https?:/i.test(text)) return null // promo QR code, not a barcode
  const digits = text.replace(/\D/g, '')
  // The digits must BE the code, not incidental digits inside QR text.
  if (digits.length < 6 || digits.length > 14) return null
  if (digits.length / text.length < 0.8) return null
  return digits
}
