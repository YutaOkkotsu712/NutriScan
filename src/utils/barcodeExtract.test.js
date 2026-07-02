import { describe, it, expect } from 'vitest'
import { extractBarcode } from './barcodeExtract.js'

// The camera decodes whatever it sees first — often a promo QR code, which
// decodes far more easily than the striped EAN barcode. Only clean numeric
// product codes may reach the lookup.
describe('extractBarcode', () => {
  it('accepts EAN-13 / EAN-8 / UPC-A codes', () => {
    expect(extractBarcode('8901058851298')).toBe('8901058851298')
    expect(extractBarcode('12345670')).toBe('12345670')
    expect(extractBarcode('036000291452')).toBe('036000291452')
  })

  it('tolerates scanner whitespace and separators', () => {
    expect(extractBarcode(' 8901058851298 ')).toBe('8901058851298')
    expect(extractBarcode('8 901058 851298')).toBe('8901058851298')
  })

  it('rejects promo QR URLs (the classic pack QR code)', () => {
    expect(extractBarcode('https://www.maggi.in/promo2026')).toBeNull()
    expect(extractBarcode('HTTP://CADBURY.IN/WIN')).toBeNull()
  })

  it('accepts product URLs and GS1 Digital Link URLs', () => {
    expect(extractBarcode('https://world.openfoodfacts.org/product/8901058851298/maggi'))
      .toBe('8901058851298')
    expect(extractBarcode('https://id.gs1.org/01/08901058851298'))
      .toBe('8901058851298')
  })

  it('accepts GS1 AI 01 scanner text', () => {
    expect(extractBarcode('(01)08901058851298')).toBe('8901058851298')
    expect(extractBarcode('0108901058851298')).toBe('8901058851298')
  })

  it('rejects QR text where digits are incidental', () => {
    expect(extractBarcode('WIN PRIZES CODE 123456 VISIT STORE TODAY')).toBeNull()
    expect(extractBarcode('upi://pay?pa=shop@bank&am=10')).toBeNull()
  })

  it('rejects codes outside 6–14 digits and empty input', () => {
    expect(extractBarcode('12345')).toBeNull()
    expect(extractBarcode('123456789012345')).toBeNull()
    expect(extractBarcode('')).toBeNull()
    expect(extractBarcode(undefined)).toBeNull()
  })
})
