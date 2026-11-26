import { useConflicts, useData } from '../state/app'
import { Button, Sheet } from './ui'
import { formatMinor, formatRate } from '../lib/money'
import { categoryInfo, isCategoryId } from '../lib/categories'
import { formatDateTime } from '../lib/czech'
import type { ConflictRecord, Currency } from '../lib/types'

function describe(table: ConflictRecord['table'], r: Record<string, unknown> | null): { title: string; lines: string[] } {
  if (!r) return { title: 'Smazáno', lines: ['Záznam už na serveru neexistuje.'] }
  if (r.deleted_at) return { title: 'Smazáno', lines: ['Na druhém zařízení byl záznam smazán.'] }
  if (table === 'budget_items') {
    const lines = [formatMinor(Number(r.amount_minor), (r.currency as Currency) ?? 'CZK') + (r.split ? ' · cena za všechny' : '')]
    if (isCategoryId(r.category)) lines.push(categoryInfo(r.category).label)
    lines.push(r.paid ? 'Zaplaceno' : 'Nezaplaceno')
    if (r.note) lines.push(`„${String(r.note).slice(0, 80)}“`)
    return { title: String(r.name ?? ''), lines }
  }
  if (table === 'notes') {
    const body = String(r.body ?? '').slice(0, 120)
    return {
      title: String(r.title || 'Bez nadpisu'),
      lines: [body ? `${body}${String(r.body).length > 120 ? '…' : ''}` : 'Bez textu', `${(r.links as unknown[])?.length ?? 0} odkazů · ${(r.tags as string[])?.join(', ') || 'bez štítků'}`],
    }
  }
  if (table === 'trip_settings') {
    return {
      title: String(r.name ?? 'Nastavení cesty'),
      lines: [
        `Kurz EUR/CZK: ${r.eur_rate == null ? 'nenastaven' : formatRate(Number(r.eur_rate))}`,
        `Počet cestujících: ${r.travelers}`,
        `Termín: ${r.start_date ?? '—'} – ${r.end_date ?? '—'}`,
      ],
    }
  }
  return { title: 'Fotografie', lines: [] }
}

const TABLE_LABEL: Record<ConflictRecord['table'], string> = {
  budget_items: 'Položka rozpočtu',
  notes: 'Poznámka',
  trip_settings: 'Nastavení cesty',
  note_attachments: 'Fotografie',
}

export function ConflictSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const conflicts = useConflicts()
  const { engine } = useData()
  return (
    <Sheet open={open && conflicts.length > 0} onClose={onClose} title="Vyřešit konflikty" wide>
      <p className="mb-5 text-[15px] leading-relaxed text-muted">
        Tyto záznamy byly změněny na dvou zařízeních současně. Aplikace nic nepřepsala – vyberte, kterou verzi ponechat.
      </p>
      <div className="flex flex-col gap-4">
        {conflicts.map((c) => {
          const mine = describe(c.table, c.local)
          const theirs = describe(c.table, c.server)
          return (
            <div key={c.key} className="rounded-3xl bg-paper p-4 shadow-card">
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">
                {TABLE_LABEL[c.table]} · {formatDateTime(c.detected_at)}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'V tomto zařízení', d: mine },
                  { label: 'Z druhého zařízení', d: theirs },
                ].map((v) => (
                  <div key={v.label} className="rounded-2xl bg-cream p-3.5">
                    <p className="text-[12px] font-semibold text-navy-3">{v.label}</p>
                    <p className="mt-1 font-semibold text-ink">{v.d.title}</p>
                    {v.d.lines.map((l, i) => (
                      <p key={i} className="text-[13.5px] leading-snug text-muted">
                        {l}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="primary" size="sm" className="h-11" onClick={() => engine?.resolveKeepLocal(c.key)}>
                  Ponechat moji
                </Button>
                <Button variant="secondary" size="sm" className="h-11" onClick={() => engine?.resolveKeepServer(c.key)}>
                  Použít z druhého
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}
