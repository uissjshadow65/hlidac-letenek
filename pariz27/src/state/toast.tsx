import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react'

type Tone = 'success' | 'info' | 'warning'

interface Toast {
  id: number
  text: string
  tone: Tone
  action?: { label: string; run: () => void }
}

interface ToastApi {
  show: (text: string, opts?: { tone?: Tone; action?: Toast['action']; durationMs?: number }) => void
}

const Ctx = createContext<ToastApi>({ show: () => {} })

export function useToast() {
  return useContext(Ctx)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const show = useCallback<ToastApi['show']>(
    (text, opts = {}) => {
      const id = ++seq.current
      setToasts((t) => [...t.slice(-2), { id, text, tone: opts.tone ?? 'success', action: opts.action }])
      setTimeout(() => dismiss(id), opts.durationMs ?? 3200)
    },
    [dismiss],
  )

  const api = useMemo(() => ({ show }), [show])

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4"
        style={{ bottom: 'calc(var(--nav-h) + var(--safe-bottom) + 84px)' }}
        aria-live="polite"
      >
        {toasts.map((t) => {
          const Icon = t.tone === 'success' ? CheckCircle2 : t.tone === 'warning' ? AlertTriangle : Info
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex max-w-md animate-rise items-center gap-3 rounded-2xl bg-navy px-4 py-3 text-sm text-white shadow-float"
            >
              <Icon className={`size-[18px] shrink-0 ${t.tone === 'warning' ? 'text-amber-300' : 'text-cream-3'}`} />
              <span className="leading-snug">{t.text}</span>
              {t.action && (
                <button
                  className="ml-1 shrink-0 rounded-lg px-2 py-1 font-semibold text-cream underline-offset-2 hover:underline"
                  onClick={() => {
                    t.action!.run()
                    dismiss(t.id)
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}
