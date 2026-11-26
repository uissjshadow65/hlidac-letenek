import { jsPDF } from 'jspdf'
import interRegularUrl from '../../assets/fonts/Inter_400Regular.ttf?url'
import interSemiUrl from '../../assets/fonts/Inter_600SemiBold.ttf?url'
import serifUrl from '../../assets/fonts/PlayfairDisplay_600SemiBold.ttf?url'
import { perPersonCzkMinor, summarize, type CalcSettings } from '../budget'
import { categoryInfo } from '../categories'
import { formatDateTime, formatTripRange, personsAccusative } from '../czech'
import { formatMinor, formatRate } from '../money'
import type { BudgetItemData } from '../types'
import { sortItemsForExport } from './csv'

type Item = BudgetItemData & { deleted_at?: string | null }

const NAVY: [number, number, number] = [20, 33, 61]
const RED: [number, number, number] = [178, 58, 72]
const INK: [number, number, number] = [31, 36, 48]
const MUTED: [number, number, number] = [110, 116, 128]
const LINE: [number, number, number] = [226, 219, 206]
const CREAM: [number, number, number] = [247, 242, 234]

async function fontBase64(url: string): Promise<string> {
  const buf = await (await fetch(url)).arrayBuffer()
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

/** Text pro PDF – nedělitelné mezery nahradíme běžnými (kvůli měření šířky). */
const t = (s: string) => s.replace(/[  ]/g, ' ')

export interface PdfTripInfo extends CalcSettings {
  name: string
  start_date: string | null
  end_date: string | null
}

export async function budgetToPdf(allItems: readonly Item[], trip: PdfTripInfo): Promise<Blob> {
  const items = sortItemsForExport(allItems)
  const s = summarize(items, trip)
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const [reg, semi, serif] = await Promise.all([fontBase64(interRegularUrl), fontBase64(interSemiUrl), fontBase64(serifUrl)])
  doc.addFileToVFS('Inter-Regular.ttf', reg)
  doc.addFont('Inter-Regular.ttf', 'Inter', 'normal')
  doc.addFileToVFS('Inter-SemiBold.ttf', semi)
  doc.addFont('Inter-SemiBold.ttf', 'Inter', 'bold')
  doc.addFileToVFS('Serif.ttf', serif)
  doc.addFont('Serif.ttf', 'Serif', 'normal')

  const W = 210
  const H = 297
  const M = 16
  const contentW = W - 2 * M
  let y = M

  const font = (style: 'normal' | 'bold', size: number, color: [number, number, number] = INK) => {
    doc.setFont('Inter', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
  }
  const ensure = (h: number) => {
    if (y + h > H - 18) {
      doc.addPage()
      y = M
      drawTableHeader()
    }
  }

  // ---------- hlavička
  doc.setFont('Serif', 'normal')
  doc.setFontSize(30)
  doc.setTextColor(...NAVY)
  doc.text(t(trip.name || 'Paříž 27'), M, y + 9)
  doc.setFillColor(...RED)
  doc.rect(M, y + 13, 14, 0.9, 'F')
  y += 20
  font('normal', 9.5, MUTED)
  const range = formatTripRange(trip.start_date, trip.end_date)
  const info = [
    'Rozpočet cesty',
    range,
    `počet cestujících: ${trip.travelers}`,
    s.eurItemCount > 0 || trip.eur_rate != null ? (trip.eur_rate != null ? `kurz EUR/CZK ${formatRate(trip.eur_rate)}` : 'kurz EUR/CZK nenastaven') : null,
  ].filter(Boolean)
  doc.text(t(info.join('  ·  ')), M, y)
  y += 5
  doc.text(t(`Vytvořeno ${formatDateTime(new Date().toISOString())}`), M, y)
  y += 8

  // ---------- souhrn
  const boxH = 34
  doc.setFillColor(...NAVY)
  doc.roundedRect(M, y, contentW, boxH, 3, 3, 'F')
  font('normal', 9, [210, 214, 224])
  doc.text('MŮJ ROZPOČET (NA OSOBU)', M + 7, y + 9)
  doc.setFont('Serif', 'normal')
  doc.setFontSize(26)
  doc.setTextColor(255, 255, 255)
  doc.text(t(s.total == null ? 'Nelze spočítat' : formatMinor(s.total)), M + 7, y + 22)
  font('normal', 8.5, [210, 214, 224])
  if (s.missingRate) doc.text('Nastavte kurz EUR/CZK – některé položky jsou v eurech.', M + 7, y + 29)
  else doc.text(t(`Orientačně pro ${personsAccusative(s.travelers)}: ${formatMinor(s.groupTotal ?? 0)}`), M + 7, y + 29)

  const col = (label: string, value: string, x: number) => {
    font('normal', 8, [210, 214, 224])
    doc.text(label, x, y + 12)
    font('bold', 12, [255, 255, 255])
    doc.text(t(value), x, y + 19)
  }
  const fmt = (v: number | null) => (v == null ? '—' : formatMinor(v))
  col('ZAPLACENO', fmt(s.paid), M + 104)
  col('ZBÝVÁ ZAPLATIT', fmt(s.remaining), M + 142)
  font('normal', 8, [210, 214, 224])
  doc.text(t(`${s.itemCount} položek · ${s.paidCount} zaplaceno`), M + 104, y + 29)
  y += boxH + 10

  // ---------- tabulka
  const cx = { name: M, given: M + 84, person: M + 124, paid: W - M }
  function drawTableHeader() {
    font('bold', 7.5, MUTED)
    doc.text('POLOŽKA', cx.name, y)
    doc.text('ZADANÁ CENA', cx.given, y)
    doc.text('DO MÉHO ROZPOČTU', cx.person, y)
    doc.text('STAV', cx.paid, y, { align: 'right' })
    y += 2.5
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.3)
    doc.line(M, y, W - M, y)
    y += 5
  }

  if (!items.length) {
    font('normal', 11, MUTED)
    doc.text('Rozpočet zatím neobsahuje žádné položky.', M, y)
  } else {
    drawTableHeader()
    for (const cat of s.categories) {
      const catItems = items.filter((i) => i.category === cat.id)
      if (!catItems.length) continue
      ensure(16)
      doc.setFillColor(...CREAM)
      doc.rect(M, y - 4.5, contentW, 7, 'F')
      font('bold', 9.5, NAVY)
      doc.text(t(categoryInfo(cat.id).label), M + 2, y)
      doc.text(t(cat.total == null ? 'chybí kurz' : `${formatMinor(cat.total)} / os.`), cx.paid - 2, y, { align: 'right' })
      y += 7

      for (const i of catItems) {
        const nameLines = doc.splitTextToSize(t(i.name), 78) as string[]
        font('normal', 7.5)
        const noteLines = i.note ? (doc.splitTextToSize(t(i.note), 78) as string[]).slice(0, 4) : []
        const rowH = Math.max(nameLines.length * 4.4 + noteLines.length * 3.4, i.split ? 8.4 : 4.4) + 3
        ensure(rowH)
        const top = y
        font('normal', 9.5)
        doc.text(nameLines, cx.name, y)
        let ny = y + nameLines.length * 4.4
        if (noteLines.length) {
          font('normal', 7.5, MUTED)
          doc.text(noteLines, cx.name, ny - 0.6)
          ny += noteLines.length * 3.4
        }
        font('normal', 9.5)
        doc.text(t(formatMinor(i.amount_minor, i.currency)), cx.given, top)
        if (i.split) {
          font('normal', 7.5, MUTED)
          doc.text(t(`cena za ${personsAccusative(s.travelers)}`), cx.given, top + 4)
        }
        const pp = perPersonCzkMinor(i, trip)
        font('bold', 9.5)
        doc.text(t(pp == null ? 'chybí kurz' : formatMinor(pp)), cx.person, top)
        font('normal', 8.5, i.paid ? [46, 125, 90] : MUTED)
        doc.text(i.paid ? 'Zaplaceno' : 'Nezaplaceno', cx.paid, top, { align: 'right' })
        y = Math.max(ny, top + (i.split ? 8.4 : 4.4)) + 1.6
        doc.setDrawColor(...LINE)
        doc.setLineWidth(0.15)
        doc.line(M, y - 3, W - M, y - 3)
        y += 1.4
      }
      y += 2
    }

    // ---------- konečný součet
    ensure(26)
    y += 2
    doc.setDrawColor(...NAVY)
    doc.setLineWidth(0.6)
    doc.line(M, y, W - M, y)
    y += 7
    font('bold', 11, NAVY)
    doc.text('Celkem na osobu', M, y)
    doc.text(t(s.total == null ? 'Nelze spočítat – chybí kurz EUR/CZK' : formatMinor(s.total)), W - M, y, { align: 'right' })
    y += 6
    font('normal', 9, MUTED)
    doc.text(t(`Zaplaceno ${fmt(s.paid)}  ·  Zbývá zaplatit ${fmt(s.remaining)}`), W - M, y, { align: 'right' })
    y += 5
    doc.text(t(`Orientačně pro ${personsAccusative(s.travelers)}: ${fmt(s.groupTotal)}`), W - M, y, { align: 'right' })
  }

  // ---------- zápatí
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    font('normal', 7.5, MUTED)
    doc.text(t(`${trip.name || 'Paříž 27'} · rozpočet`), M, H - 9)
    doc.text(`${p} / ${pages}`, W - M, H - 9, { align: 'right' })
  }

  return doc.output('blob')
}
