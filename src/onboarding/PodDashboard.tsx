import { useCallback, useState } from 'react'
import { sendPodInviteEmails } from '../api/client'
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

function PodHomeDock({ onPodMenu }: { onPodMenu: () => void }) {
  return (
    <div className="poddash__dock" role="navigation" aria-label="Pod home">
      <div className="poddash__dock-inner">
        <button type="button" className="podwiz__btn podwiz__btn--ghost" onClick={onPodMenu}>
          ← Pod home menu
        </button>
      </div>
    </div>
  )
}

export function PodDashboard(props: Props) {
  const [copied, setCopied] = useState(false)
  const [emailDraft, setEmailDraft] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null)

  const adminInviteCode =
    props.variant === 'admin' ? props.payload.code : ''

  const sendInviteEmails = useCallback(async () => {
    if (!adminInviteCode) return
    const emails = emailDraft
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (emails.length === 0) {
      setEmailFeedback('Add at least one email address.')
      return
    }
    try {
      setEmailSending(true)
      setEmailFeedback(null)
      const result = await sendPodInviteEmails({
        inviteCode: adminInviteCode,
        emails,
        message: emailMessage.trim() || undefined,
      })
      const sent = result.data?.sent?.length ?? 0
      const failed = result.data?.failed?.length ?? 0
      const first = result.data?.failed?.[0]
      setEmailFeedback(
        failed > 0
          ? `Sent ${sent}, ${failed} failed.${first ? ` (${first.email}: ${first.reason})` : ''}`
          : `Sent ${sent} invite${sent === 1 ? '' : 's'}.`,
      )
      if (sent > 0) setEmailDraft('')
    } catch (e) {
      setEmailFeedback(e instanceof Error ? e.message : 'Could not send invites.')
    } finally {
      setEmailSending(false)
    }
  }, [adminInviteCode, emailDraft, emailMessage])

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
        <PodHomeDock onPodMenu={props.onPodMenu} />
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
            We’ll email each address with your pod name, invite code, and an optional
            note from you. Requires mail to be configured on the server.
          </p>
          <label className="podwiz__field">
            <span>Email addresses (comma or one per line)</span>
            <textarea
              className="poddash__textarea"
              rows={4}
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              placeholder={`alex@example.com\nsam@example.com`}
              disabled={emailSending}
            />
          </label>
          <label className="podwiz__field">
            <span>Short message (optional)</span>
            <textarea
              className="poddash__textarea poddash__textarea--short"
              rows={2}
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              placeholder="Join our pod for shared bills."
              disabled={emailSending}
            />
          </label>
          <button
            type="button"
            className="podwiz__btn podwiz__btn--primary"
            disabled={emailSending}
            onClick={() => void sendInviteEmails()}
          >
            {emailSending ? 'Sending…' : 'Send invitations'}
          </button>
          {emailFeedback && (
            <p className="poddash__email-feedback" role="status">
              {emailFeedback}
            </p>
          )}
        </div>
      </details>

      <PodHomeDock onPodMenu={onPodMenu} />
    </section>
  )
}
