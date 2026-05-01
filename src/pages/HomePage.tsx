import { useEffect, useId, useState } from 'react'
import { isDemoLogin } from '../config/demoAuth'
import { saveSignup } from '../api/client'
import './HomePage.css'

type AuthMode = 'signup' | 'login'

function modeFromHash(): AuthMode {
  if (typeof window === 'undefined') return 'signup'
  return window.location.hash === '#login' ? 'login' : 'signup'
}

type HomePageProps = {
  /** Called after a successful sign-up or log-in. */
  onAuthenticated?: () => void
}

export default function HomePage({ onAuthenticated }: HomePageProps) {
  const [mode, setMode] = useState<AuthMode>(modeFromHash)
  const [authError, setAuthError] = useState<string | null>(null)
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

  function goAuth(next: AuthMode) {
    setMode(next)
    setAuthOnly(true)
    setAuthError(null)
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
          <span className="home__logo-mark" aria-hidden />
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
            <div className="home__card-icon home__card-icon--split" aria-hidden />
            <h2 className="home__card-title">Fair splits</h2>
            <p className="home__card-text">
              Equal or weighted shares — so everyone pays their part, whether
              you’re at home or on the road.
            </p>
          </article>
          <article className="home__card home__rise home__rise--2">
            <div className="home__card-icon home__card-icon--balance" aria-hidden />
            <h2 className="home__card-title">Clear balances</h2>
            <p className="home__card-text">
              See who’s owed what at a glance, so money talk stays calm and
              factual.
            </p>
          </article>
          <article className="home__card home__rise home__rise--3">
            <div className="home__card-icon home__card-icon--settle" aria-hidden />
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
                  const fullName = String(fd.get('fullName') ?? '').trim()
                  const email = String(fd.get('email') ?? '').trim()
                  const phone = String(fd.get('phone') ?? '').trim()
                  const password = String(fd.get('password') ?? '')

                  saveSignup({ fullName, email, phone, password })
                    .then(() => {
                      setAuthError(null)
                      form.reset()
                      goAuth('login')
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
                  <span>Full name</span>
                  <input name="fullName" type="text" autoComplete="name" required />
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
                <label className="home__field">
                  <span>Phone</span>
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                  />
                </label>
                <label className="home__field">
                  <span>Password</span>
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                </label>
                {authError && mode === 'signup' && (
                  <p className="home__auth-error" role="alert">
                    {authError}
                  </p>
                )}
                <button type="submit" className="home__submit">
                  Create account
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
                  const email = String(fd.get('email') ?? '')
                  const password = String(fd.get('password') ?? '')
                  if (!isDemoLogin(email, password)) {
                    setAuthError('Invalid email or password.')
                    return
                  }
                  setAuthError(null)
                  onAuthenticated?.()
                }}
              >
                <label className="home__field">
                  <span>Email</span>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="home__field">
                  <span>Password</span>
                  <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </label>
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
