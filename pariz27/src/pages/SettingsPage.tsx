import { useEffect, useId, useRef, useState } from 'react'
import { useLocation, useOutletContext } from 'react-router-dom'
import { AlertTriangle, Download, ExternalLink, FileSpreadsheet, FileText, LogOut, Minus, Plus, RefreshCw, Upload, Share, SquarePlus } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import { useSyncInfo } from '../components/SyncBadge'
import { useExports } from '../components/budget/useExports'
import { Button, Card, FieldLabel, SectionTitle, cx, inputClass, useConfirm } from '../components/ui'
import { formatDateTime, personsAccusative } from '../lib/czech'
import { formatRate, parseRate } from '../lib/money'
import { restoreBackup } from '../lib/export/backup'
import { useAuth, useConflicts, useData, usePendingCount, useSettings } from '../state/app'
import { useToast } from '../state/toast'

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function Row({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx('border-t border-line/60 px-5 py-4 first:border-t-0', className)}>{children}</div>
}

export function SettingsPage() {
  const settings = useSettings()
  const { repo, db, userId, email, local, sync, syncNow, online } = useData()
  const { signOut } = useAuth()
  const pending = usePendingCount()
  const conflicts = useConflicts()
  const info = useSyncInfo()
  const toast = useToast()
  const confirm = useConfirm()
  const { exportCsv, exportPdf, exportBackup, busy } = useExports()
  const { openConflicts } = useOutletContext<{ openConflicts: () => void }>()
  const loc = useLocation()
  const ids = { name: useId(), start: useId(), end: useId(), rate: useId() }
  const restoreRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [travelers, setTravelers] = useState(2)
  const [rateText, setRateText] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (!settings || initialized) return
    setName(settings.name)
    setStart(settings.start_date ?? '')
    setEnd(settings.end_date ?? '')
    setTravelers(settings.travelers)
    setRateText(settings.eur_rate != null ? formatRate(settings.eur_rate) : '')
    setInitialized(true)
  }, [settings, initialized])

  // když se nastavení změní na druhém zařízení a tady nic neupravujeme, převezmeme ho
  const savedRef = useRef(settings)
  useEffect(() => {
    if (!settings || !initialized) return
    const prev = savedRef.current
    savedRef.current = settings
    if (!prev) return
    const formMatchesPrev =
      name === prev.name &&
      start === (prev.start_date ?? '') &&
      end === (prev.end_date ?? '') &&
      travelers === prev.travelers &&
      (rateText === '' ? prev.eur_rate == null : parseRate(rateText) === prev.eur_rate)
    if (formMatchesPrev) {
      setName(settings.name)
      setStart(settings.start_date ?? '')
      setEnd(settings.end_date ?? '')
      setTravelers(settings.travelers)
      setRateText(settings.eur_rate != null ? formatRate(settings.eur_rate) : '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  useEffect(() => {
    if (!loc.hash) return
    const el = document.getElementById(loc.hash.slice(1))
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }, [loc.hash, initialized])

  if (!settings) return null

  const rate = rateText.trim() === '' ? null : parseRate(rateText)
  const rateInvalid = rateText.trim() !== '' && rate == null
  const datesInvalid = !!start && !!end && end < start
  const dirty =
    name.trim() !== settings.name ||
    (start || null) !== settings.start_date ||
    (end || null) !== settings.end_date ||
    travelers !== settings.travelers ||
    (!rateInvalid && rate !== settings.eur_rate)

  const save = async () => {
    setTried(true)
    if (rateInvalid || datesInvalid || !name.trim()) return
    if (rate !== settings.eur_rate) {
      const ok = await confirm({
        title: 'Změnit směnný kurz?',
        message: (
          <>
            Kurz EUR/CZK se změní z <strong>{settings.eur_rate == null ? 'nenastaveno' : `${formatRate(settings.eur_rate)} Kč`}</strong> na{' '}
            <strong>{rate == null ? 'nenastaveno' : `${formatRate(rate)} Kč`}</strong>. Všechny položky v eurech se přepočítají.
          </>
        ),
        confirmLabel: 'Změnit kurz',
      })
      if (!ok) return
    }
    if (travelers !== settings.travelers) {
      const ok = await confirm({
        title: 'Změnit počet cestujících?',
        message: (
          <>
            Počet cestujících se změní z {settings.travelers} na {travelers}. Ceny zadané za všechny cestující se nově rozpočítají na{' '}
            {personsAccusative(travelers)} a celý rozpočet se přepočítá.
          </>
        ),
        confirmLabel: 'Změnit',
      })
      if (!ok) return
    }
    await repo.saveSettings({ name: name.trim(), start_date: start || null, end_date: end || null, travelers, eur_rate: rate })
    setTried(false)
    toast.show('Nastavení uloženo')
  }

  const onSignOut = async () => {
    const ok = await confirm({
      title: local ? 'Ukončit režim bez účtu?' : 'Odhlásit se?',
      message: local ? (
        'Data zůstanou uložená v tomto zařízení.'
      ) : pending > 0 ? (
        <>
          <span className="font-semibold text-red">{pending} změn ještě není odesláno na server</span> a odhlášením se ztratí. Nejdříve se připojte k internetu a počkejte na synchronizaci.
        </>
      ) : (
        'Data jsou bezpečně uložená na serveru. Po přihlášení se znovu načtou.'
      ),
      confirmLabel: local ? 'Ukončit' : 'Odhlásit',
      danger: pending > 0 && !local,
    })
    if (ok) await signOut()
  }

  const onRestore = async (file: File | undefined) => {
    if (!file) return
    try {
      const data = JSON.parse(await file.text()) as unknown
      const ok = await confirm({
        title: 'Obnovit ze zálohy?',
        message: 'Položky a poznámky ze zálohy se doplní nebo přepíšou stávající se stejným obsahem. Nic se nesmaže.',
        confirmLabel: 'Obnovit',
      })
      if (!ok) return
      const r = await restoreBackup(db, userId, data)
      syncNow()
      toast.show(`Obnoveno: ${r.items} položek, ${r.notes} poznámek, ${r.photos} fotografií`)
    } catch (e) {
      toast.show(e instanceof Error && e.message.includes('Paříž') ? e.message : 'Soubor se nepodařilo načíst. Je to záloha z aplikace Paříž 27?', { tone: 'warning' })
    } finally {
      if (restoreRef.current) restoreRef.current.value = ''
    }
  }

  const standalone = isStandalone()

  return (
    <>
      <PageHeader eyebrow="Nastavení" title="Nastavení" />

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-8">
          <section>
            <SectionTitle>Informace o cestě</SectionTitle>
            <Card className="p-5">
              <div className="flex flex-col gap-5">
                <div>
                  <FieldLabel htmlFor={ids.name}>Název cesty</FieldLabel>
                  <input id={ids.name} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Paříž 27" />
                </div>
                <div>
                  <FieldLabel>Termín cesty</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1 block text-[12.5px] text-muted">Odjezd</span>
                      <input id={ids.start} type="date" className={cx(inputClass, 'h-12 py-0')} value={start} onChange={(e) => setStart(e.target.value)} />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[12.5px] text-muted">Návrat</span>
                      <input
                        id={ids.end}
                        type="date"
                        className={cx(inputClass, 'h-12 py-0', datesInvalid && 'border-red')}
                        value={end}
                        min={start || undefined}
                        onChange={(e) => setEnd(e.target.value)}
                      />
                    </label>
                  </div>
                  {datesInvalid && <p className="mt-1.5 text-[13px] text-red">Návrat nemůže být dříve než odjezd.</p>}
                </div>
                <div>
                  <FieldLabel hint="pro dělení cen „za všechny“">Počet cestujících</FieldLabel>
                  <div className="flex items-center gap-3">
                    <Button variant="secondary" className="size-12 rounded-full p-0" aria-label="Méně cestujících" onClick={() => setTravelers((t) => Math.max(1, t - 1))} disabled={travelers <= 1}>
                      <Minus className="size-5" />
                    </Button>
                    <span className="tabular w-16 text-center font-serif text-[34px] font-semibold text-navy" aria-live="polite" data-testid="travelers">
                      {travelers}
                    </span>
                    <Button variant="secondary" className="size-12 rounded-full p-0" aria-label="Více cestujících" onClick={() => setTravelers((t) => Math.min(20, t + 1))} disabled={travelers >= 20}>
                      <Plus className="size-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          <section id="kurz" className="scroll-mt-6">
            <SectionTitle>Měna</SectionTitle>
            <Card className="p-5">
              <FieldLabel htmlFor={ids.rate}>Směnný kurz EUR/CZK</FieldLabel>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-medium text-muted">1 € =</span>
                <input
                  id={ids.rate}
                  className={cx(inputClass, 'tabular pl-[58px] pr-12 text-[20px] font-semibold', (rateInvalid || (tried && rateInvalid)) && 'border-red ring-4 ring-red/10')}
                  inputMode="decimal"
                  value={rateText}
                  onChange={(e) => setRateText(e.target.value)}
                  placeholder="např. 25,20"
                  autoComplete="off"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[16px] font-semibold text-muted">Kč</span>
              </div>
              {rateInvalid && <p className="mt-1.5 text-[13px] text-red">Zadejte kladné číslo s nejvýše 4 desetinnými místy, např. 25,20.</p>}
              {settings.eur_rate == null && !rateText && (
                <p className="mt-3 flex gap-2 rounded-2xl bg-amber-soft px-3.5 py-3 text-[13.5px] leading-snug text-amber">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  Kurz není nastaven. Položky v eurech se do celkového rozpočtu nezapočítají, dokud kurz nezadáte.
                </p>
              )}
              <p className="mt-3 text-[13px] leading-relaxed text-muted">
                Kurz se nikdy nemění automaticky – rozpočet se počítá jen kurzem, který tu zadáte. Všechny částky se přepočítávají do Kč.
              </p>
              <a
                href="https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-navy underline decoration-line underline-offset-4"
              >
                Aktuální kurz ČNB <ExternalLink className="size-3.5" />
              </a>
            </Card>
          </section>

          {dirty && (
            <div className="sticky z-20 -mt-4 animate-rise" style={{ bottom: 'calc(var(--nav-h) + var(--safe-bottom) + 12px)' }}>
              <Button size="lg" className="w-full shadow-float" onClick={() => void save()}>
                Uložit změny
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-8">
          <section id="synchronizace" className="scroll-mt-6">
            <SectionTitle>Synchronizace</SectionTitle>
            <Card>
              <Row>
                <p className={cx('text-[15px] font-semibold', info.tone === 'ok' ? 'text-green' : info.tone === 'offline' ? 'text-amber' : info.tone === 'error' || info.tone === 'conflict' ? 'text-red' : 'text-navy')}>
                  {info.label}
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{info.detail}</p>
                {!local && (
                  <p className="mt-2 text-[12.5px] text-muted">
                    {sync.lastSyncAt ? `Naposledy synchronizováno ${formatDateTime(sync.lastSyncAt)}` : 'Zatím nesynchronizováno'}
                    {pending > 0 && ` · čeká ${pending}`}
                  </p>
                )}
              </Row>
              {!local && (
                <Row className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" className="h-10" onClick={syncNow} disabled={!online || sync.phase === 'syncing'}>
                    <RefreshCw className={cx('size-4', sync.phase === 'syncing' && 'animate-spin')} /> Synchronizovat nyní
                  </Button>
                  {conflicts.length > 0 && (
                    <Button variant="danger" size="sm" className="h-10" onClick={openConflicts}>
                      Vyřešit konflikty ({conflicts.length})
                    </Button>
                  )}
                </Row>
              )}
              {local && (
                <Row>
                  <p className="text-[13.5px] leading-relaxed text-muted">
                    Pro synchronizaci mezi iPhonem a iPadem propojte aplikaci se Supabase (viz README) a přihlaste se na obou zařízeních stejným účtem.
                  </p>
                </Row>
              )}
            </Card>
          </section>

          <section>
            <SectionTitle>Export a záloha</SectionTitle>
            <Card>
              <Row className="flex flex-col gap-2 sm:flex-row">
                <Button variant="secondary" className="w-full sm:flex-1" onClick={() => void exportPdf()} disabled={busy !== null}>
                  <FileText className="size-5" /> {busy === 'pdf' ? 'Připravuji…' : 'Rozpočet do PDF'}
                </Button>
                <Button variant="secondary" className="w-full sm:flex-1" onClick={() => void exportCsv()} disabled={busy !== null}>
                  <FileSpreadsheet className="size-5" /> Rozpočet do CSV
                </Button>
              </Row>
              <Row>
                <p className="text-[15px] font-medium text-ink">Záloha všech dat</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-muted">Rozpočet, nastavení, poznámky, odkazy i fotografie v jednom souboru JSON.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button variant="secondary" className="w-full sm:flex-1" onClick={() => void exportBackup()} disabled={busy !== null}>
                    <Download className="size-5" /> {busy === 'json' ? 'Připravuji…' : 'Stáhnout zálohu'}
                  </Button>
                  <Button variant="ghost" className="w-full border border-line sm:flex-1" onClick={() => restoreRef.current?.click()}>
                    <Upload className="size-5" /> Obnovit ze zálohy
                  </Button>
                </div>
                <input ref={restoreRef} type="file" accept="application/json,.json" className="hidden" data-testid="restore-input" onChange={(e) => void onRestore(e.target.files?.[0])} />
              </Row>
            </Card>
          </section>

          {!standalone && (
            <section>
              <SectionTitle>Instalace</SectionTitle>
              <Card className="p-5">
                <p className="text-[15px] font-medium text-ink">Přidejte si Paříž 27 na plochu</p>
                <ol className="mt-3 flex flex-col gap-2.5 text-[14px] text-muted">
                  <li className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-full bg-cream-2 text-[13px] font-semibold text-navy">1</span>
                    V Safari klepněte na <Share className="inline size-4 text-navy" /> Sdílet
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-full bg-cream-2 text-[13px] font-semibold text-navy">2</span>
                    Zvolte <SquarePlus className="inline size-4 text-navy" /> Přidat na plochu
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-full bg-cream-2 text-[13px] font-semibold text-navy">3</span>
                    Potvrďte tlačítkem Přidat
                  </li>
                </ol>
              </Card>
            </section>
          )}

          <section>
            <SectionTitle>{local ? 'Režim' : 'Účet'}</SectionTitle>
            <Card>
              <Row>
                <p className="text-[15px] font-medium text-ink">{local ? 'Bez účtu – jen v tomto zařízení' : email}</p>
                <p className="mt-1 text-[13px] text-muted">{local ? 'Data se nesynchronizují.' : 'Na iPhonu i iPadu se přihlaste tímto účtem.'}</p>
              </Row>
              <Row>
                <Button variant="danger-ghost" className="-ml-2" onClick={() => void onSignOut()}>
                  <LogOut className="size-5" /> {local ? 'Ukončit režim bez účtu' : 'Odhlásit se'}
                </Button>
              </Row>
            </Card>
            <p className="mt-4 text-center text-[12px] text-muted">Paříž 27 · verze {__APP_VERSION__}</p>
          </section>
        </div>
      </div>
    </>
  )
}
