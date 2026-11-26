import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, CalendarDays, Lightbulb, Pin, Plus, Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { PageHeader } from '../components/Layout'
import { BudgetHero } from '../components/budget/BudgetHero'
import { CategoryBadge } from '../components/brand'
import { SectionTitle } from '../components/ui'
import { summarize } from '../lib/budget'
import { categoryInfo } from '../lib/categories'
import { countdownLabel, formatTripRange } from '../lib/czech'
import { formatMinor } from '../lib/money'
import { useAttachments, useBudgetItems, useNotes, useSettings } from '../state/app'
import { NoteThumb } from '../components/notes/NoteThumb'

function Stat({ value, label, to, testId }: { value: string; label: string; to: string; testId: string }) {
  return (
    <Link to={to} className="rounded-3xl bg-paper p-4 shadow-card transition-transform active:scale-[0.98] md:p-5">
      <p className="tabular font-serif text-[30px] font-semibold leading-none text-navy" data-testid={testId}>
        {value}
      </p>
      <p className="mt-2 text-[13px] leading-tight text-muted">{label}</p>
    </Link>
  )
}

export function DashboardPage() {
  const items = useBudgetItems()
  const settings = useSettings()
  const notes = useNotes()
  const atts = useAttachments()
  const navigate = useNavigate()
  const s = useMemo(() => (items && settings ? summarize(items, settings) : null), [items, settings])
  if (!s || !settings || !notes) return null

  const range = formatTripRange(settings.start_date, settings.end_date)
  const countdown = countdownLabel(settings.start_date, settings.end_date)
  const pinned = notes.filter((n) => n.pinned).slice(0, 6)
  const topCats = s.categories.filter((c) => c.count > 0).sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
  const firstPhoto = (noteId: string) => atts?.find((a) => a.note_id === noteId)

  return (
    <>
      <PageHeader
        eyebrow="Přehled"
        title={settings.name}
        subtitle={
          range ? (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" /> {range}
              </span>
              {countdown && <span className="rounded-full bg-red-soft px-2.5 py-0.5 text-[13px] font-semibold text-red">{countdown}</span>}
            </span>
          ) : (
            <Link to="/nastaveni" className="text-navy underline decoration-line underline-offset-4">
              Nastavit termín cesty
            </Link>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Link to="/rozpocet" aria-label="Otevřít rozpočet" className="block transition-transform active:scale-[0.99]">
            <BudgetHero s={s} />
          </Link>

          <div className="grid grid-cols-3 gap-3">
            <Stat value={String(s.itemCount)} label="Položky v rozpočtu" to="/rozpocet" testId="stat-items" />
            <Stat value={`${s.paidCount}/${s.itemCount}`} label="Zaplaceno" to="/rozpocet" testId="stat-paid" />
            <Stat value={String(notes.length)} label="Uložené nápady" to="/napady" testId="stat-notes" />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <SectionTitle>Rychlé akce</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/rozpocet?nova=1')}
                className="group flex flex-col items-start gap-6 rounded-3xl bg-paper p-5 text-left shadow-card transition-transform active:scale-[0.98]"
              >
                <span className="flex size-11 items-center justify-center rounded-2xl bg-navy text-white">
                  <Plus className="size-5" />
                </span>
                <span>
                  <span className="block text-[16px] font-semibold text-navy">Přidat výdaj</span>
                  <span className="mt-0.5 block text-[13px] text-muted">do rozpočtu</span>
                </span>
              </button>
              <button
                onClick={() => navigate('/napady/nova')}
                className="group flex flex-col items-start gap-6 rounded-3xl bg-paper p-5 text-left shadow-card transition-transform active:scale-[0.98]"
              >
                <span className="flex size-11 items-center justify-center rounded-2xl bg-red text-white">
                  <Lightbulb className="size-5" />
                </span>
                <span>
                  <span className="block text-[16px] font-semibold text-navy">Nový nápad</span>
                  <span className="mt-0.5 block text-[13px] text-muted">poznámka, fotka, odkaz</span>
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link to="/rozpocet" className="flex items-center justify-between gap-2 rounded-2xl border border-line px-4 py-3.5 text-[15px] font-medium text-navy hover:bg-paper">
              <span className="flex items-center gap-2.5">
                <Wallet className="size-5 text-muted" /> Rozpočet
              </span>
              <ArrowUpRight className="size-4 text-muted" />
            </Link>
            <Link to="/napady" className="flex items-center justify-between gap-2 rounded-2xl border border-line px-4 py-3.5 text-[15px] font-medium text-navy hover:bg-paper">
              <span className="flex items-center gap-2.5">
                <Lightbulb className="size-5 text-muted" /> Nápady
              </span>
              <ArrowUpRight className="size-4 text-muted" />
            </Link>
          </div>

          {topCats.length > 0 && (
            <div>
              <SectionTitle>Největší výdaje</SectionTitle>
              <div className="rounded-3xl bg-paper px-4 py-2 shadow-card">
                {topCats.slice(0, 4).map((c, i) => (
                  <div key={c.id} className={`flex items-center gap-3 py-3 ${i ? 'border-t border-line/60' : ''}`}>
                    <CategoryBadge id={c.id} size={36} />
                    <span className="flex-1 text-[14.5px] font-medium text-ink">{categoryInfo(c.id).label}</span>
                    <span className="tabular text-[14.5px] font-semibold text-navy">{c.total == null ? 'chybí kurz' : formatMinor(c.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {pinned.length > 0 && (
        <div className="mt-8">
          <SectionTitle
            action={
              <Link to="/napady" className="text-[13px] font-semibold text-navy">
                Všechny nápady
              </Link>
            }
          >
            <span className="inline-flex items-center gap-1.5">
              <Pin className="size-3.5" /> Připnuté nápady
            </span>
          </SectionTitle>
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:px-0">
            {pinned.map((n) => (
              <Link
                key={n.id}
                to={`/napady/${n.id}`}
                className="w-[240px] shrink-0 snap-start overflow-hidden rounded-3xl bg-paper shadow-card transition-transform active:scale-[0.98] lg:w-auto"
              >
                {firstPhoto(n.id) && <NoteThumb attachmentId={firstPhoto(n.id)!.id} className="h-32 w-full" />}
                <div className="p-4">
                  <p className="line-clamp-2 font-serif text-[20px] font-semibold leading-tight text-navy">{n.title || 'Bez nadpisu'}</p>
                  {n.body && <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted">{n.body}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
