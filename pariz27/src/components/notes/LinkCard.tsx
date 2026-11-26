import { ExternalLink, Camera, MapPin, Music2, Globe, CirclePlay, X } from 'lucide-react'
import { useState } from 'react'
import { displayHost, linkKind, LINK_KIND_LABEL, type LinkKind } from '../../lib/links'
import type { NoteLink } from '../../lib/types'
import { cx } from '../ui'

const KIND_ICON: Record<LinkKind, typeof Globe> = {
  instagram: Camera,
  tiktok: Music2,
  maps: MapPin,
  youtube: CirclePlay,
  web: Globe,
}

const KIND_COLOR: Record<LinkKind, string> = {
  instagram: '#C13584',
  tiktok: '#111111',
  maps: '#2F7D4F',
  youtube: '#D93025',
  web: '#2F4A73',
}

/** Klikací odkaz s náhledem; otevře se mimo aplikaci v prohlížeči. */
export function LinkCard({ link, onRemove, compact }: { link: NoteLink; onRemove?: () => void; compact?: boolean }) {
  const kind = linkKind(link.url)
  const Icon = KIND_ICON[kind]
  const [imgOk, setImgOk] = useState(true)
  const host = displayHost(link.url)
  return (
    <div className="relative flex items-stretch overflow-hidden rounded-2xl border border-line/80 bg-paper">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer external"
        className="flex min-w-0 flex-1 items-center gap-3 p-2.5 pr-3 transition-colors hover:bg-cream/60"
      >
        {link.image && imgOk && !compact ? (
          <img
            src={link.image}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgOk(false)}
            className="size-16 shrink-0 rounded-xl bg-cream-2 object-cover"
          />
        ) : (
          <span className={cx('flex shrink-0 items-center justify-center rounded-xl', compact ? 'size-10' : 'size-16')} style={{ background: `${KIND_COLOR[kind]}12`, color: KIND_COLOR[kind] }}>
            <Icon className={compact ? 'size-5' : 'size-6'} strokeWidth={1.7} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-semibold text-ink">{link.title || host}</span>
          <span className="mt-0.5 flex items-center gap-1.5 truncate text-[12.5px] text-muted">
            <span className="font-medium" style={{ color: KIND_COLOR[kind] }}>
              {link.site && kind === 'web' ? link.site : LINK_KIND_LABEL[kind]}
            </span>
            <span>·</span>
            <span className="truncate">{host}</span>
          </span>
        </span>
        <ExternalLink className="size-4 shrink-0 text-muted" />
      </a>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Odebrat odkaz"
          className="flex w-11 shrink-0 items-center justify-center border-l border-line/80 text-muted transition-colors hover:bg-red-soft hover:text-red"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
