'use client'
// Camera QR reader for the game. Pure client (getUserMedia + jsQR on a hidden
// canvas). If the camera is unavailable (permissions, older browser), it fails
// soft — the caller always also offers the hand-typed 4-digit fallback, which
// is what the Playwright E2E drives.
import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

/** Longest edge fed to jsQR, in px. */
const SCAN_MAX_PX = 480
/** ~8 decodes a second. Faster than a person can present a code. */
const SCAN_INTERVAL_MS = 120

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

    // Decode a DOWNSCALED frame, and only a few times a second. A phone camera
    // hands us 1280x720 or larger; scanning that every animation frame pegs the
    // CPU, heats the phone and makes the preview stutter — over a whole evening
    // that is the difference between "it just works" and "my phone is hot and
    // the camera lags". A QR held up to the frame reads fine at this size.
    let lastScan = 0
    const tick = () => {
      if (stopped) return
      raf = requestAnimationFrame(tick)
      const v = videoRef.current
      if (!v || !ctx || v.readyState < v.HAVE_ENOUGH_DATA) return
      const now = performance.now()
      if (now - lastScan < SCAN_INTERVAL_MS) return
      lastScan = now
      const k = Math.min(1, SCAN_MAX_PX / Math.max(v.videoWidth, v.videoHeight))
      const w = Math.max(1, Math.round(v.videoWidth * k))
      const h = Math.max(1, Math.round(v.videoHeight * k))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      ctx.drawImage(v, 0, 0, w, h)
      const img = ctx.getImageData(0, 0, w, h)
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
      if (code?.data) onResultRef.current(code.data)
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
        setError(null) // recovered — e.g. permission granted on a later attempt
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

  // The <video> stays mounted even while the error is showing. Unmounting it
  // would drop the ref, so a retry (tab away and back, or granting permission
  // late) could never attach a stream — the camera would stay dead for the rest
  // of the evening after one denial.
  return (
    <div className="relative aspect-square w-full max-w-[260px] overflow-hidden rounded-2xl border border-line bg-black">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      {error ? (
        <p className="absolute inset-0 flex items-center justify-center bg-cream px-4 text-center text-[13px] leading-relaxed text-ink-soft">
          {error}
        </p>
      ) : (
        <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-white/80" />
      )}
    </div>
  )
}
