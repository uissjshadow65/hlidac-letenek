import { perPersonCzkMinor, perPersonOriginalMinor, summarize, type CalcSettings } from '../budget'
import { CATEGORIES, categoryInfo } from '../categories'
import { personsAccusative } from '../czech'
import type { BudgetItemData } from '../types'

type Item = BudgetItemData & { deleted_at?: string | null }

/** Číslo pro tabulkový procesor: bez oddělovače tisíců, desetinná čárka. */
function num(minor: number | null): string {
  if (minor == null) return ''
  return (minor / 100).toFixed(2).replace('.', ',')
}

function cell(v: string): string {
  let s = v
  // ochrana proti spuštění vzorce v Excelu (CSV injection)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  if (/[;"\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

export function sortItemsForExport<T extends Item>(items: readonly T[]): T[] {
  const order = new Map(CATEGORIES.map((c, i) => [c.id, i]))
  return items
    .filter((i) => !i.deleted_at)
    .slice()
    .sort((a, b) => (order.get(a.category)! - order.get(b.category)!) || a.name.localeCompare(b.name, 'cs'))
}

/**
 * Rozpočet jako CSV (oddělovač středník, UTF-8 s BOM – otevře se správně v Excelu i Numbers).
 */
export function budgetToCsv(allItems: readonly Item[], settings: CalcSettings & { name?: string }): string {
  const items = sortItemsForExport(allItems)
  const s = summarize(items, settings)
  const rate = settings.eur_rate != null ? String(settings.eur_rate).replace('.', ',') : ''
  const lines: string[][] = [
    [
      'Kategorie',
      'Název',
      'Zadaná cena',
      'Měna',
      `Cena za ${personsAccusative(s.travelers).replace(' ', ' ')}`,
      'Cena na osobu (původní měna)',
      'Kurz EUR/CZK',
      'Do mého rozpočtu (Kč)',
      'Zaplaceno',
      'Poznámka',
    ],
  ]
  for (const i of items) {
    lines.push([
      categoryInfo(i.category).label,
      i.name,
      num(i.amount_minor),
      i.currency,
      i.split ? 'Ano' : 'Ne',
      num(perPersonOriginalMinor(i, s.travelers)),
      i.currency === 'EUR' ? rate : '',
      num(perPersonCzkMinor(i, settings)),
      i.paid ? 'Ano' : 'Ne',
      i.note,
    ])
  }
  lines.push([])
  const missing = s.missingRate ? 'Nelze spočítat – chybí kurz EUR/CZK' : ''
  lines.push(['Celkem na osobu (Kč)', '', '', '', '', '', '', s.total == null ? missing : num(s.total)])
  lines.push(['Zaplaceno (Kč)', '', '', '', '', '', '', s.paid == null ? missing : num(s.paid)])
  lines.push(['Zbývá zaplatit (Kč)', '', '', '', '', '', '', s.remaining == null ? missing : num(s.remaining)])
  lines.push([
    `Orientačně pro ${personsAccusative(s.travelers).replace(' ', ' ')} (Kč)`,
    '',
    '',
    '',
    '',
    '',
    '',
    s.groupTotal == null ? missing : num(s.groupTotal),
  ])
  lines.push([])
  for (const c of s.categories) {
    if (!c.count) continue
    lines.push([`Součet – ${categoryInfo(c.id).label} (Kč / osoba)`, '', '', '', '', '', '', c.total == null ? missing : num(c.total)])
  }
  return '﻿' + lines.map((l) => l.map(cell).join(';')).join('\r\n') + '\r\n'
}
