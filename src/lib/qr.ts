// QR → SVG string. We build the SVG from the module matrix (rather than the
// lib's default tag) so we control the colors: ink modules on a cream ground
// that blends into the ticket stub. Used on the ticket page; the OG edge
// function keeps a JS twin at functions/_lib/qr.js — keep them in sync.
import qrcode from 'qrcode-generator'

interface QrOpts {
  dark?: string
  light?: string
  margin?: number // quiet-zone modules
  cell?: number // px per module
}

export function qrSvg(text: string, opts: QrOpts = {}): string {
  const { dark = '#1d1411', light = '#fff7ef', margin = 1, cell = 4 } = opts
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  const n = qr.getModuleCount()
  const size = (n + margin * 2) * cell
  let path = ''
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!qr.isDark(r, c)) continue
      const x = (c + margin) * cell
      const y = (r + margin) * cell
      path += `M${x},${y}h${cell}v${cell}h-${cell}z`
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="${light}"/>` +
    `<path d="${path}" fill="${dark}"/></svg>`
  )
}

/** SVG string → data: URL for an <img src> (scales to the <img> box via viewBox). */
export function qrDataUrl(text: string, opts: QrOpts = {}): string {
  return 'data:image/svg+xml;base64,' + btoa(qrSvg(text, opts))
}
