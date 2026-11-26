import { ImageOff } from 'lucide-react'
import { usePhotoUrl } from '../../state/app'
import { cx } from '../ui'

/** Fotografie z lokální databáze; dokud se nestáhne z druhého zařízení, ukáže zástupný obrázek. */
export function NoteThumb({ attachmentId, className, alt = '' }: { attachmentId: string; className?: string; alt?: string }) {
  const url = usePhotoUrl(attachmentId)
  if (url === undefined) return <div className={cx('bg-cream-2', className)} />
  if (url === null)
    return (
      <div className={cx('flex items-center justify-center bg-cream-2 text-muted', className)} title="Fotografie se načte po synchronizaci">
        <ImageOff className="size-6" strokeWidth={1.5} />
      </div>
    )
  return <img src={url} alt={alt} className={cx('object-cover', className)} draggable={false} />
}
