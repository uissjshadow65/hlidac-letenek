import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Images, Lightbulb, Link2, Pin, Plus, Search, X } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import { NoteThumb } from '../components/notes/NoteThumb'
import { Button, Chip, EmptyState, Fab, SectionTitle, cx, inputClass } from '../components/ui'
import { PRESET_TAGS } from '../lib/categories'
import { countLabel, normalizeForSearch } from '../lib/czech'
import type { Attachment, Note } from '../lib/types'
import { useAttachments, useData, useNotes } from '../state/app'

function NoteCard({ note, photos, onTogglePin }: { note: Note; photos: Attachment[]; onTogglePin: (n: Note) => void }) {
  const cover = photos[0]
  return (
    <article data-testid="note-card" className="group relative animate-fade-in overflow-hidden rounded-[26px] bg-paper shadow-card transition-shadow hover:shadow-[0_6px_24px_rgb(20_33_61/0.08)]">
      <Link to={`/napady/${note.id}`} className="block" aria-label={`Otevřít ${note.title || 'poznámku'}`}>
        {cover && (
          <div className="relative">
            <NoteThumb attachmentId={cover.id} className="aspect-[16/10] w-full" />
            {photos.length > 1 && (
              <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-navy/70 px-2 py-0.5 text-[12px] font-medium text-white backdrop-blur">
                <Images className="size-3.5" /> {photos.length}
              </span>
            )}
          </div>
        )}
        <div className="p-4 pr-12">
          <h3 className={cx('font-serif text-[19px] font-semibold leading-snug text-navy', !note.title && 'text-muted')}>{note.title || 'Bez nadpisu'}</h3>
          {note.body && <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-[14px] leading-relaxed text-muted">{note.body}</p>}
          {(note.tags.length > 0 || note.links.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {note.tags.map((t) => (
                <span key={t} className="rounded-full bg-cream-2 px-2.5 py-0.5 text-[12px] font-medium text-navy-3">
                  {t}
                </span>
              ))}
              {note.links.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-muted">
                  <Link2 className="size-3.5" /> {countLabel(note.links.length, ['odkaz', 'odkazy', 'odkazů'])}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
      <button
        type="button"
        onClick={() => onTogglePin(note)}
        aria-pressed={note.pinned}
        aria-label={note.pinned ? 'Odepnout poznámku' : 'Připnout poznámku'}
        className={cx(
          'absolute flex size-10 items-center justify-center rounded-full transition-colors',
          cover ? 'right-2.5 top-2.5 bg-paper/90 backdrop-blur' : 'right-2 top-2',
          note.pinned ? 'text-red' : 'text-muted/60 hover:text-navy',
        )}
      >
        <Pin className={cx('size-[18px]', note.pinned && 'fill-current')} />
      </button>
    </article>
  )
}

export function NotesPage() {
  const notes = useNotes()
  const atts = useAttachments()
  const { repo } = useData()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)

  const photosByNote = useMemo(() => {
    const m = new Map<string, Attachment[]>()
    for (const a of atts ?? []) m.set(a.note_id, [...(m.get(a.note_id) ?? []), a])
    return m
  }, [atts])

  const allTags = useMemo(() => {
    const used = new Set<string>()
    for (const n of notes ?? []) n.tags.forEach((t) => used.add(t))
    return [...PRESET_TAGS.filter((t) => used.has(t)), ...[...used].filter((t) => !PRESET_TAGS.includes(t)).sort((a, b) => a.localeCompare(b, 'cs'))]
  }, [notes])

  if (!notes) return null

  const q = normalizeForSearch(query.trim())
  const visible = notes.filter(
    (n) =>
      (!tag || n.tags.includes(tag)) &&
      (!q ||
        normalizeForSearch(n.title).includes(q) ||
        normalizeForSearch(n.body).includes(q) ||
        n.tags.some((t) => normalizeForSearch(t).includes(q)) ||
        n.links.some((l) => normalizeForSearch(`${l.title ?? ''} ${l.url}`).includes(q))),
  )
  const pinned = visible.filter((n) => n.pinned)
  const rest = visible.filter((n) => !n.pinned)
  const togglePin = (n: Note) => void repo.updateNote(n.id, { pinned: !n.pinned })

  const grid = (list: Note[]) => (
    <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
      {list.map((n) => (
        <NoteCard key={n.id} note={n} photos={photosByNote.get(n.id) ?? []} onTogglePin={togglePin} />
      ))}
    </div>
  )

  return (
    <>
      <PageHeader
        eyebrow="Inspirace"
        title="Nápady a poznámky"
        subtitle={notes.length ? countLabel(notes.length, ['uložený nápad', 'uložené nápady', 'uložených nápadů']) : 'Místo pro vše, co vás napadne'}
        actions={
          <div className="hidden md:block">
            <Button onClick={() => navigate('/napady/nova')}>
              <Plus className="size-5" /> Nový nápad
            </Button>
          </div>
        }
      />

      {notes.length === 0 ? (
        <div className="rounded-[28px] bg-paper shadow-card">
          <EmptyState
            icon={<Lightbulb className="size-9" strokeWidth={1.5} />}
            title="Zapište první nápad"
            text="Restaurace s výhledem, tip z Instagramu, fotka z inspirace nebo odkaz na mapu. Uložení zabere pár vteřin."
            action={
              <Button size="lg" onClick={() => navigate('/napady/nova')}>
                <Plus className="size-5" /> Nový nápad
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Hledat v nápadech…"
                aria-label="Hledat v nápadech"
                className={cx(inputClass, 'h-12 rounded-full pl-12 pr-11')}
                enterKeyHint="search"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Vymazat hledání"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-cream-2"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            {allTags.length > 0 && (
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0" role="group" aria-label="Filtr štítků">
                <Chip active={!tag} onClick={() => setTag(null)}>
                  Vše
                </Chip>
                {allTags.map((t) => (
                  <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                    {t}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          {visible.length === 0 && <p className="rounded-[28px] bg-paper px-6 py-10 text-center text-[15px] text-muted shadow-card">Nic jsme nenašli. Zkuste jiné slovo nebo štítek.</p>}

          {pinned.length > 0 && (
            <section className="mb-4">
              <SectionTitle>
                <span className="inline-flex items-center gap-1.5">
                  <Pin className="size-3.5" /> Připnuté
                </span>
              </SectionTitle>
              {grid(pinned)}
            </section>
          )}
          {rest.length > 0 && (
            <section>
              {pinned.length > 0 && <SectionTitle>Ostatní</SectionTitle>}
              {grid(rest)}
            </section>
          )}
        </>
      )}

      <Fab label="Nový nápad" onClick={() => navigate('/napady/nova')} icon={<Plus className="size-7" strokeWidth={2.2} />} />
    </>
  )
}
