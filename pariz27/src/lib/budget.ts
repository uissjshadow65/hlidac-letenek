/**
 * CENTRÁLNÍ VÝPOČTY ROZPOČTU
 * ==========================
 * Jediné místo v aplikaci, kde se počítají částky. Všechny obrazovky,
 * exporty i testy používají tyto funkce.
 *
 * Přesnost: částky jsou celá čísla (haléře / centy), kurz je celé číslo
 * v desetitisícinách. Hodnoty se sčítají jako přesné zlomky se společným
 * jmenovatelem (BigInt), takže nevzniká žádná chyba desetinných čísel
 * a zaokrouhluje se jen jednou – až u výsledného součtu.
 *
 *   Cena na osobu = zadaná cena / počet cestujících   (je-li cena za všechny)
 *   Cena na osobu = zadaná cena                       (jinak)
 *   Můj rozpočet  = součet cen na osobu (v CZK)
 */
import { CATEGORIES } from './categories'
import { rateToE4 } from './money'
import type { BudgetItemData, CategoryId } from './types'

export interface CalcSettings {
  travelers: number
  /** Kurz EUR/CZK; null = nenastaven. */
  eur_rate: number | null
}

type ItemLike = Pick<BudgetItemData, 'amount_minor' | 'currency' | 'split' | 'paid' | 'category'> & {
  deleted_at?: string | null
}

/** Přesná hodnota v haléřích vyjádřená jako num / den. */
export interface Exact {
  num: bigint
  den: bigint
}

export function normalizeTravelers(t: number): number {
  return Number.isInteger(t) && t >= 1 && t <= 20 ? t : 2
}

/** Zaokrouhlí přesnou hodnotu na celé haléře (polovina nahoru). */
export function roundExact(x: Exact): number {
  const { num, den } = x
  const neg = num < 0n
  const a = neg ? -num : num
  const q = (a * 2n + den) / (den * 2n)
  return Number(neg ? -q : q)
}

/** Společný jmenovatel pro daný počet cestujících. */
function denominator(travelers: number): bigint {
  return 10000n * BigInt(normalizeTravelers(travelers))
}

/**
 * Podíl jedné položky na mém rozpočtu jako čitatel nad společným jmenovatelem
 * (10000 × počet cestujících). Vrací null, pokud jde o EUR a kurz chybí.
 */
function shareNumerator(item: ItemLike, s: CalcSettings): bigint | null {
  const a = BigInt(item.amount_minor)
  const t = BigInt(normalizeTravelers(s.travelers))
  const perPersonFactor = item.split ? 1n : t
  if (item.currency === 'CZK') return a * 10000n * perPersonFactor
  if (s.eur_rate == null || !(s.eur_rate > 0)) return null
  return a * rateToE4(s.eur_rate) * perPersonFactor
}

/** Cena na osobu v původní měně (haléře/centy, zaokrouhleno jen pro zobrazení). */
export function perPersonOriginalMinor(item: ItemLike, travelers: number): number {
  const t = item.split ? normalizeTravelers(travelers) : 1
  return roundExact({ num: BigInt(item.amount_minor), den: BigInt(t) })
}

/** Částka, která se započítá do mého rozpočtu, v CZK (haléře). null = chybí kurz. */
export function perPersonCzkMinor(item: ItemLike, s: CalcSettings): number | null {
  const n = shareNumerator(item, s)
  return n == null ? null : roundExact({ num: n, den: denominator(s.travelers) })
}

/** Celá zadaná částka přepočtená na CZK (haléře). null = chybí kurz. */
export function fullCzkMinor(item: ItemLike, s: CalcSettings): number | null {
  if (item.currency === 'CZK') return item.amount_minor
  if (s.eur_rate == null) return null
  return roundExact({ num: BigInt(item.amount_minor) * rateToE4(s.eur_rate), den: 10000n })
}

export interface Totals {
  /** Celkem na osobu (haléře); null = nelze spočítat (chybí kurz). */
  total: number | null
  paid: number | null
  remaining: number | null
}

export interface CategorySummary extends Totals {
  id: CategoryId
  count: number
  paidCount: number
  missingRate: boolean
}

export interface BudgetSummary extends Totals {
  travelers: number
  itemCount: number
  paidCount: number
  unpaidCount: number
  eurItemCount: number
  /** Existují položky v EUR, ale kurz není nastaven. */
  missingRate: boolean
  /** Orientační cena pro všechny cestující (můj rozpočet × počet cestujících). */
  groupTotal: number | null
  /** Součet jen položek v CZK – pro zobrazení, když chybí kurz. */
  czkOnlyTotal: number
  /** Podíl zaplacené částky 0–1 (pro ukazatel průběhu). */
  paidRatio: number
  categories: CategorySummary[]
}

class Acc {
  total = 0n
  paid = 0n
  missing = false
  add(n: bigint | null, paid: boolean) {
    if (n == null) {
      this.missing = true
      return
    }
    this.total += n
    if (paid) this.paid += n
  }
  totals(den: bigint): Totals {
    if (this.missing) return { total: null, paid: null, remaining: null }
    return {
      total: roundExact({ num: this.total, den }),
      paid: roundExact({ num: this.paid, den }),
      remaining: roundExact({ num: this.total - this.paid, den }),
    }
  }
}

export function summarize(allItems: readonly ItemLike[], settings: CalcSettings): BudgetSummary {
  const items = allItems.filter((i) => !i.deleted_at)
  const travelers = normalizeTravelers(settings.travelers)
  const s = { ...settings, travelers }
  const den = denominator(travelers)

  const all = new Acc()
  const czkOnly = new Acc()
  const byCat = new Map<CategoryId, { acc: Acc; count: number; paidCount: number }>()
  for (const c of CATEGORIES) byCat.set(c.id, { acc: new Acc(), count: 0, paidCount: 0 })

  let paidCount = 0
  let eurItemCount = 0
  for (const item of items) {
    const n = shareNumerator(item, s)
    all.add(n, item.paid)
    if (item.currency === 'CZK') czkOnly.add(n, item.paid)
    else eurItemCount++
    if (item.paid) paidCount++
    const cat = byCat.get(item.category) ?? byCat.get('other')!
    cat.acc.add(n, item.paid)
    cat.count++
    if (item.paid) cat.paidCount++
  }

  const totals = all.totals(den)
  const exactTotal = all.missing ? null : all.total
  return {
    ...totals,
    travelers,
    itemCount: items.length,
    paidCount,
    unpaidCount: items.length - paidCount,
    eurItemCount,
    missingRate: all.missing,
    groupTotal: exactTotal == null ? null : roundExact({ num: exactTotal * BigInt(travelers), den }),
    czkOnlyTotal: czkOnly.totals(den).total ?? 0,
    paidRatio: all.missing || all.total === 0n ? 0 : Number((all.paid * 10000n) / all.total) / 10000,
    categories: CATEGORIES.map((c) => {
      const v = byCat.get(c.id)!
      return { id: c.id, count: v.count, paidCount: v.paidCount, missingRate: v.acc.missing, ...v.acc.totals(den) }
    }),
  }
}
