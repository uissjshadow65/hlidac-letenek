import { Check, Pencil, Trash2, CircleDashed, CheckCircle2 } from 'lucide-react'
import { memo } from 'react'
import { perPersonCzkMinor, perPersonOriginalMinor, type CalcSettings } from '../../lib/budget'
import { categoryInfo } from '../../lib/categories'
import { personsAccusative } from '../../lib/czech'
import { formatMinor } from '../../lib/money'
import type { BudgetItem } from '../../lib/types'
import { Menu } from '../Menu'
import { cx } from '../ui'

interface Props {
  item: BudgetItem
  settings: CalcSettings
  onEdit: (item: BudgetItem) => void
  onTogglePaid: (item: BudgetItem) => void
  onDelete: (item: BudgetItem) => void
  showCategory?: boolean
}

export const ItemCard = memo(function ItemCard({ item, settings, onEdit, onTogglePaid, onDelete, showCategory }: Props) {
  const cat = categoryInfo(item.category)
  const czk = perPersonCzkMinor(item, settings)
  const perPersonOrig = perPersonOriginalMinor(item, settings.travelers)

  return (
    <article
      data-testid="budget-item"
      className={cx(
        'group relative flex animate-fade-in items-start gap-3 rounded-3xl bg-paper p-4 pr-2 shadow-card transition-[box-shadow,opacity] hover:shadow-[0_6px_24px_rgb(20_33_61/0.08)]',
        item.paid && 'bg-paper/80',
      )}
    >
      <button
        type="button"
        onClick={() => onTogglePaid(item)}
        aria-pressed={item.paid}
        aria-label={item.paid ? `Označit „${item.name}“ jako nezaplacené` : `Označit „${item.name}“ jako zaplacené`}
        className={cx(
          'mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 active:scale-90',
          item.paid ? 'border-green bg-green text-white' : 'border-cream-3 text-transparent hover:border-green/60 hover:text-green/40',
        )}
      >
        <Check className="size-5" strokeWidth={2.6} />
      </button>

      <button type="button" onClick={() => onEdit(item)} className="min-w-0 flex-1 text-left" aria-label={`Upravit ${item.name}`}>
        <div className="flex items-start justify-between gap-3">
          <h3 className={cx('pt-0.5 text-[16px] font-semibold leading-snug text-ink', item.paid && 'text-ink/70')}>{item.name}</h3>
          <div className="shrink-0 text-right">
            <p className="tabular font-serif text-[19px] font-semibold leading-none text-navy" data-testid="item-per-person">
              {czk == null ? formatMinor(perPersonOrig, 'EUR') : formatMinor(czk)}
            </p>
            <p className="mt-1 text-[11px] font-medium text-muted">{czk == null ? 'chybí kurz' : 'do mého rozpočtu'}</p>
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
          <span className="tabular font-medium text-ink/80" data-testid="item-original">
            {formatMinor(item.amount_minor, item.currency)}
          </span>
          {item.split && (
            <span className="rounded-full bg-cream-2 px-2 py-0.5 text-[12px] font-medium text-navy-3">Cena za {personsAccusative(settings.travelers)}</span>
          )}
          {item.currency === 'EUR' && czk != null && <span className="tabular">{formatMinor(perPersonOrig, 'EUR')} na osobu</span>}
        </div>

        {item.note && <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-muted">{item.note}</p>}

        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px] font-medium">
          {showCategory && (
            <span className="inline-flex items-center gap-1.5 text-muted">
              <span className="size-1.5 rounded-full" style={{ background: cat.color }} />
              {cat.label}
            </span>
          )}
          <span
            className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5', item.paid ? 'bg-green-soft text-green' : 'bg-amber-soft/70 text-amber')}
          >
            {item.paid ? <CheckCircle2 className="size-3.5" /> : <CircleDashed className="size-3.5" />}
            {item.paid ? 'Zaplaceno' : 'Nezaplaceno'}
          </span>
        </div>
      </button>

      <Menu
        label={`Akce pro ${item.name}`}
        items={[
          { label: 'Upravit', icon: <Pencil className="size-[18px] text-muted" />, onSelect: () => onEdit(item) },
          {
            label: item.paid ? 'Označit jako nezaplacené' : 'Označit jako zaplacené',
            icon: <Check className="size-[18px] text-muted" />,
            onSelect: () => onTogglePaid(item),
          },
          { label: 'Smazat', icon: <Trash2 className="size-[18px]" />, onSelect: () => onDelete(item), danger: true },
        ]}
      />
    </article>
  )
})
