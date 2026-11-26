import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, FileSpreadsheet, FileText, Plus, Share, Wallet } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import { BudgetHero } from '../components/budget/BudgetHero'
import { ItemCard } from '../components/budget/ItemCard'
import { ItemSheet } from '../components/budget/ItemSheet'
import { useExports } from '../components/budget/useExports'
import { CategoryBadge } from '../components/brand'
import { Menu } from '../components/Menu'
import { Button, Chip, EmptyState, Fab, Segmented, cx, useConfirm } from '../components/ui'
import { summarize, type BudgetSummary } from '../lib/budget'
import { CATEGORIES, categoryInfo } from '../lib/categories'
import { countLabel } from '../lib/czech'
import { formatMinor } from '../lib/money'
import type { BudgetItem, CategoryId } from '../lib/types'
import { useBudgetItems, useData, useSettings } from '../state/app'
import { useToast } from '../state/toast'

type PayFilter = 'all' | 'unpaid' | 'paid'
const COLLAPSED_KEY = 'pariz27-collapsed-categories'

function readCollapsed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

function CategoryBreakdown({ s, active, onPick }: { s: BudgetSummary; active: CategoryId | null; onPick: (id: CategoryId | null) => void }) {
  const cats = s.categories.filter((c) => c.count > 0)
  if (!cats.length) return null
  const max = Math.max(1, ...cats.map((c) => c.total ?? 0))
  return (
    <section className="rounded-[28px] bg-paper p-5 shadow-card" aria-label="Výdaje podle kategorií">
      <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">Podle kategorií</h2>
      <ul className="flex flex-col">
        {cats.map((c) => {
          const info = categoryInfo(c.id)
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onPick(active === c.id ? null : c.id)}
                aria-pressed={active === c.id}
                className={cx('-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-cream', active === c.id && 'bg-cream')}
              >
                <CategoryBadge id={c.id} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[14.5px] font-medium text-ink">{info.label}</span>
                    <span className="tabular shrink-0 text-[14.5px] font-semibold text-navy" data-testid={`cat-total-${c.id}`}>
                      {c.total == null ? 'chybí kurz' : formatMinor(c.total)}
                    </span>
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-cream-2">
                    <span
                      className="block h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${c.total == null ? 0 : Math.max(4, (c.total / max) * 100)}%`, background: info.color }}
                    />
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-[12px] text-muted">Částky na osobu. Klepnutím zobrazíte jen danou kategorii.</p>
    </section>
  )
}

export function BudgetPage() {
  const items = useBudgetItems()
  const settings = useSettings()
  const { repo } = useData()
  const toast = useToast()
  const confirm = useConfirm()
  const { exportCsv, exportPdf, busy } = useExports()
  const [params, setParams] = useSearchParams()

  const [editing, setEditing] = useState<BudgetItem | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [catFilter, setCatFilter] = useState<CategoryId | null>(null)
  const [payFilter, setPayFilter] = useState<PayFilter>('all')
  const [collapsed, setCollapsed] = useState<Set<string>>(readCollapsed)
  const loaded = items !== undefined
  const heroRef = useRef<HTMLDivElement>(null)
  const [heroHidden, setHeroHidden] = useState(false)

  // otevření formuláře z přehledu (?nova=1)
  useEffect(() => {
    if (params.get('nova') === '1') {
      setEditing(null)
      setSheetOpen(true)
      params.delete('nova')
      setParams(params, { replace: true })
    }
  }, [params, setParams])

  // kompaktní lišta s celkovou částkou, když hlavní souhrn odroluje mimo obrazovku
  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setHeroHidden(!e.isIntersecting), { threshold: 0, rootMargin: '-40px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [loaded])

  const s = useMemo(() => (items && settings ? summarize(items, settings) : null), [items, settings])

  const toggleCollapsed = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]))
      } catch {
        /* ignore */
      }
      return next
    })

  const openNew = () => {
    setEditing(null)
    setSheetOpen(true)
  }
  const onEdit = useCallback((it: BudgetItem) => {
    setEditing(it)
    setSheetOpen(true)
  }, [])
  const onTogglePaid = useCallback(
    async (it: BudgetItem) => {
      await repo.togglePaid(it.id)
      toast.show(it.paid ? `„${it.name}“ – nezaplaceno` : `„${it.name}“ – zaplaceno`)
    },
    [repo, toast],
  )
  const onDelete = useCallback(
    async (it: BudgetItem) => {
      const ok = await confirm({
        title: 'Smazat položku?',
        message: <>Položka „{it.name}“ bude odstraněna z rozpočtu na všech zařízeních.</>,
        confirmLabel: 'Smazat',
        danger: true,
      })
      if (!ok) return
      await repo.deleteItem(it.id)
      toast.show('Položka smazána')
    },
    [confirm, repo, toast],
  )

  if (!items || !settings || !s) return null

  const filtered = items.filter(
    (i) => (!catFilter || i.category === catFilter) && (payFilter === 'all' || (payFilter === 'paid' ? i.paid : !i.paid)),
  )
  const sections = CATEGORIES.map((c) => ({ c, items: filtered.filter((i) => i.category === c.id), sum: s.categories.find((x) => x.id === c.id)! })).filter(
    (x) => x.items.length > 0,
  )

  const exportMenu = (
    <Menu
      label="Export rozpočtu"
      trigger={
        <>
          <Share className="size-[18px]" /> <span className="hidden sm:inline">Export</span>
        </>
      }
      triggerClassName="inline-flex h-11 items-center gap-2 rounded-full bg-paper px-3.5 text-[14px] font-semibold text-navy shadow-card transition-colors hover:bg-cream-2 sm:px-4"
      items={[
        { label: busy === 'pdf' ? 'Připravuji PDF…' : 'Export do PDF', icon: <FileText className="size-[18px] text-muted" />, onSelect: () => void exportPdf() },
        { label: 'Export do CSV', icon: <FileSpreadsheet className="size-[18px] text-muted" />, onSelect: () => void exportCsv() },
      ]}
    />
  )

  return (
    <>
      {/* kompaktní lišta s celkovou částkou */}
      <div
        className={cx(
          'fixed inset-x-0 top-0 z-30 border-b border-line/70 bg-cream/90 backdrop-blur-xl transition-[translate,opacity] duration-300 md:left-[264px] lg:left-[288px]',
          heroHidden ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0',
        )}
        style={{ paddingTop: 'var(--safe-top)' }}
        aria-hidden={!heroHidden}
      >
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
          <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Můj rozpočet</span>
          <span className="tabular font-serif text-[24px] font-semibold text-navy">{s.total == null ? '—' : formatMinor(s.total)}</span>
        </div>
      </div>

      <PageHeader
        title="Rozpočet"
        subtitle={items.length ? `${countLabel(s.itemCount, ['položka', 'položky', 'položek'])} · ${s.paidCount} zaplaceno` : undefined}
        actions={
          <>
            {items.length > 0 && exportMenu}
            <div className="hidden md:block">
              <Button onClick={openNew}>
                <Plus className="size-5" /> Přidat položku
              </Button>
            </div>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          <div ref={heroRef}>
            <BudgetHero s={s} />
          </div>
          <CategoryBreakdown s={s} active={catFilter} onPick={setCatFilter} />
        </div>

        <div className="min-w-0">
          {items.length === 0 ? (
            <div className="rounded-[28px] bg-paper shadow-card">
              <EmptyState
                icon={<Wallet className="size-9" strokeWidth={1.5} />}
                title="Zatím žádné výdaje"
                text="Přidejte letenky, ubytování nebo vstupné. Celkový rozpočet na osobu se spočítá automaticky."
                action={
                  <Button size="lg" onClick={openNew}>
                    <Plus className="size-5" /> Přidat první položku
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-col gap-3">
                <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0" role="group" aria-label="Filtr kategorií">
                  <Chip active={!catFilter} onClick={() => setCatFilter(null)}>
                    Vše
                  </Chip>
                  {CATEGORIES.filter((c) => s.categories.find((x) => x.id === c.id)!.count > 0).map((c) => (
                    <Chip key={c.id} active={catFilter === c.id} onClick={() => setCatFilter(catFilter === c.id ? null : c.id)} color={c.color}>
                      {c.short}
                    </Chip>
                  ))}
                </div>
                <Segmented
                  label="Filtr stavu platby"
                  value={payFilter}
                  onChange={setPayFilter}
                  size="sm"
                  className="w-full sm:w-auto sm:self-start"
                  options={[
                    { value: 'all', label: 'Vše' },
                    {
                      value: 'unpaid',
                      label: (
                        <span className="whitespace-nowrap">
                          Nezaplaceno <span className="tabular opacity-60">{s.unpaidCount}</span>
                        </span>
                      ),
                    },
                    {
                      value: 'paid',
                      label: (
                        <span className="whitespace-nowrap">
                          Zaplaceno <span className="tabular opacity-60">{s.paidCount}</span>
                        </span>
                      ),
                    },
                  ]}
                />
              </div>

              {sections.length === 0 && (
                <div className="rounded-[28px] bg-paper px-6 py-10 text-center text-[15px] text-muted shadow-card">
                  Žádné položky neodpovídají filtru.
                  <div className="mt-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setCatFilter(null)
                        setPayFilter('all')
                      }}
                    >
                      Zrušit filtr
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-5">
                {sections.map(({ c, items: list, sum }) => {
                  const isCollapsed = collapsed.has(c.id)
                  return (
                    <section key={c.id} aria-label={c.label} data-testid={`section-${c.id}`}>
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(c.id)}
                        aria-expanded={!isCollapsed}
                        className="flex w-full items-center gap-3 rounded-2xl px-1 py-2 text-left"
                      >
                        <CategoryBadge id={c.id} size={38} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[16px] font-semibold text-navy">{c.label}</span>
                          <span className="block text-[12.5px] text-muted">
                            {countLabel(sum.count, ['položka', 'položky', 'položek'])}
                            {sum.paidCount > 0 && ` · ${sum.paidCount} zaplaceno`}
                          </span>
                        </span>
                        <span className="tabular text-right">
                          <span className="block text-[16px] font-semibold text-navy">{sum.total == null ? 'chybí kurz' : formatMinor(sum.total)}</span>
                          <span className="block text-[11.5px] text-muted">na osobu</span>
                        </span>
                        <ChevronDown className={cx('size-5 shrink-0 text-muted transition-transform duration-300', isCollapsed && '-rotate-90')} />
                      </button>
                      <div
                        inert={isCollapsed}
                        className={cx(
                          'grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out',
                          isCollapsed ? 'invisible grid-rows-[0fr] opacity-0' : 'visible grid-rows-[1fr] opacity-100',
                        )}
                      >
                        <div className="min-h-0 overflow-hidden">
                          <div className="flex flex-col gap-2.5 pt-2">
                            {list.map((it) => (
                              <ItemCard key={it.id} item={it} settings={settings} onEdit={onEdit} onTogglePaid={onTogglePaid} onDelete={onDelete} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </section>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <Fab label="Přidat položku" onClick={openNew} icon={<Plus className="size-7" strokeWidth={2.2} />} />
      <ItemSheet open={sheetOpen} onClose={() => setSheetOpen(false)} item={editing} defaultCategory={editing ? undefined : (catFilter ?? undefined)} />
    </>
  )
}
