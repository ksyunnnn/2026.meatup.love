'use client'

// Tap/click the oniku mascot to make it react (the 2026 take on 2018's hover
// "jiggle"). onClick covers mouse, touch, and keyboard, so it works on phones.
//
// Mount entrance plays a short sequence: the mascot drops in from the top and
// lands with a bounce (bounceInDown), then jiggles a couple of times — the 2018
// squash-and-stretch feel (rubberBand, whose keyframes are byte-identical to
// Semantic UI's "jiggle"). After that it sits still until tapped.
//
// Tapping escalates through progressively wilder animations (and speeds them up)
// the harder you mash, then decays back to calm. animate.css ships its own
// prefers-reduced-motion handling.
import { useCallback, useRef, useState } from 'react'
import { Oniku } from './oniku'

const STEPS = [
  'animate__rubberBand', // == 2018's Semantic UI "jiggle"
  'animate__jello',
  'animate__wobble',
  'animate__tada',
  'animate__jackInTheBox',
]
// Played in order on first load: drop-and-land, then a single jiggle.
const INTRO = ['animate__bounceInDown', STEPS[0]]
const DECAY_MS = 1200

export function BounceOniku({ className }: { className?: string }) {
  const [anim, setAnim] = useState<string>(INTRO[0]) // current classes ('' = still)
  const [seq, setSeq] = useState(0) // remount counter → (re)starts the animation
  const phase = useRef(1) // next INTRO index to play (>= length once intro is done)
  const level = useRef(0) // tap escalation level
  const decay = useRef<ReturnType<typeof setTimeout> | null>(null)

  const play = (cls: string) => {
    setAnim(cls)
    setSeq((s) => s + 1)
  }

  const onTap = useCallback(() => {
    phase.current = INTRO.length // cancel any remaining intro
    level.current = Math.min(level.current + 1, STEPS.length - 1)
    play(STEPS[level.current])
    if (decay.current) clearTimeout(decay.current)
    decay.current = setTimeout(() => {
      level.current = 0
      setAnim('')
    }, DECAY_MS)
  }, [])

  const onEnd = useCallback(() => {
    if (phase.current < INTRO.length) {
      play(INTRO[phase.current]) // advance the mount sequence
      phase.current += 1
    } else {
      setAnim('') // settle and sit still (no remount → no extra replay)
    }
  }, [])

  // Base ~0.75s (matches 2018's jiggle), then faster as taps escalate.
  const duration = Math.max(0.4, 0.75 - level.current * 0.08)

  return (
    <button
      type="button"
      aria-label="meatup"
      onClick={onTap}
      className={`${className} cursor-pointer touch-manipulation select-none border-0 bg-transparent p-0`}
      style={{
        ['--animate-duration' as string]: `${duration}s`,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        key={seq}
        onAnimationEnd={onEnd}
        className={`block ${anim ? `animate__animated ${anim}` : ''}`}
      >
        <Oniku className="h-full w-full" />
      </span>
    </button>
  )
}
