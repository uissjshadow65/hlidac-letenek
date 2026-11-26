import type { Currency } from './types'

/** Maximální částka jedné položky: 1 miliarda (v hlavních jednotkách). */
export const MAX_AMOUNT_MINOR = 100_000_000_000

const SPACES = /[\s  ']/g

/**
 * Převede text zadaný uživatelem na celé číslo v haléřích / centech.
 * Přijímá české i anglické zápisy: "12 000", "12000,50", "12.000,50", "1,234.5", "6 000 Kč".
 * Vrací null, pokud text není platná nezáporná částka s nejvýše 2 desetinnými místy.
 */
export function parseAmount(input: string): number | null {
  let s = input.trim().replace(/(kč|czk|eur|€)/gi, '').replace(SPACES, '')
  if (s === '' || s.startsWith('-')) return null
  if (s.startsWith('+')) s = s.slice(1)

  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  let intPart: string
  let fracPart = ''

  if (lastComma >= 0 && lastDot >= 0) {
    // oba oddělovače – desetinný je ten poslední, druhý odděluje tisíce
    const decSep = lastComma > lastDot ? ',' : '.'
    const thouSep = decSep === ',' ? '.' : ','
    const idx = s.lastIndexOf(decSep)
    intPart = s.slice(0, idx).split(thouSep).join('')
    fracPart = s.slice(idx + 1)
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? ',' : '.'
    const parts = s.split(sep)
    if (parts.length > 2) {
      // "1.000.000" – oddělovače tisíců
      if (!parts.slice(1).every((p) => p.length === 3)) return null
      intPart = parts.join('')
    } else if (sep === '.' && parts[1].length === 3 && /^\d{1,3}$/.test(parts[0])) {
      // "12.000" – v češtině obvykle tisíce
      intPart = parts.join('')
    } else {
      intPart = parts[0]
      fracPart = parts[1]
    }
  } else {
    intPart = s
  }

  if (intPart === '') intPart = '0'
  if (!/^\d+$/.test(intPart) || !/^\d{0,2}$/.test(fracPart)) return null
  const minor = Number(intPart) * 100 + Number(fracPart.padEnd(2, '0') || '0')
  if (!Number.isSafeInteger(minor) || minor > MAX_AMOUNT_MINOR) return null
  return minor
}

/** Převede směnný kurz z textu ("25,235") na číslo se 4 desetinnými místy. */
export function parseRate(input: string): number | null {
  const s = input.trim().replace(SPACES, '').replace(',', '.')
  if (!/^\d{1,4}(\.\d{1,4})?$/.test(s)) return null
  const v = Number(s)
  if (!(v > 0) || v > 1000) return null
  return Math.round(v * 10000) / 10000
}

/** Kurz jako celé číslo v desetitisícinách (25,235 → 252350) – pro přesné výpočty. */
export function rateToE4(rate: number): bigint {
  return BigInt(Math.round(rate * 10000))
}

const groupFmt = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 })
const fracFmt = new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Zformátuje celé číslo v haléřích/centech. Desetinná místa jen pokud nejsou nulová. */
export function formatMinor(minor: number, currency: Currency = 'CZK', opts: { alwaysDecimals?: boolean } = {}): string {
  const negative = minor < 0
  const abs = Math.abs(minor)
  const whole = abs % 100 === 0 && !opts.alwaysDecimals
  const num = whole ? groupFmt.format(abs / 100) : fracFmt.format(abs / 100)
  const sign = negative ? '−' : ''
  return currency === 'CZK' ? `${sign}${num} Kč` : `${sign}${num} €`
}

/** Číslo bez měny pro vstupní pole (např. "12 000" nebo "12 000,50"). */
export function formatAmountInput(minor: number): string {
  return minor % 100 === 0 ? groupFmt.format(minor / 100) : fracFmt.format(minor / 100)
}

export function formatRate(rate: number): string {
  return new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(rate)
}

export function currencySymbol(c: Currency): string {
  return c === 'CZK' ? 'Kč' : '€'
}
