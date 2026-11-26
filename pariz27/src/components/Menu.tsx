import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal } from 'lucide-react'
import { cx } from './ui'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
}

const WIDTH = 236

/** Malá nabídka akcí („⋯“). Vykresluje se nad vším ostatním, aby ji nic neořízlo. */
export function Menu({
  items,
  label = 'Další akce',
  className,
  trigger,
  triggerClassName,
}: {
  items: MenuItem[]
  label?: string
  className?: string
  trigger?: ReactNode
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const menuH = items.length * 48 + 12
    const up = r.bottom + menuH + 12 > window.innerHeight && r.top > menuH + 12
    setPos({
      top: up ? r.top - menuH - 6 : r.bottom + 6,
      left: Math.min(Math.max(8, r.right - WIDTH), window.innerWidth - WIDTH - 8),
      up,
    })
  }, [open, items.length])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false)
    }
    const close = () => setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <div className={cx('relative', className)}>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className={triggerClassName ?? 'flex size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-cream-2 hover:text-navy'}
      >
        {trigger ?? <MoreHorizontal className="size-5" />}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            className={cx(
              'fixed z-[75] animate-pop overflow-hidden rounded-2xl border border-line/60 bg-paper py-1.5 shadow-float',
              pos.up ? 'origin-bottom-right' : 'origin-top-right',
            )}
            style={{ top: pos.top, left: pos.left, width: WIDTH }}
          >
            {items.map((it) => (
              <button
                key={it.label}
                role="menuitem"
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                  it.onSelect()
                }}
                className={cx(
                  'flex h-12 w-full items-center gap-3 px-4 text-left text-[15px] transition-colors hover:bg-cream',
                  it.danger ? 'text-red' : 'text-ink',
                )}
              >
                {it.icon}
                {it.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}
