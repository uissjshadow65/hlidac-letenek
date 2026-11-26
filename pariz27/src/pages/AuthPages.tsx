import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Eye, EyeOff, Loader2, MailCheck, Smartphone } from 'lucide-react'
import { EiffelLine, Wordmark } from '../components/brand'
import { Button, FieldLabel, Segmented, cx, inputClass } from '../components/ui'
import { supabase } from '../lib/supabase'
import { useAuth } from '../state/app'

function Shell({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-cream px-5"
      style={{ paddingTop: 'calc(var(--safe-top) + 32px)', paddingBottom: 'calc(var(--safe-bottom) + 32px)' }}
    >
      <EiffelLine className="pointer-events-none absolute -bottom-6 left-1/2 h-[78dvh] max-h-[760px] -translate-x-1/2 text-navy/[0.06]" strokeWidth={0.9} />
      <div className="relative w-full max-w-[400px] animate-rise">
        <div className="mb-8 text-center">
          <Wordmark className="text-[48px] leading-none text-navy" />
          <p className="mt-3 text-[15px] text-muted">Osobní centrum pro plánování cesty</p>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Překlad chybových hlášek Supabase do češtiny. */
function czechAuthError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Nesprávný e-mail nebo heslo.'
  if (m.includes('email not confirmed')) return 'E-mail zatím není potvrzený. Otevřete odkaz, který vám přišel e-mailem.'
  if (m.includes('already registered') || m.includes('already been registered')) return 'Tento e-mail už má účet. Přihlaste se.'
  if (m.includes('password should be') || m.includes('weak password')) return 'Heslo je příliš slabé. Použijte alespoň 8 znaků.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Příliš mnoho pokusů. Zkuste to prosím za chvíli.'
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return 'Registrace nových účtů je vypnutá.'
  if (m.includes('fetch') || m.includes('network')) return 'Bez připojení k internetu. Pro přihlášení je potřeba být online.'
  if (m.includes('invalid email') || m.includes('unable to validate email')) return 'Zadejte platnou e-mailovou adresu.'
  return 'Něco se nepovedlo. Zkuste to prosím znovu.'
}

function PasswordInput({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        className={cx(inputClass, 'h-13 pr-12')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        minLength={8}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Skrýt heslo' : 'Zobrazit heslo'}
        className="absolute right-1.5 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-cream-2"
      >
        {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  )
}

export function LoginPage() {
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const ids = { email: useId(), password: useId() }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setError(null)
    setNotice(null)
    if (password.length < 8) return setError('Heslo musí mít alespoň 8 znaků.')
    setBusy(true)
    try {
      if (tab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) setError(czechAuthError(error.message))
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) setError(czechAuthError(error.message))
        else if (!data.session) setNotice('Účet je vytvořený. Potvrďte prosím e-mail kliknutím na odkaz, který vám právě přišel, a pak se přihlaste.')
      }
    } catch (err) {
      setError(czechAuthError(String(err)))
    } finally {
      setBusy(false)
    }
  }

  const reset = async () => {
    if (!supabase) return
    setError(null)
    if (!email.trim()) return setError('Nejdříve vyplňte e-mail.')
    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
    setBusy(false)
    if (error) setError(czechAuthError(error.message))
    else setNotice('Poslali jsme vám e-mail s odkazem pro nastavení nového hesla.')
  }

  return (
    <Shell>
      <form onSubmit={submit} className="rounded-[30px] bg-paper p-6 shadow-card sm:p-7">
        <Segmented
          label="Přihlášení nebo registrace"
          value={tab}
          onChange={(v) => {
            setTab(v)
            setError(null)
            setNotice(null)
          }}
          className="mb-6 w-full"
          options={[
            { value: 'login', label: 'Přihlásit se' },
            { value: 'signup', label: 'Vytvořit účet' },
          ]}
        />
        <div className="flex flex-col gap-4">
          <div>
            <FieldLabel htmlFor={ids.email}>E-mail</FieldLabel>
            <input
              id={ids.email}
              type="email"
              inputMode="email"
              className={cx(inputClass, 'h-13')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoCapitalize="off"
              required
            />
          </div>
          <div>
            <FieldLabel htmlFor={ids.password} hint={tab === 'signup' ? 'alespoň 8 znaků' : undefined}>
              Heslo
            </FieldLabel>
            <PasswordInput id={ids.password} value={password} onChange={setPassword} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} />
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-4 rounded-2xl bg-red-soft px-4 py-3 text-[14px] leading-snug text-red">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-4 flex gap-2.5 rounded-2xl bg-green-soft px-4 py-3 text-[14px] leading-snug text-green">
            <MailCheck className="mt-0.5 size-4 shrink-0" />
            {notice}
          </p>
        )}
        <Button type="submit" size="lg" className="mt-6 w-full" disabled={busy}>
          {busy && <Loader2 className="size-5 animate-spin" />}
          {tab === 'login' ? 'Přihlásit se' : 'Vytvořit účet'}
        </Button>
        {tab === 'login' && (
          <button type="button" onClick={() => void reset()} className="mt-4 w-full text-center text-[14px] font-medium text-muted hover:text-navy">
            Zapomenuté heslo
          </button>
        )}
      </form>
      <p className="mt-6 px-4 text-center text-[13px] leading-relaxed text-muted">
        Na iPhonu i iPadu se přihlaste stejným účtem – data se budou automaticky synchronizovat.
      </p>
    </Shell>
  )
}

export function RecoveryPage() {
  const { finishRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const id = useId()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    if (password.length < 8) return setError('Heslo musí mít alespoň 8 znaků.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setError(czechAuthError(error.message))
    else finishRecovery()
  }

  return (
    <Shell>
      <form onSubmit={submit} className="rounded-[30px] bg-paper p-6 shadow-card sm:p-7">
        <h2 className="mb-5 font-serif text-[28px] font-semibold text-navy">Nové heslo</h2>
        <FieldLabel htmlFor={id} hint="alespoň 8 znaků">
          Heslo
        </FieldLabel>
        <PasswordInput id={id} value={password} onChange={setPassword} autoComplete="new-password" />
        {error && <p className="mt-4 rounded-2xl bg-red-soft px-4 py-3 text-[14px] text-red">{error}</p>}
        <Button type="submit" size="lg" className="mt-6 w-full" disabled={busy}>
          Uložit heslo
        </Button>
      </form>
    </Shell>
  )
}

export function SetupPage() {
  const { enterLocalMode } = useAuth()
  return (
    <Shell>
      <div className="rounded-[30px] bg-paper p-6 shadow-card sm:p-7">
        <h2 className="font-serif text-[28px] font-semibold leading-tight text-navy">Synchronizace není nastavená</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Aplikace zatím není propojená se Supabase, takže se data nemohou synchronizovat mezi iPhonem a iPadem. Postup najdete v souboru{' '}
          <strong className="text-ink">README.md</strong> (proměnné <code className="text-[13px]">VITE_SUPABASE_URL</code> a{' '}
          <code className="text-[13px]">VITE_SUPABASE_ANON_KEY</code>).
        </p>
        <Button size="lg" variant="secondary" className="mt-6 w-full" onClick={enterLocalMode}>
          <Smartphone className="size-5" /> Používat jen v tomto zařízení
        </Button>
        <p className="mt-3 text-center text-[12.5px] text-muted">Data se uloží pouze v tomto prohlížeči.</p>
      </div>
    </Shell>
  )
}
