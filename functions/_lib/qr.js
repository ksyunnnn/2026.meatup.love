// QR → SVG string (JS twin of src/lib/qr.ts — keep in sync). Built from the
// module matrix so we control the colors; returned as an SVG <img> source for
// Satori/workers-og to rasterize.
import qrcode from 'qrcode-generator'

export function qrSvg(text, opts = {}) {
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

/** SVG string → a data: URL usable as an <img src> in Satori. */
export function qrDataUrl(text, opts) {
  return 'data:image/svg+xml;base64,' + btoa(qrSvg(text, opts))
}
