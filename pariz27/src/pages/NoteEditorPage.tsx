import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ClipboardPaste, ImagePlus, Loader2, Pin, Plus, Trash2, X } from 'lucide-react'
import { LinkCard } from '../components/notes/LinkCard'
import { NoteThumb } from '../components/notes/NoteThumb'
import { Menu } from '../components/Menu'
import { Button, Chip, FieldLabel, IconButton, cx, inputClass, useConfirm } from '../components/ui'
import { PRESET_TAGS } from '../lib/categories'
import { uuid } from '../lib/ids'
import { prepareImage } from '../lib/images'
import { fetchLinkPreview, newLink, normalizeUrl } from '../lib/links'
import type { Attachment, NoteData } from '../lib/types'
import { useAttachments, useData, useNote, usePhotoUrl } from '../state/app'
import { useToast } from '../state/toast'

function useAutosize(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [ref, value])
}

function Lightbox({ photos, index, onClose, onDelete }: { photos: Attachment[]; index: number; onClose: () => void; onDelete: (a: Attachment) => void }) {
  const [i, setI] = useState(index)
  const current = photos[Math.min(i, photos.length - 1)]
  const url = usePhotoUrl(current?.id)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setI((x) => Math.min(photos.length - 1, x + 1))
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photos.length, onClose])
  if (!current) return null
  return (
    <div className="fixed inset-0 z-[90] flex animate-fade-in flex-col bg-[#0b1222]/96" role="dialog" aria-modal="true" aria-label="Fotografie">
      <div className="flex items-center justify-between px-3 text-white" style={{ paddingTop: 'calc(var(--safe-top) + 8px)' }}>
        <IconButton label="Zavřít" onClick={onClose} className="text-white hover:bg-white/10">
          <X className="size-6" />
        </IconButton>
        <span className="text-[14px] text-white/70">
          {Math.min(i, photos.length - 1) + 1} / {photos.length}
        </span>
        <IconButton label="Smazat fotografii" onClick={() => onDelete(current)} className="text-white hover:bg-white/10">
          <Trash2 className="size-5" />
        </IconButton>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-3">
        {url ? <img src={url} alt="" className="max-h-full max-w-full rounded-lg object-contain" /> : <Loader2 className="size-8 animate-spin text-white/60" />}
        {i > 0 && (
          <button aria-label="Předchozí" onClick={() => setI(i - 1)} className="absolute left-2 flex size-12 items-center justify-center rounded-full bg-white/10 text-white">
            <ChevronLeft className="size-6" />
          </button>
        )}
        {i < photos.length - 1 && (
          <button aria-label="Další" onClick={() => setI(i + 1)} className="absolute right-2 flex size-12 items-center justify-center rounded-full bg-white/10 text-white">
            <ChevronRight className="size-6" />
          </button>
        )}
      </div>
      <div style={{ height: 'calc(var(--safe-bottom) + 12px)' }} />
    </div>
  )
}

