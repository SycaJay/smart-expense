import { useEffect, useId, useState } from 'react'
import {
  FALLBACK_CALLING_CODES,
  fetchCountryCallingCodes,
  login,
  requestPasswordReset,
  resetPasswordWithToken,
  saveSignup,
  type CountryCallingCode,
} from '../api/client'
import './HomePage.css'

type PasswordFieldProps = {
  id: string
  name: string
  label: string
  autoComplete: string
  required?: boolean
  minLength?: number
}

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  required,
  minLength,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false)
  return (
    <label className="home__field" htmlFor={id}>
      <span>{label}</span>
      <div className="home__password-wrap">
        <input
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
        />
        <button
          type="button"
          className="home__password-toggle"
          onClick={() => setShow((v) => !v)}
          aria-pressed={show}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
    </label>
  )
}

type AuthMode = 'signup' | 'login'

function modeFromHash(): AuthMode {
  if (typeof window === 'undefined') return 'signup'
  return window.location.hash === '#login' ? 'login' : 'signup'
}

type HomePageProps = {
  onAuthenticated?: () => void
}

export default function HomePage({ onAuthenticated }: HomePageProps) {
  const [mode, setMode] = useState<AuthMode>(modeFromHash)
  const [authError, setAuthError] = useState<string | null>(null)
  const [loginWelcomeFirstName, setLoginWelcomeFirstName] = useState<string | null>(
    null,
  )
  const [passwordResetToken, setPasswordResetToken] = useState<string | null>(null)
  const [forgotPanel, setForgotPanel] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null)
  const [postResetMessage, setPostResetMessage] = useState<string | null>(null)
  const [callingCodes, setCallingCodes] =
    useState<CountryCallingCode[]>(FALLBACK_CALLING_CODES)
  const [phoneDial, setPhoneDial] = useState('233')
  const formId = useId()
  const [authOnly, setAuthOnly] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.location.hash === '#login' || window.location.hash === '#signup'
      : false,
  )

  useEffect(() => {
    function onHashChange() {
      setMode(modeFromHash())
      setAuthOnly(
        window.location.hash === '#login' || window.location.hash === '#signup',
      )
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (!loginWelcomeFirstName) return
    const t = window.setTimeout(() => setLoginWelcomeFirstName(null), 5200)
    return () => window.clearTimeout(t)
  }, [loginWelcomeFirstName])

  useEffect(() => {
    if (!postResetMessage) return
    const t = window.setTimeout(() => setPostResetMessage(null), 8000)
    return () => window.clearTimeout(t)
  }, [postResetMessage])

  useEffect(() => {
    if (!authOnly || mode !== 'signup') return
    let cancelled = false
    fetchCountryCallingCodes()
      .then((list) => {
        if (cancelled) return
        setCallingCodes(list)
        setPhoneDial((current) => {
          if (list.some((c) => c.dial === current)) return current
          const gh = list.find((c) => c.dial === '233')
          return gh?.dial ?? list[0]?.dial ?? current
        })
      })
      .catch(() => {
        if (!cancelled) setCallingCodes(FALLBACK_CALLING_CODES)
      })
    return () => {
      cancelled = true
    }
  }, [authOnly, mode])

  useEffect(() => {
    const url = new URL(window.location.href)
    const t = url.searchParams.get('pwdreset')
    if (t && t.length >= 32) {
      setPasswordResetToken(t)
      setForgotPanel(false)
      setForgotSuccess(null)
      setAuthOnly(true)
      setMode('login')
      url.searchParams.delete('pwdreset')
      const qs = url.searchParams.toString()
      window.history.replaceState(
        null,
        '',
        url.pathname + (qs ? `?${qs}` : '') + (url.hash || ''),
      )
    }
  }, [])

  function goAuth(next: AuthMode) {
    setMode(next)
    setAuthOnly(true)
    setAuthError(null)
    if (next === 'signup') {
      setLoginWelcomeFirstName(null)
      setForgotPanel(false)
      setForgotSuccess(null)
      setPasswordResetToken(null)
      setPostResetMessage(null)
    }
    if (next === 'login') {
      setForgotSuccess(null)
      setForgotPanel(false)
    }
    window.history.replaceState(null, '', next === 'login' ? '#login' : '#signup')
  }

  function goHome() {
    setAuthOnly(false)
    setAuthError(null)
    window.history.replaceState(null, '', '#top')
  }

  return (
    <div className="home">
      <div className="home__bg" aria-hidden />
      <header className="home__nav">
        <a className="home__logo" href="#top">
          <img className="home__logo-img" src="/app-logo.png" alt="Smart Expense logo" />
          Smart Expense
        </a>
        <nav className="home__nav-actions" aria-label="Account">
          <a className="home__link" href="#login" onClick={() => goAuth('login')}>
            Log In
          </a>
          <a
            className="home__btn home__btn--small"
            href="#signup"
            onClick={() => goAuth('signup')}
          >
            Sign Up
          </a>
        </nav>
      </header>

      <main id="top" className="home__main">
        {!authOnly && (
          <>
        <section className="home__hero" aria-labelledby="hero-title">
          <div className="home__hero-copy">
            <p className="home__eyebrow home__anim home__anim--1">
              Shared costs, clear balances
            </p>
            <h1 id="hero-title" className="home__title home__anim home__anim--2">
              Split rent, trips &amp; bills —{' '}
              <span className="home__title-accent">without the awkward math.</span>
            </h1>
            <p className="home__lead home__anim home__anim--3">
              One place for your household or crew: log who paid what, split
              fairly, and settle up with fewer back-and-forth payments.
            </p>
            <div className="home__hero-cta home__anim home__anim--4">
              <a className="home__btn" href="#signup" onClick={() => goAuth('signup')}>
                Create your account
              </a>
              <a
                className="home__btn home__btn--ghost"
                href="#login"
                onClick={() => goAuth('login')}
              >
                I already have an account
              </a>
            </div>
          </div>
          <div className="home__hero-visual home__anim home__anim--5" aria-hidden>
            <img
              className="home__hero-img"
              src="/home-hero.svg"
              alt=""
              width={520}
              height={400}
              decoding="async"
            />
          </div>
        </section>

        <section className="home__strip" aria-label="What Smart Expense does">
          <article className="home__card home__rise">
            <div className="home__card-icon home__card-icon--split" aria-hidden>
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M3 7h8M13 7l2 2 3-4M3 17h8M13 17l2 2 3-4" />
              </svg>
            </div>
            <h2 className="home__card-title">Fair splits</h2>
            <p className="home__card-text">
              Equal or weighted shares — so everyone pays their part, whether
              you’re at home or on the road.
            </p>
          </article>
          <article className="home__card home__rise home__rise--2">
            <div className="home__card-icon home__card-icon--balance" aria-hidden>
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M4 6h16M7 6v11M17 6v11M9 17h6M12 17v3" />
              </svg>
            </div>
            <h2 className="home__card-title">Clear balances</h2>
            <p className="home__card-text">
              See who’s owed what at a glance, so money talk stays calm and
              factual.
            </p>
          </article>
          <article className="home__card home__rise home__rise--3">
            <div className="home__card-icon home__card-icon--settle" aria-hidden>
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M7 7h11M18 7l-2-2M18 7l-2 2M17 17H6M6 17l2-2M6 17l2 2" />
              </svg>
            </div>
            <h2 className="home__card-title">Smarter settle-up</h2>
            <p className="home__card-text">
              Fewer transactions to zero everyone out — simple instructions, less
              hassle.
            </p>
          </article>
        </section>
          </>
        )}

        {authOnly && (
        <section className="home__auth" aria-labelledby="auth-title">
          <div className="home__auth-card">
            <h2 id="auth-title" className="home__auth-heading">
              {mode === 'signup' ? 'Create account' : 'Log in'}
            </h2>
            {mode === 'login' && loginWelcomeFirstName && (
              <div className="home__welcome-toast" role="status">
                Hello {loginWelcomeFirstName}, your account is ready. Log in with the
                email and password you just used to continue.
              </div>
            )}
            {authOnly && (
              <p className="home__auth-sub">
                <a href="#top" className="home__link" onClick={goHome}>
                  ← Back to home
                </a>
              </p>
            )}
            <div
              className="home__tabs"
              role="tablist"
              aria-label="Sign up or log in"
            >
              <button
                type="button"
                role="tab"
                id={`${formId}-tab-signup`}
                aria-selected={mode === 'signup'}
                aria-controls={`${formId}-panel-signup`}
                className={mode === 'signup' ? 'is-active' : undefined}
                onClick={() => goAuth('signup')}
              >
                Sign Up
              </button>
              <button
                type="button"
                role="tab"
                id={`${formId}-tab-login`}
                aria-selected={mode === 'login'}
                aria-controls={`${formId}-panel-login`}
                className={mode === 'login' ? 'is-active' : undefined}
                onClick={() => goAuth('login')}
              >
                Log In
              </button>
            </div>

            {mode === 'signup' ? (
              <form
                className="home__form"
                id={`${formId}-panel-signup`}
                role="tabpanel"
                aria-labelledby={`${formId}-tab-signup`}
                onSubmit={(e) => {
                  e.preventDefault()
                  const form = e.currentTarget
                  const fd = new FormData(form)
                  const firstName = String(fd.get('firstName') ?? '').trim()
                  const lastName = String(fd.get('lastName') ?? '').trim()
                  const email = String(fd.get('email') ?? '').trim()
                  const phoneNational = String(
                    fd.get('phoneNational') ?? '',
                  ).replace(/\D/g, '')
                  const phoneDialDigits = phoneDial.replace(/\D/g, '')
                  const password = String(fd.get('password') ?? '')
                  const confirmPassword = String(fd.get('confirmPassword') ?? '')

                  if (password !== confirmPassword) {
                    setAuthError('Passwords do not match.')
                    return
                  }

                  if (phoneDialDigits === '' || phoneNational.length < 5) {
                    setAuthError(
                      'Choose a country code and enter at least 5 digits for your number.',
                    )
                    return
                  }

                  saveSignup({
                    firstName,
                    lastName,
                    email,
                    phoneDial: phoneDialDigits,
                    phoneNational,
                    password,
                  })
                    .then(() => {
                      setAuthError(null)
                      setLoginWelcomeFirstName(firstName)
                      form.reset()
                      goAuth('login')
                      window.requestAnimationFrame(() => {
                        document
                          .querySelector('.home__auth')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      })
                    })
                    .catch((err: unknown) => {
                      const msg =
                        err instanceof Error
                          ? err.message
                          : 'Could not save signup locally.'
                      setAuthError(msg)
                    })
                }}
              >
                <label className="home__field">
                  <span>First name</span>
                  <input
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                  />
                </label>
                <label className="home__field">
                  <span>Last name</span>
                  <input
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                  />
                </label>
                <label className="home__field">
                  <span>Email</span>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="home__field home__field--phone">
                  <span>Phone</span>
                  <div className="home__phone-row">
                    <select
                      className="home__phone-dial"
                      value={phoneDial}
                      onChange={(e) => setPhoneDial(e.target.value)}
                      aria-label="Country calling code"
                      required
                    >
                      {callingCodes.map((c, i) => (
                        <option key={`${c.dial}-${c.name}-${i}`} value={c.dial}>
                          +{c.dial} {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      name="phoneNational"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      className="home__phone-national"
                      placeholder="National number"
                      required
                      minLength={5}
                    />
                  </div>
                </label>
                <PasswordField
                  id={`${formId}-pw-signup`}
                  name="password"
                  label="Password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <PasswordField
                  id={`${formId}-pw-signup-confirm`}
                  name="confirmPassword"
                  label="Confirm password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                {authError && mode === 'signup' && (
                  <p className="home__auth-error" role="alert">
                    {authError}
                  </p>
                )}
                <button type="submit" className="home__submit">
                  Create account
                </button>
              </form>
            ) : passwordResetToken ? (
              <form
                className="home__form"
                id={`${formId}-panel-reset`}
                role="tabpanel"
                aria-labelledby={`${formId}-tab-login`}
                onSubmit={(e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget)
                  const pw = String(fd.get('newPassword') ?? '')
                  const confirm = String(fd.get('confirmNewPassword') ?? '')
                  if (pw !== confirm) {
                    setAuthError('Passwords do not match.')
                    return
                  }
                  resetPasswordWithToken(passwordResetToken, pw)
                    .then((res) => {
                      setAuthError(null)
                      setPasswordResetToken(null)
                      setForgotPanel(false)
                      setPostResetMessage(
                        res.message ?? 'Password updated. Log in with your new password.',
                      )
                    })
                    .catch((err: unknown) => {
                      setAuthError(
                        err instanceof Error ? err.message : 'Could not reset password.',
                      )
                    })
                }}
              >
                <p className="home__auth-sub" style={{ marginTop: 0, marginBottom: 8 }}>
                  Choose a new password for your account.
                </p>
                <PasswordField
                  id={`${formId}-pw-reset`}
                  name="newPassword"
                  label="New password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <PasswordField
                  id={`${formId}-pw-reset-confirm`}
                  name="confirmNewPassword"
                  label="Confirm new password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                {authError && (
                  <p className="home__auth-error" role="alert">
                    {authError}
                  </p>
                )}
                <button type="submit" className="home__submit">
                  Update password
                </button>
                <button
                  type="button"
                  className="home__link-btn"
                  onClick={() => {
                    setPasswordResetToken(null)
                    setAuthError(null)
                  }}
                >
                  Cancel and return to log in
                </button>
              </form>
            ) : forgotPanel ? (
              <form
                className="home__form"
                id={`${formId}-panel-forgot`}
                role="tabpanel"
                aria-labelledby={`${formId}-tab-login`}
                onSubmit={(e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget)
                  const email = String(fd.get('email') ?? '').trim()
                  setAuthError(null)
                  setForgotSuccess(null)
                  requestPasswordReset(email)
                    .then((res) => {
                      setForgotSuccess(res.message ?? 'Check your email for a reset link.')
                      e.currentTarget.reset()
                    })
                    .catch((err: unknown) => {
                      setAuthError(
                        err instanceof Error ? err.message : 'Could not send reset email.',
                      )
                    })
                }}
              >
                <p className="home__auth-sub" style={{ marginTop: 0, marginBottom: 8 }}>
                  Enter the email you used to sign up. We’ll send a link to reset your
                  password if an account exists.
                </p>
                <label className="home__field">
                  <span>Email</span>
                  <input name="email" type="email" autoComplete="email" required />
                </label>
                {authError && (
                  <p className="home__auth-error" role="alert">
                    {authError}
                  </p>
                )}
                {forgotSuccess && (
                  <p className="home__welcome-toast" role="status">
                    {forgotSuccess}
                  </p>
                )}
                <button type="submit" className="home__submit">
                  Send reset link
                </button>
                <button
                  type="button"
                  className="home__link-btn"
                  onClick={() => {
                    setForgotPanel(false)
                    setAuthError(null)
                    setForgotSuccess(null)
                  }}
                >
                  Back to log in
                </button>
              </form>
            ) : (
              <form
                className="home__form"
                id={`${formId}-panel-login`}
                role="tabpanel"
                aria-labelledby={`${formId}-tab-login`}
                onSubmit={(e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget)
                  const email = String(fd.get('email') ?? '').trim()
                  const password = String(fd.get('password') ?? '')
                  login({ email, password })
                    .then(() => {
                      setAuthError(null)
                      onAuthenticated?.()
                    })
                    .catch((err: unknown) => {
                      const msg =
                        err instanceof Error ? err.message : 'Login failed.'
                      setAuthError(msg)
                    })
                }}
              >
                {postResetMessage && (
                  <p className="home__welcome-toast" role="status">
                    {postResetMessage}
                  </p>
                )}
                <label className="home__field">
                  <span>Email</span>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
                <PasswordField
                  id={`${formId}-pw-login`}
                  name="password"
                  label="Password"
                  autoComplete="current-password"
                  required
                />
                <div className="home__login-row">
                  <button
                    type="button"
                    className="home__link-btn"
                    onClick={() => {
                      setForgotPanel(true)
                      setAuthError(null)
                      setForgotSuccess(null)
                      setPostResetMessage(null)
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                {authError && (
                  <p className="home__auth-error" role="alert">
                    {authError}
                  </p>
                )}
                <button type="submit" className="home__submit">
                  Log in
                </button>
              </form>
            )}
          </div>
        </section>
        )}

        <footer className="home__footer">
          <span>Smart Expense</span>
          <span className="home__footer-dot">·</span>
          <span>Shared costs, private groups</span>
        </footer>
      </main>
    </div>
  )
}
