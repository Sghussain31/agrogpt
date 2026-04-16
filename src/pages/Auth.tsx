import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, MapPin } from 'lucide-react'
import { GlassCard } from '../components/GlassCard'
import { cn } from '../lib/cn'
import { readYieldUser, writeYieldUser } from '../lib/authSession'
import { handleGoogleSignIn } from '../lib/googleAuthMock'
import { db, upsertOfflineMetadata } from '../lib/db'

type AuthMode = 'login' | 'register'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.7 3.9 14.6 3 12 3 6.9 3 2.7 7.2 2.7 12.3S6.9 21.5 12 21.5c6.2 0 8.6-4.4 8.6-8.3 0-.6-.1-1-.2-1.4H12z"
      />
      <path
        fill="#34A853"
        d="M3.5 7.1l3.1 2.3C7.5 7.3 9.5 5.7 12 5.7c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.7 3.9 14.6 3 12 3 8.3 3 5.2 5 3.5 7.1z"
      />
      <path
        fill="#4A90E2"
        d="M12 21.5c2.5 0 4.6-.8 6.1-2.2l-2.8-2.2c-.8.5-1.8.9-3.3.9-2.5 0-4.6-1.7-5.4-4l-3 2.3C5.2 19.5 8.3 21.5 12 21.5z"
      />
      <path
        fill="#FBBC05"
        d="M6.6 13.9c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9l-3-2.3C2.9 9.6 2.5 10.8 2.5 12s.4 2.4 1.1 3.4l3-2.5z"
      />
    </svg>
  )
}

import { detectCityFromGeolocation } from '../lib/geolocation'

