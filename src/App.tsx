import { useCallback, useEffect, useState } from 'react'
import { fetchCurrentUser } from './api/client'
import HomePage from './pages/HomePage'
import { PodFlow } from './onboarding/PodFlow'

export default function App() {
  const [phase, setPhase] = useState<'landing' | 'pods'>('landing')
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchCurrentUser()
      .then((user) => {
        if (cancelled) return
        setPhase(user ? 'pods' : 'landing')
      })
      .catch(() => {
        if (!cancelled) setPhase('landing')
      })
      .finally(() => {
        if (!cancelled) setCheckingSession(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleAuthenticated = useCallback(() => {
    setPhase('pods')
  }, [])

  const handleSignOut = useCallback(() => {
    setPhase('landing')
  }, [])

  if (checkingSession) {
    return null
  }

  if (phase === 'pods') {
    return <PodFlow onSignOut={handleSignOut} />
  }

  return <HomePage onAuthenticated={handleAuthenticated} />
}
