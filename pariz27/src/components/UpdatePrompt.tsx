import { useRegisterSW } from 'virtual:pwa-register/react'
import { Sparkles } from 'lucide-react'

/** Upozornění na novou verzi aplikace (po nasazení aktualizace). */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // kontrola aktualizací každou hodinu, když je aplikace otevřená
      if (reg) setInterval(() => void reg.update().catch(() => {}), 60 * 60 * 1000)
    },
  })
  if (!needRefresh) return null
  return (
    <div
      className="fixed inset-x-0 z-[65] flex justify-center px-4"
      style={{ bottom: 'calc(var(--nav-h) + var(--safe-bottom) + 90px)' }}
      role="status"
    >
      <div className="flex w-full max-w-md animate-rise items-center gap-3 rounded-2xl bg-navy p-3 pl-4 text-white shadow-float">
        <Sparkles className="size-5 shrink-0 text-cream-3" />
        <p className="flex-1 text-[14px] leading-snug">Je k dispozici nová verze aplikace.</p>
        <button className="rounded-xl px-3 py-2 text-[14px] text-cream-3" onClick={() => setNeedRefresh(false)}>
          Později
        </button>
        <button className="rounded-xl bg-white px-3.5 py-2 text-[14px] font-semibold text-navy" onClick={() => void updateServiceWorker(true)}>
          Aktualizovat
        </button>
      </div>
    </div>
  )
}