export function Auth() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('login')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [loginGoogleEmail, setLoginGoogleEmail] = useState<string | null>(null)
  const [loginGoogleName, setLoginGoogleName] = useState('')
  const [busy, setBusy] = useState(false)
  const [locBusy, setLocBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (readYieldUser()) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  const resetGoogleLoginState = useCallback(() => {
    setLoginGoogleEmail(null)
    setLoginGoogleName('')
  }, [])

  useEffect(() => {
    resetGoogleLoginState()
    setError(null)
  }, [mode, resetGoogleLoginState])

  const onGoogleLogin = async () => {
    setError(null)
    setBusy(true)
    try {
      const mock = await handleGoogleSignIn()
      if (mode === 'login') {
        setLoginGoogleEmail(mock.email)
        setLoginGoogleName(mock.name)
      } else {
        setEmail(mock.email)
        if (!name.trim()) setName(mock.name)
      }
    } finally {
      setBusy(false)
    }
  }

  const fillCity = async () => {
    setLocBusy(true)
    setError(null)
    try {
      const c = await detectCityFromGeolocation()
      setCity(c)
    } catch {
      setCity('Hyderabad')
    } finally {
      setLocBusy(false)
    }
  }

  const finishSession = async (session: {
    name: string
    phone: string
    email?: string
  }) => {
    writeYieldUser(session)
    navigate('/dashboard', { replace: true })
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const p = phone.trim()
    if (!p) {
      setError('Phone number is required.')
      return
    }
    setBusy(true)
    try {
      const existing = await db.offlineMetadata.get(1)
      const sessionName =
        loginGoogleName.trim() || existing?.name || ''
      const sessionEmail =
        loginGoogleEmail ?? existing?.email
      await upsertOfflineMetadata({
        name: sessionName,
        phone: p,
        email: sessionEmail,
        city: existing?.city,
      })
      await finishSession({
        name: sessionName || 'Farmer',
        phone: p,
        email: sessionEmail,
      })
    } finally {
      setBusy(false)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const n = name.trim()
    const p = phone.trim()
    if (!n) {
      setError('Name is required.')
      return
    }
    if (!p) {
      setError('Phone number is required.')
      return
    }
    const em = email.trim()
    setBusy(true)
    try {
      await upsertOfflineMetadata({
        name: n,
        phone: p,
        email: em || undefined,
        city: city.trim() || undefined,
        replaceOptional: true,
      })
      await finishSession({
        name: n,
        phone: p,
        email: em || undefined,
      })
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30'

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <GlassCard variant="strong" className="p-8 shadow-glass">
          <div className="mb-8 text-center">
            <h1 className="agro-h1 text-2xl sm:text-3xl">AgroGPT</h1>
            <p className="subtle mt-2">Sign in to continue to your farm workspace</p>
          </div>

          {/* Glass mode toggle */}
          <div
            className="relative mb-8 flex rounded-2xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-xl"
            role="tablist"
            aria-label="Authentication mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => setMode('login')}
              className={cn(
                'relative z-10 flex-1 rounded-xl py-2.5 text-sm font-semibold transition',
                mode === 'login'
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/75',
              )}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => setMode('register')}
              className={cn(
                'relative z-10 flex-1 rounded-xl py-2.5 text-sm font-semibold transition',
                mode === 'register'
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/75',
              )}
            >
              Sign-in
            </button>
            <div
              className={cn(
                'pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-xl border border-white/10 bg-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition-transform duration-300 ease-out',
                mode === 'register' && 'translate-x-full',
              )}
              aria-hidden
            />
          </div>

          {error && (
            <div
              className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200"
              role="alert"
            >
              {error}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-phone" className="mb-1.5 block text-xs font-semibold text-white/70">
                  Phone number <span className="text-secondary">*</span>
                </label>
                <input
                  id="login-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  placeholder="+91 98765 43210"
                  required
                />
              </div>

              {loginGoogleEmail && (
                <div>
                  <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold text-white/70">
                    Email (from Google)
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    readOnly
                    value={loginGoogleEmail}
                    className={cn(inputClass, 'cursor-default bg-white/[0.03] text-white/80')}
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => void onGoogleLogin()}
                disabled={busy}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/[0.1] disabled:opacity-50"
              >
                {busy ? <Loader2 className="animate-spin" size={20} /> : <GoogleIcon className="h-5 w-5" />}
                Sign in with Google
              </button>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl py-3 text-sm font-semibold text-white shadow-glowPrimary transition hover:opacity-95 disabled:opacity-50"
                style={{ backgroundColor: '#2E7D32' }}
              >
                {busy ? 'Continuing…' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label htmlFor="reg-name" className="mb-1.5 block text-xs font-semibold text-white/70">
                  Name <span className="text-secondary">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="reg-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={cn(inputClass, 'min-w-0 flex-1')}
                    placeholder="Your full name"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => void fillCity()}
                    disabled={locBusy}
                    title="Detect location & set city"
                    className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-primary-300 backdrop-blur-md transition hover:border-stroke-2 hover:bg-white/[0.1] disabled:opacity-50"
                    aria-label="Detect city from your location"
                  >
                    {locBusy ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <MapPin size={20} />
                    )}
                  </button>
                </div>
                {city ? (
                  <p className="mt-1.5 text-xs text-white/50">
                    City: <span className="text-white/75">{city}</span>
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="reg-phone" className="mb-1.5 block text-xs font-semibold text-white/70">
                  Phone number <span className="text-secondary">*</span>
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  placeholder="+91 98765 43210"
                  required
                />
              </div>

              <div>
                <label htmlFor="reg-email" className="mb-1.5 block text-xs font-semibold text-white/70">
                  Email <span className="text-white/40">(optional)</span>
                </label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="button"
                onClick={() => void onGoogleLogin()}
                disabled={busy}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/[0.10] disabled:opacity-50"
              >
                {busy ? <Loader2 className="animate-spin" size={20} /> : <GoogleIcon className="h-5 w-5" />}
                Sign in with Google
              </button>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl py-3 text-sm font-semibold text-white shadow-glowPrimary transition hover:opacity-95 disabled:opacity-50"
                style={{ backgroundColor: '#2E7D32' }}
              >
                {busy ? 'Creating account…' : 'Continue'}
              </button>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
