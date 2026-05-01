import { useCallback, useState } from 'react'
import { GroupDashboardDemo } from '../dashboard/GroupDashboardDemo'
import { getPreset } from '../data/podPresets'
import type { CreatedPodPayload } from './CreatePodWizard'

type AdminProps = {
  variant: 'admin'
  payload: CreatedPodPayload
  justCreated?: boolean
  onPodMenu: () => void
}

type MemberProps = {
  variant: 'member'
  joinedCode: string
  onPodMenu: () => void
}

type Props = AdminProps | MemberProps

export function PodDashboard(props: Props) {
  const [copied, setCopied] = useState(false)
  const [emailDraft, setEmailDraft] = useState('')

  const copyCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }, [])

  if (props.variant === 'member') {
    return (
      <section
        className="poddash podflow__enter"
        aria-labelledby="pod-dash-title"
      >
        <p className="podflow__eyebrow">Pod home</p>
        <h1 id="pod-dash-title" className="podflow__title">
          You’re in
        </h1>
        <p className="podflow__subtitle">
          You joined with code <strong>{props.joinedCode}</strong>. Below is the
          same dashboard preview — other Pods stay private.
        </p>
        <GroupDashboardDemo
          podName="Joined Pod"
          inviteCode={props.joinedCode}
        />
        <button
          type="button"
          className="podwiz__btn podwiz__btn--ghost"
          onClick={props.onPodMenu}
        >
          ← Pod home menu
        </button>
      </section>
    )
  }

  const { payload, justCreated, onPodMenu } = props
  const preset = getPreset(payload.podType)

  return (
    <section className="poddash podflow__enter" aria-labelledby="pod-dash-title">
      {justCreated && (
        <p className="poddash__banner" role="status">
          Pod created — your invite code is saved here anytime you need it.
        </p>
      )}
      <p className="podflow__eyebrow">Pod home</p>
      <h1 id="pod-dash-title" className="podflow__title">
        {payload.podName}
      </h1>
      <p className="podflow__subtitle">
        You’re <strong>Pod admin</strong> and a <strong>member</strong>. Share
        the code below so roommates can join — it stays on this screen whenever
        you need it.
      </p>

      <p className="poddash__template-note">
        Template: {preset.emoji} {preset.title}
      </p>

      <GroupDashboardDemo podName={payload.podName} inviteCode={payload.code} />

      <div className="podflow__code-card poddash__invite">
        <div className="poddash__invite-head">
          <div>
            <p className="podflow__code-label">Invite code</p>
            <p className="poddash__invite-sub">
              Main way to add people — copy and drop into WhatsApp, SMS, or
              anywhere your group chats.
            </p>
          </div>
          <button
            type="button"
            className="podwiz__btn podwiz__btn--ghost"
            onClick={() => copyCode(payload.code)}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="podflow__code-row">
          <code className="podflow__code">{payload.code}</code>
        </div>
        <p className="podflow__code-hint">
          Each person creates their own Smart Expense account, then taps{' '}
          <strong>Join a Pod</strong> and enters this code.
        </p>
      </div>

      <details className="poddash__email-details">
        <summary className="poddash__email-summary">
          Invite by email <span className="poddash__email-badge">Optional</span>
        </summary>
        <div className="poddash__email-body">
          <p className="poddash__email-lede">
            Secondary path — add addresses and we’ll send a join link, Pod name,
            and accept button once email is wired on the server.
          </p>
          <label className="podwiz__field">
            <span>Roommate emails (comma or newline separated)</span>
            <textarea
              className="poddash__textarea"
              rows={4}
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              placeholder="alex@example.com, sam@example.com"
              disabled
              title="Backend mailer not connected in this build"
            />
          </label>
          <button
            type="button"
            className="podwiz__btn podwiz__btn--ghost"
            disabled
            title="Connect SMTP or provider on the server to enable sends"
          >
            Send invitations
          </button>
        </div>
      </details>

      <div className="poddash__footer-actions">
        <button
          type="button"
          className="podwiz__btn podwiz__btn--ghost"
          onClick={onPodMenu}
        >
          ← Pod home menu
        </button>
      </div>
    </section>
  )
}
