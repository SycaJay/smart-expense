import { useCallback, useState } from 'react'
import HomePage from './pages/HomePage'
import { PodFlow } from './onboarding/PodFlow'

export default function App() {
  const [phase, setPhase] = useState<'landing' | 'pods'>('landing')

  const handleAuthenticated = useCallback(() => {
    setPhase('pods')
  }, [])

  const handleSignOut = useCallback(() => {
    setPhase('landing')
  }, [])

  if (phase === 'pods') {
    return <PodFlow onSignOut={handleSignOut} />
  }

  return <HomePage onAuthenticated={handleAuthenticated} />
}
