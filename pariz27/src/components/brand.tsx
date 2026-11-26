import { BedDouble, CircleEllipsis, Landmark, Plane, Sparkles, UtensilsCrossed, type LucideProps } from 'lucide-react'
import type { CategoryId } from '../lib/types'
import { categoryInfo } from '../lib/categories'

const ICONS: Record<CategoryId, React.ComponentType<LucideProps>> = {
  transport: Plane,
  accommodation: BedDouble,
  food: UtensilsCrossed,
  activities: Sparkles,
  sights: Landmark,
  other: CircleEllipsis,
}

export function CategoryIcon({ id, className, ...rest }: { id: CategoryId } & LucideProps) {
  const Icon = ICONS[id]
  return <Icon className={className} strokeWidth={1.75} {...rest} />
}

export function CategoryBadge({ id, size = 40 }: { id: CategoryId; size?: number }) {
  const c = categoryInfo(id)
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-2xl"
      style={{ width: size, height: size, background: `${c.color}14`, color: c.color }}
    >
      <CategoryIcon id={id} className="size-[45%]" />
    </span>
  )
}

/** Stylizovaná Eiffelova věž – tenká linka, používá se jako decentní dekorace. */
export function EiffelLine({ className, strokeWidth = 1.4 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 120 220" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M60 4v14" />
      <path d="M56 18h8l3 40H53z" />
      <path d="M50 58h20" />
      <path d="M53 58c-2 22-6 44-14 64M67 58c2 22 6 44 14 64" />
      <path d="M44 100h32" />
      <path d="M36 122h48" />
      <path d="M39 122c-6 34-16 66-30 94M81 122c6 34 16 66 30 94" />
      <path d="M42 152h36" />
      <path d="M34 216c2-30 12-46 26-46s24 16 26 46" />
      <path d="M53 58l12 42M67 58l-12 42M47 108l10 14M73 108l-10 14" opacity="0.55" />
      <path d="M4 216h112" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-serif font-semibold tracking-tight">Paříž</span>
      <span className="ml-1 font-serif font-semibold text-red">27</span>
    </span>
  )
}
