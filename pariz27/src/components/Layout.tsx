import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, Lightbulb, Settings, Wallet, GitMerge } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useBudgetItems, useConflicts, useSettings } from '../state/app'
import { summarize } from '../lib/budget'
import { formatMinor } from '../lib/money'
import { SyncBadge } from './SyncBadge'
import { EiffelLine, Wordmark } from './brand'
import { cx } from './ui'
import { ConflictSheet } from './ConflictSheet'
import { UpdatePrompt } from './UpdatePrompt'

const NAV = [
  { to: '/', label: 'Přehled', icon: Home, end: true },
  { to: '/rozpocet', label: 'Rozpočet', icon: Wallet },
  { to: '/napady', label: 'Nápady', icon: Lightbulb },
  { to: '/nastaveni', label: 'Nastavení', icon: Settings },
]

function useMiniTotal() {
  const items = useBudgetItems()
  const settings = useSettings()
  if (!items || !settings) return null
  return summarize(items, settings)
}

function Sidebar({ onSync }: { onSync: () => void }) {
  const s = useMiniTotal()
  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-line/70 bg-cream md:flex lg:w-[288px]"
      style={{ paddingTop: 'calc(var(--safe-top) + 28px)', paddingLeft: 'var(--safe-left)' }}
    >
      <div className="px-7">
        <Wordmark className="text-[30px] leading-none text-navy" />
        <p className="mt-1.5 text-[13px] text-muted">Plánování cesty</p>
      </div>
      <nav className="mt-8 flex flex-col gap-1 px-4" aria-label="Hlavní navigace">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              cx(
                'flex h-12 items-center gap-3.5 rounded-2xl px-4 text-[15px] font-medium transition-colors',
                isActive ? 'bg-navy text-white shadow-sm' : 'text-ink hover:bg-cream-2',
              )
            }
          >
            <n.icon className="size-5" strokeWidth={1.8} />
            {n.label === 'Nápady' ? 'Nápady a poznámky' : n.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto px-4" style={{ paddingBottom: 'calc(var(--safe-bottom) + 20px)' }}>
        <div className="relative overflow-hidden rounded-3xl bg-paper p-5 shadow-card">
          <EiffelLine className="absolute -right-3 -top-2 h-28 text-navy/[0.07]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Můj rozpočet</p>
          <p className="tabular mt-1 font-serif text-[26px] font-semibold leading-none text-navy">
            {s ? (s.total == null ? '—' : formatMinor(s.total)) : ' '}
          </p>
          <p className="mt-1 text-[12px] text-muted">{s?.missingRate ? 'chybí kurz EUR/CZK' : 'na osobu'}</p>
        </div>
        <div className="mt-3 flex justify-center">
          <SyncBadge onClick={onSync} />
        </div>
      </div>
    </aside>
  )
}

function BottomNav() {
  return (
    <nav
      aria-label="Hlavní navigace"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-cream/88 backdrop-blur-xl backdrop-saturate-150 md:hidden"
      style={{ paddingBottom: 'var(--safe-bottom)', paddingLeft: 'var(--safe-left)', paddingRight: 'var(--safe-right)' }}
    >
      <div className="mx-auto flex h-[var(--nav-h)] max-w-lg items-stretch">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              cx('flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors', isActive ? 'text-navy' : 'text-muted')
            }
          >
            {({ isActive }) => (
              <>
                <span className={cx('flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200', isActive && 'bg-navy/[0.08]')}>
                  <n.icon className="size-[22px]" strokeWidth={isActive ? 2.1 : 1.7} />
                </span>
                {n.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function ConflictBanner({ onOpen }: { onOpen: () => void }) {
  const n = useConflicts().length
  if (!n) return null
  return (
    <button
      onClick={onOpen}
      className="mb-5 flex w-full animate-rise items-center gap-3 rounded-2xl bg-red-soft px-4 py-3 text-left text-[14px] text-red"
    >
      <GitMerge className="size-5 shrink-0" />
      <span className="flex-1 leading-snug">
        <strong className="font-semibold">Změny na dvou zařízeních.</strong> Vyberte, kterou verzi ponechat.
      </span>
      <span className="font-semibold underline underline-offset-2">Vyřešit</span>
    </button>
  )
}

export function AppLayout() {
  const [conflictsOpen, setConflictsOpen] = useState(false)
  const navigate = useNavigate()
  const loc = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [loc.pathname])
  const onSync = () => navigate('/nastaveni#synchronizace')

  return (
    <div className="min-h-dvh">
      <Sidebar onSync={onSync} />
      <main
        className="pr-[var(--safe-right)] pl-[var(--safe-left)] md:pl-[264px] lg:pl-[288px]"
        style={{ paddingBottom: 'calc(var(--nav-h) + var(--safe-bottom) + 96px)' }}
      >
        <div
          className="mx-auto w-full max-w-[1120px] px-4 sm:px-6 lg:px-10"
          style={{ paddingTop: 'calc(var(--safe-top) + 12px)' }}
        >
          <ConflictBanner onOpen={() => setConflictsOpen(true)} />
          <Outlet context={{ openConflicts: () => setConflictsOpen(true) }} />
        </div>
      </main>
      <BottomNav />
      <ConflictSheet open={conflictsOpen} onClose={() => setConflictsOpen(false)} />
      <UpdatePrompt />
    </div>
  )
}

/** Záhlaví stránky – nahoře značka a stav synchronizace, pod tím velký nadpis. */
export function PageHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <header className="mb-6 animate-fade-in md:mb-8 md:pt-6">
      <div className="flex h-9 items-center justify-between gap-3 md:hidden">
        <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-navy">
          <span className="size-1.5 rounded-full bg-red" />
          {eyebrow ?? 'Paříž 27'}
        </span>
        <SyncBadge className="min-w-0" onClick={() => navigate('/nastaveni#synchronizace')} />
      </div>
      <div className="mt-2 flex items-end justify-between gap-4 md:mt-0">
        <div className="min-w-0">
          <h1 className="font-serif text-[34px] font-semibold leading-[1.08] tracking-[-0.01em] text-navy md:text-[42px]">{title}</h1>
          {subtitle && <div className="mt-2 text-[15px] text-muted">{subtitle}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2 pb-1">{actions}</div>}
      </div>
    </header>
  )
}
