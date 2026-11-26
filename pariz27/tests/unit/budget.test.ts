import { describe, expect, it } from 'vitest'
import { fullCzkMinor, perPersonCzkMinor, perPersonOriginalMinor, summarize, type CalcSettings } from '../../src/lib/budget'
import type { BudgetItemData } from '../../src/lib/types'

const kc = (v: number) => Math.round(v * 100)

function item(p: Partial<BudgetItemData> & { amount: number }): BudgetItemData & { deleted_at: string | null } {
  return {
    name: 'X',
    amount_minor: kc(p.amount),
    currency: 'CZK',
    split: false,
    note: '',
    category: 'other',
    paid: false,
    deleted_at: null,
    ...p,
  }
}

const base: CalcSettings = { travelers: 2, eur_rate: null }

describe('příklad ze zadání', () => {
  const items = [
    item({ name: 'Ubytování', amount: 12000, split: true, category: 'accommodation' }),
    item({ name: 'Letenky', amount: 5000, split: true, category: 'transport' }),
    item({ name: 'Vstupné', amount: 800, split: false, category: 'sights' }),
  ]

  it('cena na osobu u jednotlivých položek', () => {
    expect(perPersonCzkMinor(items[0], base)).toBe(kc(6000))
    expect(perPersonCzkMinor(items[1], base)).toBe(kc(2500))
    expect(perPersonCzkMinor(items[2], base)).toBe(kc(800))
  })

  it('celkový rozpočet = 9 300 Kč na osobu', () => {
    const s = summarize(items, base)
    expect(s.total).toBe(kc(9300))
    expect(s.itemCount).toBe(3)
    expect(s.groupTotal).toBe(kc(18600))
    expect(s.missingRate).toBe(false)
  })

  it('součty podle kategorií', () => {
    const s = summarize(items, base)
    const byId = Object.fromEntries(s.categories.map((c) => [c.id, c.total]))
    expect(byId).toEqual({
      transport: kc(2500),
      accommodation: kc(6000),
      food: 0,
      activities: 0,
      sights: kc(800),
      other: 0,
    })
  })
})

describe('zaplacení', () => {
  it('nemění celkovou cenu, mění zaplaceno a zbývá', () => {
    const items = [item({ amount: 12000, split: true }), item({ amount: 800 })]
    const before = summarize(items, base)
    const after = summarize([{ ...items[0], paid: true }, items[1]], base)
    expect(before.total).toBe(kc(6800))
    expect(after.total).toBe(kc(6800))
    expect(before.paid).toBe(0)
    expect(before.remaining).toBe(kc(6800))
    expect(after.paid).toBe(kc(6000))
    expect(after.remaining).toBe(kc(800))
    expect(after.paidCount).toBe(1)
    expect(after.unpaidCount).toBe(1)
    expect(after.paidRatio).toBeCloseTo(6000 / 6800, 3)
  })
})

describe('úpravy a mazání', () => {
  it('smazaná položka se nezapočítává', () => {
    const items = [item({ amount: 100 }), { ...item({ amount: 900 }), deleted_at: '2026-01-01T00:00:00Z' }]
    expect(summarize(items, base).total).toBe(kc(100))
    expect(summarize(items, base).itemCount).toBe(1)
  })

  it('přepínač ceny za dvě osoby', () => {
    const it1 = item({ amount: 12000, split: false })
    expect(summarize([it1], base).total).toBe(kc(12000))
    expect(summarize([{ ...it1, split: true }], base).total).toBe(kc(6000))
  })

  it('počet cestujících se promítne do dělení', () => {
    const it1 = item({ amount: 12000, split: true })
    expect(perPersonCzkMinor(it1, { travelers: 3, eur_rate: null })).toBe(kc(4000))
    expect(perPersonCzkMinor(it1, { travelers: 1, eur_rate: null })).toBe(kc(12000))
    expect(summarize([it1], { travelers: 4, eur_rate: null }).groupTotal).toBe(kc(12000))
  })

  it('prázdný rozpočet', () => {
    const s = summarize([], base)
    expect(s.total).toBe(0)
    expect(s.paid).toBe(0)
    expect(s.remaining).toBe(0)
    expect(s.paidRatio).toBe(0)
  })
})

describe('měny a kurz', () => {
  const eur = item({ amount: 100, currency: 'EUR', split: true, category: 'food' })

  it('bez kurzu nevznikne zavádějící součet', () => {
    const s = summarize([eur, item({ amount: 800 })], base)
    expect(s.missingRate).toBe(true)
    expect(s.total).toBeNull()
    expect(s.paid).toBeNull()
    expect(s.remaining).toBeNull()
    expect(s.groupTotal).toBeNull()
    expect(s.czkOnlyTotal).toBe(kc(800))
    expect(s.eurItemCount).toBe(1)
    expect(s.categories.find((c) => c.id === 'food')!.missingRate).toBe(true)
    expect(s.categories.find((c) => c.id === 'other')!.total).toBe(kc(800))
    expect(perPersonCzkMinor(eur, base)).toBeNull()
  })

  it('položky jen v CZK kurz nepotřebují', () => {
    expect(summarize([item({ amount: 800 })], base).missingRate).toBe(false)
  })

  it('přepočet EUR → CZK podle nastaveného kurzu', () => {
    const s = { travelers: 2, eur_rate: 25.235 }
    expect(fullCzkMinor(eur, s)).toBe(kc(2523.5))
    expect(perPersonCzkMinor(eur, s)).toBe(kc(1261.75))
    expect(perPersonOriginalMinor(eur, 2)).toBe(5000) // 50,00 €
    expect(summarize([eur, item({ amount: 800 })], s).total).toBe(kc(2061.75))
  })

  it('změna kurzu okamžitě přepočítá součet', () => {
    expect(summarize([eur], { travelers: 2, eur_rate: 25 }).total).toBe(kc(1250))
    expect(summarize([eur], { travelers: 2, eur_rate: 24.5 }).total).toBe(kc(1225))
  })
})

describe('přesnost – žádné opakované zaokrouhlování', () => {
  it('třetiny se sčítají přesně a zaokrouhlí se až výsledek', () => {
    // 3 × (1,00 Kč / 3 osoby) = 1,00 Kč – při zaokrouhlení každé položky by vyšlo 0,99 Kč
    const items = [1, 2, 3].map(() => item({ amount: 1, split: true }))
    const s = summarize(items, { travelers: 3, eur_rate: null })
    expect(s.total).toBe(100)
    expect(perPersonCzkMinor(items[0], { travelers: 3, eur_rate: null })).toBe(33)
  })

  it('EUR s lichými centy a kurzem na 4 desetinná místa', () => {
    // 10 × 0,01 € / 2 osoby při kurzu 25,2351 = 10 × 0,1261755 Kč = 1,261755 Kč → 1,26 Kč
    const items = Array.from({ length: 10 }, () => ({ ...item({ amount: 0 }), amount_minor: 1, currency: 'EUR' as const, split: true }))
    expect(summarize(items, { travelers: 2, eur_rate: 25.2351 }).total).toBe(126)
  })

  it('klasický problém 0,1 + 0,2', () => {
    const s = summarize([item({ amount: 0.1 }), item({ amount: 0.2 })], base)
    expect(s.total).toBe(30)
  })

  it('velké částky bez přetečení', () => {
    const s = summarize([{ ...item({ amount: 0 }), amount_minor: 100_000_000_000, currency: 'EUR' }], {
      travelers: 20,
      eur_rate: 999.9999,
    })
    expect(s.total).toBe(Math.round(100_000_000_000 * 999.9999))
  })
})
