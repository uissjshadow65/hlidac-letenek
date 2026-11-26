import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import type { BudgetSummary } from '../../lib/budget'
import { countLabel, personsAccusative } from '../../lib/czech'
import { formatMinor } from '../../lib/money'
import { EiffelLine } from '../brand'
import { cx } from '../ui'

/** Hlavní souhrn: celkový rozpočet na osobu – nejdůležitější číslo aplikace. */
export function BudgetHero({ s, compact, className }: { s: BudgetSummary; compact?: boolean; className?: string }) {
  const pct = Math.round(s.paidRatio * 100)
  return (
    <section
      aria-label="Souhrn rozpočtu"
      className={cx('relative overflow-hidden rounded-[30px] bg-navy text-white shadow-float', compact ? 'p-5' : 'p-6 md:p-7', className)}
    >
      <EiffelLine className="pointer-events-none absolute -right-6 -top-3 h-[118%] text-white/[0.06]" strokeWidth={1.2} />
      <div className="relative">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-cream-3/90">Můj rozpočet</p>
        <p className="tabular mt-2 font-serif text-[44px] font-semibold leading-[1] tracking-[-0.01em] md:text-[52px]" data-testid="total-per-person">
          {s.total == null ? '—' : formatMinor(s.total)}
        </p>
        <p className="mt-2 text-[14px] text-cream-3/90">
          {s.missingRate ? 'Celkovou částku nelze spočítat' : `na osobu · ${countLabel(s.itemCount, ['položka', 'položky', 'položek'])}`}
        </p>

        {s.missingRate ? (
          <Link
            to="/nastaveni#kurz"
            className="mt-5 flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-[14px] leading-snug text-white transition-colors hover:bg-white/15"
          >
            <AlertTriangle className="size-5 shrink-0 text-amber-300" />
            <span className="flex-1">
              {countLabel(s.eurItemCount, ['položka je', 'položky jsou', 'položek je'])} v eurech. Nastavte směnný kurz EUR/CZK.
              <span className="mt-0.5 block text-[12.5px] text-cream-3/90">Zatím jen položky v Kč: {formatMinor(s.czkOnlyTotal)} na osobu</span>
            </span>
            <ArrowRight className="size-4 shrink-0" />
          </Link>
        ) : (
          <>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/12" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Zaplaceno">
              <div className="h-full rounded-full bg-gradient-to-r from-[#d9a4ab] to-white transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[12px] text-cream-3/90">Zaplaceno</p>
                <p className="tabular mt-0.5 text-[18px] font-semibold" data-testid="paid-total">
                  {formatMinor(s.paid ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-cream-3/90">Zbývá zaplatit</p>
                <p className="tabular mt-0.5 text-[18px] font-semibold" data-testid="remaining-total">
                  {formatMinor(s.remaining ?? 0)}
                </p>
              </div>
            </div>
            {!compact && s.travelers > 1 && (
              <p className="mt-4 border-t border-white/10 pt-3.5 text-[13px] text-cream-3/90">
                Orientačně pro {personsAccusative(s.travelers)}:{' '}
                <span className="tabular font-semibold text-white" data-testid="group-total">
                  {formatMinor(s.groupTotal ?? 0)}
                </span>
              </p>
            )}
          </>
        )}
      </div>
    </section>
  )
}
