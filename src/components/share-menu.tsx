'use client'
// One share control, two honest routes — adapted to the input device, the way
// Apple's action sheets and Material's bottom sheets both do it:
//   - touch (pointer: coarse) → an action sheet from the BOTTOM, where the thumb
//     actually reaches (the top corners are the hardest place to tap one-handed).
//   - pointer (mouse/trackpad) → a popover anchored to the trigger (proximity).
// Either way the rows are the same and each is tagged with the apps it serves,
// so the glyphs ARE the routing legend:
//   - リンクで共有 → url as text, so X/LINE render the OGP card (🐦 💬)
//   - 画像で共有   → the OGP image as a file, so it can go to a story (📷)
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { InstagramIcon, LineIcon, ShareIcon, TwitterIcon } from './icons'

type Props = {
  shareLink: () => void | Promise<void>
  shareImage: () => void | Promise<void>
  variant?: 'icon' | 'button'
}

export default function ShareMenu({ shareLink, shareImage, variant = 'icon' }: Props) {
  const [open, setOpen] = useState(false)
  const [coarse, setCoarse] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const firstItemRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  // Decide the presentation AFTER mount, so the static HTML never depends on it
  // (and there's no hydration mismatch — the menu itself only renders on open).
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const sync = () => setCoarse(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!open) return
    firstItemRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    // Popover dismisses on an outside tap; the sheet uses its backdrop instead
    // (its panel lives in a portal, so it isn't "inside" the trigger root).
    let onDown: ((e: PointerEvent) => void) | undefined
    if (coarse) {
      document.body.style.overflow = 'hidden'
    } else {
      onDown = (e) => {
        if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
      }
      document.addEventListener('pointerdown', onDown)
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      if (onDown) document.removeEventListener('pointerdown', onDown)
      document.body.style.overflow = ''
    }
  }, [open, coarse])

  function close() {
    setOpen(false)
  }
  // Run the chosen action inside the click so the share sheet keeps the user
  // activation (iOS). Close first; the menu unmounts, the action proceeds.
  function run(action: () => void | Promise<void>) {
    setOpen(false)
    void action()
  }

  // Up/Down cycle between the routes for keyboard users (scoped to this menu).
  function onMenuKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    )
    const i = items.indexOf(document.activeElement as HTMLElement)
    const next = e.key === 'ArrowDown' ? i + 1 : i - 1
    items[(next + items.length) % items.length]?.focus()
  }

  // The two routes, shared by both presentations (only one renders at a time).
  function rows(itemCls: string) {
    const hintCls =
      'flex items-center gap-2 text-ink-soft transition-colors group-hover:text-meat group-focus:text-meat'
    return (
      <>
        <button
          ref={firstItemRef}
          role="menuitem"
          type="button"
          onClick={() => run(shareLink)}
          className={itemCls}
        >
          <span>リンクで共有</span>
          <span className={hintCls} aria-hidden>
            <TwitterIcon className="h-[18px] w-[18px]" />
            <LineIcon className="h-[18px] w-[18px]" />
          </span>
        </button>
        <div className="mx-4 border-t border-line" />
        <button role="menuitem" type="button" onClick={() => run(shareImage)} className={itemCls}>
          <span>画像で共有</span>
          <span className={hintCls} aria-hidden>
            <InstagramIcon className="h-[18px] w-[18px]" />
          </span>
        </button>
      </>
    )
  }

  const rootCls =
    variant === 'icon' ? 'relative inline-flex' : 'relative mx-auto w-full max-w-[320px]'

  return (
    <div ref={rootRef} className={rootCls}>
      {variant === 'icon' ? (
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          aria-label="チケットをシェア"
          onClick={() => setOpen((v) => !v)}
          className={
            'inline-flex h-11 w-11 items-center justify-center rounded-full text-meat transition-colors active:scale-95 ' +
            (open ? 'bg-cream' : 'hover:bg-cream')
          }
        >
          <ShareIcon className="h-[22px] w-[22px]" />
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen((v) => !v)}
          className="btn btn--primary btn--block inline-flex items-center justify-center gap-2"
        >
          <ShareIcon className="h-[18px] w-[18px]" />
          シェアする
        </button>
      )}

      {/* Touch: action sheet from the bottom (portaled to <body>). */}
      {open &&
        coarse &&
        createPortal(
          <div className="fixed inset-0 z-50 flex flex-col justify-end" role="presentation">
            <div
              className="share-backdrop absolute inset-0 bg-[rgba(29,20,17,0.45)]"
              onClick={close}
              aria-hidden
            />
            <div
              id={menuId}
              role="menu"
              aria-label="シェア方法"
              onKeyDown={onMenuKeyDown}
              className="share-sheet relative rounded-t-[22px] border-x-2 border-t-2 border-ink bg-paper pb-[max(env(safe-area-inset-bottom),12px)] shadow-card-lg"
            >
              <div className="mx-auto mt-3 mb-1 h-1 w-9 rounded-full bg-line" aria-hidden />
              {rows(
                'group flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[16px] font-bold text-ink transition-colors active:bg-cream focus:bg-cream focus:outline-none',
              )}
              <div className="mx-4 mt-1 border-t border-line" />
              <button
                type="button"
                onClick={close}
                className="w-full px-5 py-4 text-center text-[15px] font-bold text-ink-soft active:bg-cream"
              >
                キャンセル
              </button>
            </div>
          </div>,
          document.body,
        )}

      {/* Pointer: popover anchored to the trigger. */}
      {open && !coarse && (
        <div
          id={menuId}
          role="menu"
          aria-label="シェア方法"
          onKeyDown={onMenuKeyDown}
          className={
            'share-pop absolute top-full z-20 mt-2 min-w-[248px] overflow-hidden rounded-card border-2 border-ink bg-paper shadow-card-lg ' +
            (variant === 'icon' ? 'right-0' : 'left-1/2 -translate-x-1/2')
          }
        >
          {rows(
            'group flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-[15px] font-bold text-ink transition-colors hover:bg-cream focus:bg-cream focus:outline-none',
          )}
        </div>
      )}
    </div>
  )
}