export function NoteEditorPage() {
  const { id: param } = useParams()
  const navigate = useNavigate()
  const { repo, db, getAccessToken } = useData()
  const toast = useToast()
  const confirm = useConfirm()

  const [noteId, setNoteId] = useState<string | null>(param && param !== 'nova' ? param : null)
  const note = useNote(noteId ?? undefined)
  const photos = useAttachments(noteId ?? '__none__') ?? []

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [linkInput, setLinkInput] = useState('')
  const [linkError, setLinkError] = useState<string | null>(null)
  const [customTag, setCustomTag] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [uploading, setUploading] = useState(0)
  const [lightbox, setLightbox] = useState<number | null>(null)

  const loaded = useRef(false)
  const lastSaved = useRef({ title: '', body: '' })
  const draft = useRef({ title: '', body: '' })
  draft.current = { title, body }
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const creating = useRef<Promise<string> | null>(null)
  const idRef = useRef<string | null>(noteId)
  idRef.current = noteId
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  useAutosize(titleRef, title)
  useAutosize(bodyRef, body)

  // načtení poznámky do editoru (a převzetí změn z druhého zařízení, pokud tu nic neupravujeme)
  useEffect(() => {
    if (!note) return
    const unchanged = draft.current.title === lastSaved.current.title && draft.current.body === lastSaved.current.body
    if (!loaded.current || unchanged) {
      setTitle(note.title)
      setBody(note.body)
      lastSaved.current = { title: note.title, body: note.body }
      loaded.current = true
    }
  }, [note])

  // poznámka byla smazána (např. na druhém zařízení) – jen pokud jsme ji už předtím měli načtenou
  const seenNote = useRef(false)
  useEffect(() => {
    if (note && note.id === noteId) seenNote.current = true
    else if (noteId && note === null && seenNote.current) navigate('/napady', { replace: true })
  }, [note, noteId, navigate])

  /** Vytvoří poznámku při první změně – prázdný editor nic neuloží. */
  const ensureNote = useCallback(
    async (initial: Partial<NoteData> = {}): Promise<string> => {
      if (idRef.current) return idRef.current
      if (!creating.current) {
        creating.current = repo.createNote({ title: draft.current.title, body: draft.current.body, ...initial }).then((id) => {
          lastSaved.current = { title: draft.current.title, body: draft.current.body }
          idRef.current = id
          setNoteId(id)
          loaded.current = true
          navigate(`/napady/${id}`, { replace: true })
          return id
        })
      }
      return creating.current
    },
    [repo, navigate],
  )

  const flushText = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const d = draft.current
    if (d.title === lastSaved.current.title && d.body === lastSaved.current.body) return
    if (!idRef.current && !d.title.trim() && !d.body.trim()) return
    setSaveState('saving')
    const id = await ensureNote()
    if (d.title !== lastSaved.current.title || d.body !== lastSaved.current.body) {
      await repo.updateNote(id, { title: d.title, body: d.body })
      lastSaved.current = { ...d }
    }
    setSaveState('saved')
  }, [ensureNote, repo])

  useEffect(() => {
    if (!loaded.current && !(title || body)) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void flushText(), 500)
  }, [title, body, flushText])

  // uložit při opuštění stránky
  useEffect(() => () => void flushText(), [flushText])
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flushText()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
    }
  }, [flushText])

  const done = async () => {
    await flushText()
    const id = idRef.current
    if (id) {
      const n = await db.notes.get(id)
      const photoCount = await db.note_attachments.where('note_id').equals(id).filter((a) => !a.deleted_at).count()
      if (n && !n.title.trim() && !n.body.trim() && !n.tags.length && !n.links.length && !photoCount) await repo.deleteNote(id)
    }
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/napady')
  }

  const patchNote = async (fn: (cur: NoteData) => Partial<NoteData>, initial?: Partial<NoteData>) => {
    if (!idRef.current) {
      await ensureNote(initial)
      return
    }
    const cur = await db.notes.get(idRef.current)
    if (cur) await repo.updateNote(cur.id, fn(cur))
  }

  const tags = note?.tags ?? []
  const links = note?.links ?? []
  const pinned = note?.pinned ?? false

  const toggleTag = (t: string) =>
    void patchNote((cur) => ({ tags: cur.tags.includes(t) ? cur.tags.filter((x) => x !== t) : [...cur.tags, t] }), { tags: [t] })

  const addCustomTag = () => {
    const t = customTag.trim().replace(/\s+/g, ' ').slice(0, 40)
    if (t && !tags.includes(t)) toggleTag(t)
    setCustomTag('')
    setAddingTag(false)
  }

  const addLink = async (raw: string) => {
    const url = normalizeUrl(raw)
    if (!url) {
      setLinkError('Tohle nevypadá jako webová adresa.')
      return
    }
    setLinkError(null)
    setLinkInput('')
    if (links.some((l) => l.url === url)) return
    const link = newLink(url, uuid())
    await patchNote((cur) => ({ links: [...cur.links, link] }), { links: [link] })
    // náhled (název a obrázek) – když se nepodaří, zůstane jen odkaz
    const preview = await fetchLinkPreview(url, await getAccessToken())
    if (preview && (preview.title || preview.image)) {
      const id = idRef.current
      const cur = id ? await db.notes.get(id) : null
      if (cur && id)
        await repo.updateNote(id, {
          links: cur.links.map((l) => (l.id === link.id ? { ...l, ...preview, fetched_at: new Date().toISOString() } : l)),
        })
    }
  }

  const pasteLink = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) await addLink(text)
    } catch {
      setLinkError('Schránku se nepodařilo přečíst – vložte odkaz do pole.')
    }
  }

  const onFiles = async (files: FileList | null) => {
    const list = [...(files ?? [])].filter((f) => f.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name))
    if (!list.length) return
    setUploading((n) => n + list.length)
    try {
      const id = await ensureNote()
      for (const f of list) {
        try {
          const img = await prepareImage(f)
          await repo.addPhoto(id, img.blob, { width: img.width, height: img.height })
        } finally {
          setUploading((n) => n - 1)
        }
      }
      toast.show(list.length === 1 ? 'Fotografie přidána' : `Přidáno ${list.length} fotografií`)
    } catch {
      toast.show('Fotografii se nepodařilo přidat.', { tone: 'warning' })
      setUploading(0)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const deletePhoto = async (a: Attachment) => {
    const ok = await confirm({ title: 'Smazat fotografii?', message: 'Fotografie bude odstraněna z poznámky na všech zařízeních.', confirmLabel: 'Smazat', danger: true })
    if (!ok) return
    await repo.removePhoto(a.id)
    setLightbox(null)
  }

  const deleteNote = async () => {
    const ok = await confirm({
      title: 'Smazat poznámku?',
      message: 'Poznámka včetně fotografií a odkazů bude odstraněna na všech zařízeních.',
      confirmLabel: 'Smazat',
      danger: true,
    })
    if (!ok) return
    if (timer.current) clearTimeout(timer.current)
    lastSaved.current = { ...draft.current }
    const id = idRef.current
    if (id) await repo.deleteNote(id)
    toast.show('Poznámka smazána')
    navigate('/napady', { replace: true })
  }

  if (noteId && note === undefined) return null

  const customTags = tags.filter((t) => !PRESET_TAGS.includes(t))

  return (
    <div className="min-h-dvh bg-cream">
      <header
        className="sticky top-0 z-30 border-b border-line/60 bg-cream/90 backdrop-blur-xl"
        style={{ paddingTop: 'var(--safe-top)', paddingLeft: 'var(--safe-left)', paddingRight: 'var(--safe-right)' }}
      >
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-2 sm:px-4">
          <button onClick={() => void done()} className="flex h-11 items-center gap-0.5 rounded-full pl-1 pr-3 text-[16px] font-medium text-navy hover:bg-cream-2">
            <ChevronLeft className="size-6" /> Nápady
          </button>
          <span className="flex-1 text-center text-[12.5px] text-muted" aria-live="polite">
            {uploading > 0 ? 'Zpracovávám fotky…' : saveState === 'saving' ? 'Ukládám…' : saveState === 'saved' ? 'Uloženo' : ''}
          </span>
          <IconButton
            label={pinned ? 'Odepnout' : 'Připnout'}
            aria-pressed={pinned}
            onClick={() => void patchNote((cur) => ({ pinned: !cur.pinned }), { pinned: true })}
            className={pinned ? 'text-red' : ''}
          >
            <Pin className={cx('size-5', pinned && 'fill-current')} />
          </IconButton>
          {noteId && <Menu label="Další akce s poznámkou" items={[{ label: 'Smazat poznámku', icon: <Trash2 className="size-[18px]" />, danger: true, onSelect: () => void deleteNote() }]} />}
          <Button size="sm" className="ml-1 h-10 px-4" onClick={() => void done()}>
            Hotovo
          </Button>
        </div>
      </header>

      <main
        className="mx-auto max-w-3xl px-5 pb-16 pt-6 sm:px-8"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 64px)', paddingLeft: 'max(20px, var(--safe-left))', paddingRight: 'max(20px, var(--safe-right))' }}
      >
        <textarea
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value.replace(/\n/g, ' '))}
          placeholder="Nadpis"
          aria-label="Nadpis"
          rows={1}
          maxLength={300}
          autoFocus={!noteId}
          enterKeyHint="next"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              bodyRef.current?.focus()
            }
          }}
          className="block w-full resize-none overflow-hidden bg-transparent font-serif text-[30px] font-semibold leading-[1.15] text-navy outline-none placeholder:text-navy/25 md:text-[36px]"
        />
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Zapište si nápad…"
          aria-label="Text poznámky"
          rows={4}
          maxLength={100000}
          className="mt-3 block min-h-28 w-full resize-none overflow-hidden bg-transparent text-[17px] leading-relaxed text-ink outline-none placeholder:text-muted/60"
        />

        <section className="mt-8" aria-label="Fotografie">
          <FieldLabel hint={photos.length ? `${photos.length}` : undefined}>Fotografie</FieldLabel>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p, i) => (
              <div key={p.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-cream-2">
                <button type="button" onClick={() => setLightbox(i)} className="block size-full" aria-label={`Zobrazit fotografii ${i + 1}`}>
                  <NoteThumb attachmentId={p.id} className="size-full" />
                </button>
                <button
                  type="button"
                  onClick={() => void deletePhoto(p)}
                  aria-label="Odebrat fotografii"
                  className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full bg-navy/60 text-white backdrop-blur transition-colors hover:bg-red"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            {Array.from({ length: uploading }).map((_, i) => (
              <div key={`u${i}`} className="flex aspect-square items-center justify-center rounded-2xl bg-cream-2">
                <Loader2 className="size-6 animate-spin text-muted" />
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-cream-3 text-navy transition-colors hover:border-navy/30 hover:bg-paper"
            >
              <ImagePlus className="size-6" strokeWidth={1.6} />
              <span className="text-[13px] font-medium">Přidat fotky</span>
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            data-testid="photo-input"
            onChange={(e) => void onFiles(e.target.files)}
          />
        </section>

        <section className="mt-8" aria-label="Odkazy">
          <FieldLabel>Odkazy</FieldLabel>
          {links.length > 0 && (
            <div className="mb-3 flex flex-col gap-2">
              {links.map((l) => (
                <LinkCard key={l.id} link={l} onRemove={() => void patchNote((cur) => ({ links: cur.links.filter((x) => x.id !== l.id) }))} />
              ))}
            </div>
          )}
          <form
            className="flex gap-2"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              void addLink(linkInput)
            }}
          >
            <input
              type="url"
              inputMode="url"
              value={linkInput}
              onChange={(e) => {
                setLinkInput(e.target.value)
                setLinkError(null)
              }}
              onPaste={(e) => {
                const text = e.clipboardData.getData('text')
                if (normalizeUrl(text)) {
                  e.preventDefault()
                  void addLink(text)
                }
              }}
              placeholder="Vložte odkaz – Instagram, TikTok, web, mapa…"
              aria-label="Nový odkaz"
              className={cx(inputClass, 'h-12 min-w-0 flex-1')}
              autoCapitalize="off"
              autoCorrect="off"
              enterKeyHint="done"
            />
            {linkInput.trim() ? (
              <Button type="submit" className="h-12 shrink-0 px-4">
                <Plus className="size-5" /> Přidat
              </Button>
            ) : (
              'clipboard' in navigator &&
              'readText' in navigator.clipboard && (
                <Button type="button" variant="secondary" className="h-12 shrink-0 px-4" onClick={() => void pasteLink()}>
                  <ClipboardPaste className="size-5" /> Vložit
                </Button>
              )
            )}
          </form>
          {linkError && <p className="mt-1.5 text-[13px] text-red">{linkError}</p>}
        </section>

        <section className="mt-8" aria-label="Štítky">
          <FieldLabel>Štítky</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {[...PRESET_TAGS, ...customTags].map((t) => (
              <Chip key={t} active={tags.includes(t)} onClick={() => toggleTag(t)}>
                {t}
              </Chip>
            ))}
            {addingTag ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  addCustomTag()
                }}
              >
                <input
                  autoFocus
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onBlur={addCustomTag}
                  placeholder="Nový štítek"
                  aria-label="Nový štítek"
                  maxLength={40}
                  className="h-9 w-36 rounded-full border border-navy/40 bg-paper px-3.5 text-[14px] outline-none"
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAddingTag(true)}
                className="inline-flex h-9 items-center gap-1 rounded-full border border-dashed border-cream-3 px-3.5 text-[13.5px] font-medium text-muted hover:border-navy/30 hover:text-navy"
              >
                <Plus className="size-4" /> Vlastní
              </button>
            )}
          </div>
        </section>
      </main>

      {lightbox != null && photos.length > 0 && <Lightbox photos={photos} index={lightbox} onClose={() => setLightbox(null)} onDelete={(a) => void deletePhoto(a)} />}
    </div>
  )
}
