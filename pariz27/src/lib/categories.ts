import type { CategoryId } from './types'

export interface CategoryInfo {
  id: CategoryId
  label: string
  short: string
  /** barva akcentu kategorie (decentní) */
  color: string
}

export const CATEGORIES: readonly CategoryInfo[] = [
  { id: 'transport', label: 'Doprava a letenky', short: 'Doprava', color: '#2F4A73' },
  { id: 'accommodation', label: 'Ubytování', short: 'Ubytování', color: '#8A6D46' },
  { id: 'food', label: 'Jídlo a restaurace', short: 'Jídlo', color: '#B5473A' },
  { id: 'activities', label: 'Aktivity a zážitky', short: 'Aktivity', color: '#5E7F6B' },
  { id: 'sights', label: 'Památky a vstupné', short: 'Památky', color: '#7A5C8E' },
  { id: 'other', label: 'Ostatní', short: 'Ostatní', color: '#7C7F86' },
]

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id)

export function categoryInfo(id: CategoryId): CategoryInfo {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
}

export function isCategoryId(v: unknown): v is CategoryId {
  return typeof v === 'string' && (CATEGORY_IDS as string[]).includes(v)
}

/** Rychlé návrhy názvů položek – výběr zároveň předvyplní kategorii. */
export const ITEM_SUGGESTIONS: readonly { name: string; category: CategoryId }[] = [
  { name: 'Letenky', category: 'transport' },
  { name: 'Ubytování', category: 'accommodation' },
  { name: 'Vlak z letiště', category: 'transport' },
  { name: 'Eiffelova věž', category: 'sights' },
  { name: 'Restaurace', category: 'food' },
  { name: 'Muzeum Louvre', category: 'sights' },
]

export const PRESET_TAGS: readonly string[] = ['Restaurace', 'Památky', 'Zážitky', 'Nákupy', 'Ostatní']
