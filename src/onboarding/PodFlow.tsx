import { useCallback, useEffect, useState } from 'react'
import { logoutSession } from '../api/client'
import { CreatePodWizard, type CreatedPodPayload } from './CreatePodWizard'
import { JoinPodPanel } from './JoinPodPanel'
import { PodDashboard } from './PodDashboard'
import { clearPodHome, loadPodHome, savePodHome } from './podHomeStorage'
import './PodFlow.css'

type Screen = 'decision' | 'create' | 'join' | 'dashboard'

type DashboardView =
  | { role: 'admin'; payload: CreatedPodPayload; justCreated: boolean }
  | { role: 'member'; code: string }

type Props = {
  onSignOut: () => void
}

type DbStatus = 'checking' | 'ok' | 'error'

export function PodFlow({ onSignOut }: Props) {
  const [screen, setScreen] = useState<Screen>('decision')
  const [dashboardView, setDashboardView] = useState<DashboardView | null>(
    null,
  )
  const [dbStatus, setDbStatus] = useState<DbStatus>('checking')
  const [podRowCount, setPodRowCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/pods', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<{ data?: unknown[] }>
      })
      .then((body) => {
        if (cancelled) return
        const n = Array.isArray(body.data) ? body.data.length : 0
        setPodRowCount(n)
        setDbStatus('ok')
      })
      .catch(() => {
        if (!cancelled) {
          setDbStatus('error')
          setPodRowCount(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const goPodMenu = useCallback(() => {
    setDashboardView(null)
    setScreen('decision')
  }, [])

  const handleCreated = useCallback((payload: CreatedPodPayload) => {
    savePodHome(payload)
    setDashboardView({ role: 'admin', payload, justCreated: true })
    setScreen('dashboard')
  }, [])

  const handleJoined = useCallback((code: string) => {
    setDashboardView({ role: 'member', code })
    setScreen('dashboard')
  }, [])

  const lastPodHome = screen === 'decision' ? loadPodHome() : null

  function handleSignOutClick() {
    void logoutSession().catch(() => {
      // Local sign-out fallback still runs if server logout fails.
    })
    clearPodHome()
    onSignOut()
  }

  return (
    <div className="podflow">
      <div className="podflow__bg" aria-hidden />
      <header className="podflow__header">
        <div className="podflow__brand">
          <img className="podflow__logo-img" src="/app-logo.png" alt="Smart Expense logo" />
          <span className="podflow__brand-text">Smart Expense</span>
        </div>
        <div className="podflow__header-right" aria-live="polite">
          {dbStatus === 'checking' && (
            <span className="podflow__db podflow__db--pending">Database…</span>
          )}
          {dbStatus === 'ok' && (
            <span
              className="podflow__db podflow__db--ok"
              title="API reached MySQL via backend/config/config.php"
            >
              DB · {podRowCount ?? 0} pod{podRowCount === 1 ? '' : 's'}
            </span>
          )}
          {dbStatus === 'error' && (
            <span
              className="podflow__db podflow__db--err"
              title="Run PHP + import smart_expense.sql; check backend/config/config.php"
            >
              DB offline
            </span>
          )}
          <button type="button" className="podflow__signout" onClick={handleSignOutClick}>
            Sign out
          </button>
        </div>
      </header>

      <main className="podflow__main">
        {screen === 'decision' && (
          <section
            className="podflow__decision podflow__enter"
            aria-labelledby="decision-title"
          >
            <p className="podflow__eyebrow">You’re in</p>
            <h1 id="decision-title" className="podflow__title">
              What would you like to do?
            </h1>
            <p className="podflow__subtitle">
              Pods keep roommates, trips, and short stays separate — each with
              its own categories, balances, and invite code.
            </p>
            {lastPodHome && (
              <div className="podflow__resume podflow__enter">
                <div className="podflow__resume-copy">
                  <span className="podflow__resume-label">Your Pod</span>
                  <span className="podflow__resume-name">{lastPodHome.podName}</span>
                  <span className="podflow__resume-hint">
                    Invite code stays on your Pod home — open anytime to copy or
                    share again.
                  </span>
                </div>
                <button
                  type="button"
                  className="podwiz__btn podwiz__btn--primary"
                  onClick={() => {
                    setDashboardView({
                      role: 'admin',
                      payload: lastPodHome,
                      justCreated: false,
                    })
                    setScreen('dashboard')
                  }}
                >
                  Open Pod home
                </button>
              </div>
            )}

            <div className="podflow__choice-grid">
              <button
                type="button"
                className="podflow__choice podflow__choice--create"
                onClick={() => setScreen('create')}
              >
                <span className="podflow__choice-icon" aria-hidden>
                  ◎
                </span>
                <span className="podflow__choice-kicker">Start something new</span>
                <span className="podflow__choice-label">Create a Pod</span>
                <span className="podflow__choice-desc">
                  Name your space, pick a template (home, trip, stay…), and get a
                  shareable code for your crew.
                </span>
                <span className="podflow__choice-cta">Continue →</span>
              </button>
              <button
                type="button"
                className="podflow__choice podflow__choice--join"
                onClick={() => setScreen('join')}
              >
                <span className="podflow__choice-icon" aria-hidden>
                  ⎘
                </span>
                <span className="podflow__choice-kicker">Already have a code</span>
                <span className="podflow__choice-label">Join a Pod</span>
                <span className="podflow__choice-desc">
                  Enter the invite from your friend or roommate — you’ll land in
                  the same balances and history.
                </span>
                <span className="podflow__choice-cta">Enter code →</span>
              </button>
            </div>
          </section>
        )}

        {screen === 'create' && (
          <CreatePodWizard
            onCancel={() => setScreen('decision')}
            onComplete={handleCreated}
          />
        )}

        {screen === 'join' && (
          <JoinPodPanel
            onCancel={() => setScreen('decision')}
            onJoined={handleJoined}
          />
        )}

        {screen === 'dashboard' && dashboardView?.role === 'admin' && (
          <PodDashboard
            variant="admin"
            payload={dashboardView.payload}
            justCreated={dashboardView.justCreated}
            onPodMenu={goPodMenu}
          />
        )}

        {screen === 'dashboard' && dashboardView?.role === 'member' && (
          <PodDashboard
            variant="member"
            joinedCode={dashboardView.code}
            onPodMenu={goPodMenu}
          />
        )}
      </main>
    </div>
  )
}
