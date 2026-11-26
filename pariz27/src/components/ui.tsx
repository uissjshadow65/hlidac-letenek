import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

// ------------------------------------------------------------------ tlačítka

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost'

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 rounded-2xl font-semibold transition-[transform,background-color,box-shadow,opacity] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
        size === 'sm' && 'h-9 px-3.5 text-sm',
        size === 'md' && 'h-12 px-5 text-[15px]',
        size === 'lg' && 'h-14 px-6 text-base',
        variant === 'primary' && 'bg-navy text-white shadow-sm hover:bg-navy-2',
        variant === 'secondary' && 'bg-cream-2 text-navy hover:bg-cream-3',
        variant === 'ghost' && 'text-navy hover:bg-cream-2',
        variant === 'danger' && 'bg-red text-white hover:brightness-95',
        variant === 'danger-ghost' && 'text-red hover:bg-red-soft',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-navy transition-colors hover:bg-cream-2 active:bg-cream-3 disabled:opacity-40',
        className,
      )}
    >
      {children}
    </button>
  )
}

// ------------------------------------------------------------------ formulářové prvky

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}) {
  const id = useId()
  return (
    <label htmlFor={id} className={cx('flex min-h-12 cursor-pointer items-center gap-4', disabled && 'cursor-not-allowed opacity-50')}>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-snug text-muted">{description}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="h-[31px] w-[51px] rounded-full bg-cream-3 transition-colors duration-200 peer-checked:bg-navy peer-focus-visible:ring-2 peer-focus-visible:ring-navy/40 peer-focus-visible:ring-offset-2" />
        <span className="absolute left-[2px] top-[2px] size-[27px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.2)] transition-transform duration-200 ease-out peer-checked:translate-x-5" />
      </span>
    </label>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  className?: string
  size?: 'sm' | 'md'
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('inline-flex rounded-2xl bg-cream-2 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 rounded-xl px-3 font-semibold transition-all duration-200',
            size === 'md' ? 'h-10 text-[15px]' : 'h-8 text-[13px]',
            value === o.value ? 'bg-white text-navy shadow-[0_1px_3px_rgb(20_33_61/0.14)]' : 'text-muted hover:text-navy',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({
  active,
  onClick,
  children,
  className,
  color,
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  className?: string
  color?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13.5px] font-medium transition-colors duration-150',
        active ? 'border-navy bg-navy text-white' : 'border-line bg-paper text-ink hover:border-navy/30',
        className,
      )}
    >
      {color && <span className="size-2 rounded-full" style={{ background: active ? '#fff' : color }} />}
      {children}
    </button>
  )
}

export function FieldLabel({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
        {children}
      </label>
      {hint && <span className="text-[12px] text-muted">{hint}</span>}
    </div>
  )
}

export const inputClass =
  'block w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[16px] text-ink placeholder:text-muted/70 outline-none transition-[border-color,box-shadow] focus:border-navy/50 focus:ring-4 focus:ring-navy/8'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-3xl bg-paper shadow-card', className)}>{children}</div>
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 px-1">
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">{children}</h2>
      {action}
    </div>
  )
}

// ------------------------------------------------------------------ plovoucí tlačítko

export function Fab({ label, onClick, icon }: { label: string; onClick: () => void; icon: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="fixed z-40 flex size-[60px] items-center md:hidden justify-center rounded-full bg-navy text-white shadow-float transition-transform duration-150 hover:bg-navy-2 active:scale-95"
      style={{
        right: 'calc(20px + var(--safe-right))',
        bottom: 'calc(var(--nav-h) + var(--safe-bottom) + 18px)',
      }}
    >
      {icon}
    </button>
  )
}

// ------------------------------------------------------------------ prázdný stav

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex animate-rise flex-col items-center px-6 py-14 text-center">
      <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-cream-2 text-navy">{icon}</div>
      <h3 className="font-serif text-[23px] font-semibold leading-tight text-navy">{title}</h3>
      <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

// ------------------------------------------------------------------ bottom sheet / modální okno

function useBodyLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [active])
}

/** Na mobilu vysouvací panel zespodu, na iPadu a počítači okno uprostřed. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  useBodyLock(mounted)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
      return () => cancelAnimationFrame(r)
    }
    setVisible(false)
    const t = setTimeout(() => setMounted(false), 260)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted) return null
  return createPortal(
    <div className="fixed inset-0 z-[60]" role="presentation">
      <div
        className={cx('absolute inset-0 bg-navy/35 backdrop-blur-[2px] transition-opacity duration-250', visible ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          'absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[28px] bg-cream shadow-sheet transition-[translate,opacity,scale] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          'max-h-[calc(100dvh-var(--safe-top)-10px)]',
          'md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[min(88dvh,860px)] md:-translate-x-1/2 md:rounded-[28px]',
          wide ? 'md:w-[min(720px,92vw)]' : 'md:w-[min(560px,92vw)]',
          visible
            ? 'translate-y-0 md:-translate-y-1/2 md:scale-100 md:opacity-100'
            : 'translate-y-full md:-translate-y-[46%] md:scale-[0.97] md:opacity-0',
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-cream-3 md:hidden" />
        <div className="flex shrink-0 items-center gap-3 px-5 pb-2 pt-2 md:px-7 md:pt-5">
          <h2 id={titleId} className="min-w-0 flex-1 truncate font-serif text-[23px] font-semibold text-navy">
            {title}
          </h2>
          <IconButton label="Zavřít" onClick={onClose} className="-mr-2 bg-cream-2">
            <X className="size-5" />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 md:px-7">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-line/70 bg-cream px-5 pt-3 md:px-7 md:pb-5" style={{ paddingBottom: 'calc(12px + var(--safe-bottom))' }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// ------------------------------------------------------------------ potvrzení

interface ConfirmOptions {
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

const ConfirmCtx = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false)

export function useConfirm() {
  return useContext(ConfirmCtx)
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)
  const [visible, setVisible] = useState(false)
  useBodyLock(!!state)

  const confirm = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setState({ ...o, resolve })
        requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
      }),
    [],
  )

  const close = (v: boolean) => {
    state?.resolve(v)
    setVisible(false)
    setTimeout(() => setState(null), 200)
  }

  useEffect(() => {
    if (!state) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center" role="presentation">
            <div
              className={cx('absolute inset-0 bg-navy/40 backdrop-blur-[2px] transition-opacity duration-200', visible ? 'opacity-100' : 'opacity-0')}
              onClick={() => close(false)}
            />
            <div
              role="alertdialog"
              aria-modal="true"
              aria-label={state.title}
              className={cx(
                'relative w-full max-w-sm rounded-[28px] bg-paper p-6 shadow-float transition-all duration-200',
                visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.98] opacity-0',
              )}
              style={{ marginBottom: 'var(--safe-bottom)' }}
            >
              <h2 className="font-serif text-[24px] font-semibold leading-tight text-navy">{state.title}</h2>
              {state.message && <div className="mt-2 text-[15px] leading-relaxed text-muted">{state.message}</div>}
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={() => close(false)} className="sm:min-w-28">
                  {state.cancelLabel ?? 'Zrušit'}
                </Button>
                <Button variant={state.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus className="sm:min-w-28">
                  {state.confirmLabel ?? 'Potvrdit'}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </ConfirmCtx.Provider>
  )
}
