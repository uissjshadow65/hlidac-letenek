import { CloudOff, RefreshCw, Check, AlertTriangle, Smartphone, GitMerge } from 'lucide-react'
import { useConflicts, useData, usePendingCount } from '../state/app'
import { cx } from './ui'
import { countLabel } from '../lib/czech'

export interface SyncInfo {
  tone: 'ok' | 'busy' | 'offline' | 'error' | 'local' | 'conflict'
  label: string
  detail: string
}

export function useSyncInfo(): SyncInfo {
  const { sync, local, online } = useData()
  const pending = usePendingCount()
  const conflicts = useConflicts().length
  if (local) return { tone: 'local', label: 'Jen v tomto zařízení', detail: 'Synchronizace není nastavená – data jsou uložená pouze v tomto zařízení.' }
  if (conflicts > 0)
    return {
      tone: 'conflict',
      label: 'Konflikt synchronizace',
      detail: `${countLabel(conflicts, ['záznam byl změněn', 'záznamy byly změněny', 'záznamů bylo změněno'])} na dvou zařízeních. Vyberte, kterou verzi ponechat.`,
    }
  if (!online || sync.phase === 'offline') {
    return pending > 0
      ? {
          tone: 'offline',
          label: 'Offline – změny čekají na synchronizaci',
          detail: `${countLabel(pending, ['změna čeká', 'změny čekají', 'změn čeká'])} na odeslání. Odešlou se automaticky po připojení k internetu.`,
        }
      : { tone: 'offline', label: 'Offline', detail: 'Vše je uložené v zařízení. Po připojení se načtou případné změny z druhého zařízení.' }
  }
  if (sync.phase === 'error') return { tone: 'error', label: 'Chyba synchronizace', detail: sync.error ?? 'Synchronizaci se nepodařilo dokončit.' }
  if (sync.phase === 'syncing' || pending > 0) return { tone: 'busy', label: 'Synchronizuji…', detail: 'Odesílám a načítám změny.' }
  return { tone: 'ok', label: 'Synchronizováno', detail: 'Všechny změny jsou uložené na serveru i v zařízení.' }
}

export function SyncBadge({ className, onClick }: { className?: string; onClick?: () => void }) {
  const info = useSyncInfo()
  const Icon =
    info.tone === 'ok'
      ? Check
      : info.tone === 'busy'
        ? RefreshCw
        : info.tone === 'offline'
          ? CloudOff
          : info.tone === 'local'
            ? Smartphone
            : info.tone === 'conflict'
              ? GitMerge
              : AlertTriangle
  return (
    <button
      type="button"
      onClick={onClick}
      title={info.detail}
      aria-label={`Stav synchronizace: ${info.label}`}
      data-sync-tone={info.tone}
      className={cx(
        'inline-flex h-7 max-w-full items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition-colors',
        info.tone === 'ok' && 'bg-green-soft/70 text-green',
        info.tone === 'busy' && 'bg-cream-2 text-navy-3',
        info.tone === 'offline' && 'bg-amber-soft text-amber',
        info.tone === 'local' && 'bg-cream-2 text-muted',
        (info.tone === 'error' || info.tone === 'conflict') && 'bg-red-soft text-red',
        className,
      )}
    >
      <Icon className={cx('size-3.5 shrink-0', info.tone === 'busy' && 'animate-spin [animation-duration:1.6s]')} strokeWidth={2.2} />
      <span className="truncate">{info.label}</span>
    </button>
  )
}
