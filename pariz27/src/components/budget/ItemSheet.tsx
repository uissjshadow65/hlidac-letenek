import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button, Chip, FieldLabel, Segmented, Sheet, Toggle, cx, inputClass, useConfirm } from '../ui'
import { CategoryIcon } from '../brand'
import { CATEGORIES, ITEM_SUGGESTIONS } from '../../lib/categories'
import { formatAmountInput, formatMinor, parseAmount } from '../../lib/money'
import { perPersonCzkMinor, perPersonOriginalMinor } from '../../lib/budget'
import { personsAccusative } from '../../lib/czech'
import type { BudgetItem, BudgetItemData, CategoryId, Currency } from '../../lib/types'
import { useData, useSettings } from '../../state/app'
import { useToast } from '../../state/toast'

interface Props {
  open: boolean
  onClose: () => void
  item?: BudgetItem | null
  defaultCategory?: CategoryId
}

export function ItemSheet({ open, onClose, item, defaultCategory }: Props) {
  const { repo } = useData()
  const settings = useSettings()
  const toast = useToast()
  const confirm = useConfirm()
  const ids = { name: useId(), amount: useId(), note: useId() }
  const nameRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [amountText, setAmountText] = useState('')
  const [currency, setCurrency] = useState<Currency>('CZK')
  const [split, setSplit] = useState(false)
  const [note, setNote] = useState('')
  const [category, setCategory] = useState<CategoryId>('other')
  const [categoryTouched, setCategoryTouched] = useState(false)
  const [paid, setPaid] = useState(false)
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(item?.name ?? '')
    setAmountText(item ? formatAmountInput(item.amount_minor) : '')
    setCurrency(item?.currency ?? 'CZK')
    setSplit(item?.split ?? false)
    setNote(item?.note ?? '')
    setCategory(item?.category ?? defaultCategory ?? 'other')
    setCategoryTouched(!!item || !!defaultCategory)
    setPaid(item?.paid ?? false)
    setTried(false)
    setSaving(false)
  }, [open, item, defaultCategory])

  const travelers = settings?.travelers ?? 2
  const amount = parseAmount(amountText)
  const nameOk = name.trim().length > 0
  const amountOk = amount != null

  const preview = useMemo(() => {
    if (amount == null || !settings) return null
    const draft = { amount_minor: amount, currency, split, paid, category }
    return { czk: perPersonCzkMinor(draft, settings), original: perPersonOriginalMinor(draft, travelers) }
  }, [amount, currency, split, paid, category, settings, travelers])

  const pickSuggestion = (s: (typeof ITEM_SUGGESTIONS)[number]) => {
    setName(s.name)
    if (!categoryTouched) setCategory(s.category)
  }

  const save = async () => {
    setTried(true)
    if (!nameOk || amount == null) return
    setSaving(true)
    const data: BudgetItemData = { name: name.trim(), amount_minor: amount, currency, split, note: note.trim(), category, paid }
    try {
      if (item) {
        await repo.updateItem(item.id, data)
        toast.show('Změny uloženy')
      } else {
        await repo.createItem(data)
        toast.show('Položka přidána do rozpočtu')
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!item) return
    const ok = await confirm({
      title: 'Smazat položku?',
      message: <>Položka „{item.name}“ bude odstraněna z rozpočtu na všech zařízeních.</>,
      confirmLabel: 'Smazat',
      danger: true,
    })
    if (!ok) return
    await repo.deleteItem(item.id)
    toast.show('Položka smazána')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={item ? 'Upravit položku' : 'Nová položka'}
      footer={
        <div className="flex gap-2">
          {item && (
            <Button variant="danger-ghost" onClick={remove} aria-label="Smazat položku" className="px-4">
              <Trash2 className="size-5" />
            </Button>
          )}
          <Button className="flex-1" size="lg" onClick={save} disabled={saving}>
            {item ? 'Uložit změny' : 'Přidat do rozpočtu'}
          </Button>
        </div>
      }
    >
      <form
        className="flex flex-col gap-6 pt-2"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <div>
          <FieldLabel htmlFor={ids.name}>Název položky</FieldLabel>
          <input
            ref={nameRef}
            id={ids.name}
            className={cx(inputClass, tried && !nameOk && 'border-red ring-4 ring-red/10')}
            placeholder="např. Ubytování"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            autoComplete="off"
            enterKeyHint="next"
            autoFocus={!item}
          />
          {tried && !nameOk && <p className="mt-1.5 text-[13px] text-red">Zadejte název položky.</p>}
          {!item && (
            <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 md:-mx-7 md:px-7">
              {ITEM_SUGGESTIONS.map((s) => (
                <Chip key={s.name} active={name === s.name} onClick={() => pickSuggestion(s)}>
                  {s.name}
                </Chip>
              ))}
            </div>
          )}
        </div>

        <div>
          <FieldLabel htmlFor={ids.amount}>Cena</FieldLabel>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <input
                id={ids.amount}
                className={cx(inputClass, 'tabular pr-12 text-[20px] font-semibold', tried && !amountOk && 'border-red ring-4 ring-red/10')}
                inputMode="decimal"
                placeholder="0"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                onBlur={() => amount != null && setAmountText(formatAmountInput(amount))}
                autoComplete="off"
                enterKeyHint="done"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[17px] font-semibold text-muted">
                {currency === 'CZK' ? 'Kč' : '€'}
              </span>
            </div>
            <Segmented
              label="Měna"
              value={currency}
              onChange={setCurrency}
              className="h-[54px] w-[132px] shrink-0 [&>button]:h-full"
              options={[
                { value: 'CZK', label: 'CZK' },
                { value: 'EUR', label: 'EUR' },
              ]}
            />
          </div>
          {tried && !amountOk && <p className="mt-1.5 text-[13px] text-red">Zadejte platnou částku, např. 12 000 nebo 45,50.</p>}

          <div className="mt-4 rounded-2xl bg-paper px-4 py-2 shadow-card">
            <Toggle
              checked={split}
              onChange={setSplit}
              disabled={travelers < 2}
              label={`Cena je za ${personsAccusative(travelers)}`}
              description={
                travelers < 2
                  ? 'V nastavení je jen 1 cestující.'
                  : `Do mého rozpočtu se započítá ${travelers === 2 ? 'polovina' : `1/${travelers}`} zadané ceny.`
              }
            />
          </div>

          <div className="mt-3 flex items-center justify-between rounded-2xl bg-navy px-4 py-3.5 text-white" aria-live="polite">
            <span className="text-[13px] text-cream-3">Do mého rozpočtu</span>
            <span className="tabular text-right">
              <span className="block font-serif text-[24px] font-semibold leading-none">
                {preview == null ? '—' : preview.czk == null ? formatMinor(preview.original, 'EUR') : formatMinor(preview.czk)}
              </span>
              {preview && currency === 'EUR' && (
                <span className="mt-1 block text-[12px] text-cream-3">
                  {preview.czk == null ? 'kurz EUR/CZK není nastaven' : `${formatMinor(preview.original, 'EUR')} na osobu`}
                </span>
              )}
            </span>
          </div>
        </div>

        <div>
          <FieldLabel>Kategorie</FieldLabel>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Kategorie">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={category === c.id}
                onClick={() => {
                  setCategory(c.id)
                  setCategoryTouched(true)
                }}
                className={cx(
                  'flex min-h-14 items-center gap-2.5 rounded-2xl border px-3 text-left text-[14px] font-medium leading-tight transition-all',
                  category === c.id ? 'border-navy bg-navy text-white shadow-sm' : 'border-line bg-paper text-ink hover:border-navy/30',
                )}
              >
                <CategoryIcon id={c.id} className="size-5 shrink-0" style={{ color: category === c.id ? '#fff' : c.color }} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-paper px-4 py-2 shadow-card">
          <Toggle checked={paid} onChange={setPaid} label="Zaplaceno" description="Zaplacení nemění celkovou cenu cesty." />
        </div>

        <div>
          <FieldLabel htmlFor={ids.note} hint="nepovinné">
            Poznámka
          </FieldLabel>
          <textarea
            id={ids.note}
            className={cx(inputClass, 'min-h-24 resize-none leading-relaxed')}
            placeholder="např. Apartmán v centru Paříže"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={5000}
            rows={3}
          />
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  )
}
