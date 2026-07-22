'use client'
// Camera QR reader for the game. Pure client (getUserMedia + jsQR on a hidden
// canvas). If the camera is unavailable (permissions, older browser), it fails
// soft — the caller always also offers the hand-typed 4-digit fallback, which
// is what the Playwright E2E drives.
import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

export default function QrScanner({
  active,
  onResult,
}: {
  active: boolean
  onResult: (text: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  // Latest callback, read from inside the rAF loop. Synced in an effect (not
  // during render) so the loop never restarts just because the parent re-rendered.
  const onResultRef = useRef(onResult)
  useEffect(() => {
    onResultRef.current = onResult
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!active) return
    let stream: MediaStream | null = null
    let raf = 0
    let stopped = false
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    const tick = () => {
      if (stopped) return
      const v = videoRef.current
      if (v && ctx && v.readyState >= v.HAVE_ENOUGH_DATA) {
        canvas.width = v.videoWidth
        canvas.height = v.videoHeight
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
        if (code?.data) onResultRef.current(code.data)
      }
      raf = requestAnimationFrame(tick)
    }

    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        const v = videoRef.current
        if (!v) return
        v.srcObject = stream
        await v.play()
        raf = requestAnimationFrame(tick)
      } catch {
        setError('カメラを使えません。下の番号入力でつなげます。')
      }
    })()

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [active])

  if (error) {
    return <p className="rounded-xl bg-cream px-3 py-2 text-center text-[13px] text-ink-soft">{error}</p>
  }
  return (
    <div className="relative aspect-square w-full max-w-[260px] overflow-hidden rounded-2xl border border-line bg-black">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-white/80" />
    </div>
  )
}
