import { describe, expect, it } from 'vitest'
import { formatMinor, parseAmount, parseRate, formatAmountInput, formatRate } from '../../src/lib/money'
import { countdownLabel, formatTripRange, personsAccusative, plural } from '../../src/lib/czech'

describe('parseAmount', () => {
  it.each([
    ['12000', 1200000],
    ['12 000', 1200000],
    ['12 000', 1200000],
    ['12 000 Kč', 1200000],
    ['12000,5', 1200050],
    ['12000,50', 1200050],
    ['12.000,50', 1200050],
    ['1,234.56', 123456],
    ['12.000', 1200000],
    ['1.000.000', 100000000],
    ['99.90', 9990],
    ['0,99', 99],
    [',5', 50],
    ['0', 0],
    ['€ 45', 4500],
  ])('%s → %i', (input, expected) => {
    expect(parseAmount(input)).toBe(expected)
  })

  it.each(['', 'abc', '-5', '1,2,3', '12,345', '1,234', '1.2.3', '5,123', '10,001'])('odmítne „%s“', (input) => {
    // "12,345" by bylo 3 desetinná místa – raději odmítnout než tiše zaokrouhlit
    expect(parseAmount(input)).toBeNull()
  })
})

describe('parseRate', () => {
  it('čte český i anglický zápis', () => {
    expect(parseRate('25,235')).toBe(25.235)
    expect(parseRate('25.2')).toBe(25.2)
    expect(parseRate('25')).toBe(25)
  })
  it('odmítne neplatný kurz', () => {
    expect(parseRate('0')).toBeNull()
    expect(parseRate('')).toBeNull()
    expect(parseRate('abc')).toBeNull()
    expect(parseRate('25,12345')).toBeNull()
  })
})

describe('formátování', () => {
  it('česky s nedělitelnými mezerami', () => {
    expect(formatMinor(1200000)).toBe('12 000 Kč')
    expect(formatMinor(600050)).toBe('6 000,50 Kč')
    expect(formatMinor(4550, 'EUR')).toBe('45,50 €')
    expect(formatMinor(0)).toBe('0 Kč')
    expect(formatAmountInput(1200050)).toBe('12 000,50')
    expect(formatRate(25.2)).toBe('25,20')
    expect(formatRate(25.235)).toBe('25,235')
  })
})

describe('čeština', () => {
  it('skloňování', () => {
    expect(plural(1, ['položka', 'položky', 'položek'])).toBe('položka')
    expect(plural(3, ['položka', 'položky', 'položek'])).toBe('položky')
    expect(plural(5, ['položka', 'položky', 'položek'])).toBe('položek')
    expect(plural(0, ['položka', 'položky', 'položek'])).toBe('položek')
    expect(personsAccusative(2)).toBe('2 osoby')
    expect(personsAccusative(5)).toBe('5 osob')
  })

  it('termín a odpočet', () => {
    expect(formatTripRange('2027-05-08', '2027-05-13')).toBe('8.–13. května 2027')
    const today = new Date(2026, 10, 26)
    expect(countdownLabel('2027-05-08', '2027-05-13', today)).toBe('Za 163 dní')
    expect(countdownLabel('2026-11-27', null, today)).toBe('Zítra odjíždíme')
    expect(countdownLabel(null, null, today)).toBeNull()
  })
})
