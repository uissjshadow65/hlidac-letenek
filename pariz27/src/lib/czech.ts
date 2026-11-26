/** České skloňování podle počtu: plural(2, ['položka','položky','položek']) → 'položky' */
export function plural(n: number, forms: [one: string, few: string, many: string]): string {
  const abs = Math.abs(n)
  if (abs === 1) return forms[0]
  if (abs >= 2 && abs <= 4) return forms[1]
  return forms[2]
}

export function countLabel(n: number, forms: [string, string, string]): string {
  return `${n} ${plural(n, forms)}`
}

/** „Cena je za 2 osoby“, „Cena je za 5 osob“ */
export function personsAccusative(n: number): string {
  if (n === 1) return '1 osobu'
  return `${n} ${plural(n, ['osobu', 'osoby', 'osob'])}`
}

/** „pro 2 osoby“, „pro 5 osob“ (akuzativ po „pro“) */
export const personsFor = personsAccusative

const dateFmt = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
const dateShortFmt = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDate(iso: string): string {
  return dateFmt.format(parseIsoDate(iso))
}

export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso))
}

/** „8.–13. května 2027“ / „8. 5. – 2. 6. 2027“ */
export function formatTripRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null
  if (start && !end) return formatDate(start)
  if (!start && end) return `do ${formatDate(end)}`
  const a = parseIsoDate(start!)
  const b = parseIsoDate(end!)
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    if (a.getDate() === b.getDate()) return formatDate(start!)
    return `${a.getDate()}.–${dateFmt.format(b)}`
  }
  return `${dateShortFmt.format(a)} – ${dateFmt.format(b)}`
}

/** Počet dní do začátku cesty (null, pokud termín není nastaven). */
export function daysUntil(start: string | null, today = new Date()): number | null {
  if (!start) return null
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((parseIsoDate(start).getTime() - t.getTime()) / 86_400_000)
}

export function countdownLabel(start: string | null, end: string | null, today = new Date()): string | null {
  const d = daysUntil(start, today)
  if (d == null) return null
  if (d > 1) return `Za ${d} ${plural(d, ['den', 'dny', 'dní'])}`
  if (d === 1) return 'Zítra odjíždíme'
  if (d === 0) return 'Dnes odjíždíme'
  const e = daysUntil(end, today)
  if (e != null && e >= 0) return 'Právě jsme v Paříži'
  return 'Cesta proběhla'
}

/** Porovnání bez ohledu na diakritiku a velikost písmen – pro vyhledávání. */
export function normalizeForSearch(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}
