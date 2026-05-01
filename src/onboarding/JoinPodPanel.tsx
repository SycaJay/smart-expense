import { useState, type FormEvent } from 'react'
import { looksLikePodCode } from './podCode'

type Props = {
  onCancel: () => void
  onJoined: (code: string) => void
}

export function JoinPodPanel({ onCancel, onJoined }: Props) {
  const [raw, setRaw] = useState('')
  const [err, setErr] = useState<string | null>(null)

  function normalize(s: string) {
    const t = s.trim().toUpperCase().replace(/\s+/g, '')
    if (t.length <= 3) return t
    if (t.startsWith('HSE')) {
      const rest = t.replace(/^HSE-?/, '').slice(0, 4)
      return `HSE-${rest}`
    }
    return t
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const code = normalize(raw)
    if (!looksLikePodCode(code)) {
      setErr('Use a code like HSE-92KD (letters & numbers, no confusing 0/O).')
      return
    }
    setErr(null)
    onJoined(code)
  }

  return (
    <div className="joinpod podwiz__panel--enter">
      <button type="button" className="podwiz__back" onClick={onCancel}>
        ← Back
      </button>
      <header className="podwiz__head">
        <p className="podwiz__eyebrow">Join a Pod</p>
        <h2 className="podwiz__title">Enter your invite code</h2>
        <p className="podwiz__lede">
          Ask your Pod admin for the code — they’ll find it on their Pod home
          after creating the space. Codes look like <strong>HSE-92KD</strong>.
        </p>
      </header>
      <form className="joinpod__form" onSubmit={submit}>
        <label className="podwiz__field">
          <span>Pod code</span>
          <input
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value)
              setErr(null)
            }}
            placeholder="HSE-92KD"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!err}
            aria-describedby={err ? 'joinpod-err' : undefined}
          />
        </label>
        {err && (
          <p id="joinpod-err" className="joinpod__err" role="alert">
            {err}
          </p>
        )}
        <button type="submit" className="podwiz__btn podwiz__btn--primary joinpod__submit">
          Join this Pod
        </button>
      </form>
    </div>
  )
}
