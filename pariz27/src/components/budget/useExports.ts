import { useCallback, useState } from 'react'
import { useBudgetItems, useData, useSettings } from '../../state/app'
import { useToast } from '../../state/toast'
import { budgetToCsv } from '../../lib/export/csv'
import { fileStamp, shareOrDownload } from '../../lib/export/share'
import { createBackup } from '../../lib/export/backup'

export function useExports() {
  const items = useBudgetItems()
  const settings = useSettings()
  const { db } = useData()
  const toast = useToast()
  const [busy, setBusy] = useState<null | 'csv' | 'pdf' | 'json'>(null)

  const done = (r: 'shared' | 'downloaded' | 'cancelled', what: string) => {
    if (r === 'downloaded') toast.show(`${what} byl stažen`)
    if (r === 'shared') toast.show(`${what} je připraven`)
  }

  const exportCsv = useCallback(async () => {
    if (!items || !settings) return
    setBusy('csv')
    try {
      const csv = budgetToCsv(items, settings)
      done(await shareOrDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `pariz27-rozpocet-${fileStamp()}.csv`, 'Rozpočet (CSV)'), 'Soubor CSV')
    } finally {
      setBusy(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, settings])

  const exportPdf = useCallback(async () => {
    if (!items || !settings) return
    setBusy('pdf')
    try {
      const { budgetToPdf } = await import('../../lib/export/pdf')
      const blob = await budgetToPdf(items, settings)
      done(await shareOrDownload(blob, `pariz27-rozpocet-${fileStamp()}.pdf`, 'Rozpočet (PDF)'), 'Soubor PDF')
    } catch {
      toast.show('PDF se nepodařilo vytvořit. Zkuste to prosím znovu.', { tone: 'warning' })
    } finally {
      setBusy(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, settings])

  const exportBackup = useCallback(async () => {
    setBusy('json')
    try {
      const data = await createBackup(db)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      done(await shareOrDownload(blob, `pariz27-zaloha-${fileStamp()}.json`, 'Záloha Paříž 27'), 'Záložní soubor')
    } finally {
      setBusy(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db])

  return { exportCsv, exportPdf, exportBackup, busy, ready: !!items && !!settings }
}
