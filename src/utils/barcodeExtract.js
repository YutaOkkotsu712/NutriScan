// Product barcodes are numeric (EAN/UPC/GTIN, 6-14 digits). Packs often also
// carry promo QR codes with URLs, which the camera decodes far more easily
// than the striped barcode. We only accept URLs when they clearly contain a
// product code path such as /product/<ean> or GS1 Digital Link /01/<gtin>.
export function extractBarcode(decodedText) {
  const text = String(decodedText || '').trim()
  const urlCode = extractUrlBarcode(text)
  if (urlCode) return urlCode
  if (/^https?:/i.test(text)) return null // promo QR code, not a product barcode

  // GS1 Application Identifier 01 encodes a 14-digit GTIN. Some scanners emit
  // it as "(01)0890..." or "010890..." rather than only the GTIN.
  const aiMatch = text.match(/(?:^|\D)01\D*(\d{14})(?:\D|$)/)
  if (aiMatch) return canonicalizeBarcode(aiMatch[1])

  const digits = text.replace(/\D/g, '')
  if (digits.length === 16 && digits.startsWith('01')) {
    return canonicalizeBarcode(digits.slice(2))
  }
  // The digits must BE the code, not incidental digits inside QR text.
  if (digits.length < 6 || digits.length > 14) return null
  if (digits.length / text.length < 0.8) return null
  return canonicalizeBarcode(digits)
}

function canonicalizeBarcode(digits) {
  // GTIN-14 with leading 0 is the padded form of an EAN/UPC code. OFF accepts
  // either for many products, but using the shorter code matches package text.
  if (/^0\d{13}$/.test(digits)) return digits.slice(1)
  return digits
}

function extractUrlBarcode(text) {
  if (!/^https?:/i.test(text)) return null
  try {
    const url = new URL(text)
    const parts = url.pathname.split('/').map(p => p.trim()).filter(Boolean)
    for (let i = 0; i < parts.length; i += 1) {
      const part = decodeURIComponent(parts[i])
      const next = parts[i + 1] ? decodeURIComponent(parts[i + 1]) : ''
      if ((part === 'product' || part === 'products') && /^\d{6,14}$/.test(next)) {
        return canonicalizeBarcode(next)
      }
      if (part === '01' && /^\d{14}$/.test(next)) {
        return canonicalizeBarcode(next)
      }
      if (/^\d{6,14}$/.test(part)) return canonicalizeBarcode(part)
    }
  } catch {
    return null
  }
  return null
}
