import { useEffect, useState } from 'react'
import { sendPodInviteEmails } from '../api/client'

type Props = {
  open: boolean
  onClose: () => void
  defaultPodName: string
  inviteCode: string
  podId: number | null
  currency: string
  defaultSplitMethod: 'equal' | 'weighted'
  members: string[]
}

export function PodSettingsDemoModal({
  open,
  onClose,
  defaultPodName,
  inviteCode,
  podId,
  currency,
  defaultSplitMethod,
  members,
}: Props) {
  const [podName, setPodName] = useState(defaultPodName)
  const [defaultSplit, setDefaultSplit] = useState<'equal' | 'weighted'>(defaultSplitMethod)
  const [leaveConfirm, setLeaveConfirm] = useState(false)
  const [inviteEmailsInput, setInviteEmailsInput] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null)
  const [sendingInvites, setSendingInvites] = useState(false)

  useEffect(() => {
    setPodName(defaultPodName)
  }, [defaultPodName])

  useEffect(() => {
    setDefaultSplit(defaultSplitMethod)
  }, [defaultSplitMethod])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const handleSendInvites = async () => {
    const emails = inviteEmailsInput
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    if (emails.length === 0) {
      setInviteFeedback('Enter at least one valid email.')
      return
    }

    try {
      setSendingInvites(true)
      setInviteFeedback(null)
      const result = await sendPodInviteEmails({
        podId: podId ?? undefined,
        inviteCode,
        emails,
        message: inviteMessage.trim() || undefined,
      })
      const sentCount = result.data?.sent?.length ?? 0
      const failedCount = result.data?.failed?.length ?? 0
      setInviteFeedback(
        failedCount > 0
          ? `Sent ${sentCount} invite(s), ${failedCount} failed.`
          : `Sent ${sentCount} invite(s) successfully.`,
      )
      if (sentCount > 0) {
        setInviteEmailsInput('')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not send invites right now.'
      setInviteFeedback(msg)
    } finally {
      setSendingInvites(false)
    }
  }

  return (
    <div
      className="pset-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pset-title"
      aria-describedby="pset-sub"
    >
      <div className="pset-modal__backdrop" onClick={onClose} aria-hidden />
      <div className="pset-modal__card">
        <div className="pset-modal__head">
          <h2 id="pset-title">Pod settings</h2>
          <p id="pset-sub" className="pset-modal__sub">
            Changes stay in this browser session only
          </p>
          <button type="button" className="addexp-modal__x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="pset-modal__body">
          <label className="podwiz__field">
            <span>Group / Pod name</span>
            <input
              value={podName}
              onChange={(e) => setPodName(e.target.value)}
              maxLength={120}
              autoFocus
            />
          </label>

          <label className="podwiz__field">
            <span>Default split for new expenses</span>
            <select
              value={defaultSplit}
              onChange={(e) => setDefaultSplit(e.target.value as 'equal' | 'weighted')}
            >
              <option value="equal">Equal</option>
              <option value="weighted">Weighted</option>
            </select>
          </label>

          <section className="pset-block" aria-labelledby="pset-inv">
            <h3 id="pset-inv" className="pset-block__title">
              Invites
            </h3>
            <p className="pset-block__text">
              Share the invite code or send email invites directly from here.
            </p>
            <code className="pset-code">{inviteCode}</code>
            <label className="podwiz__field" style={{ marginTop: 12 }}>
              <span>Invite emails (comma-separated)</span>
              <input
                value={inviteEmailsInput}
                onChange={(e) => setInviteEmailsInput(e.target.value)}
                placeholder="friend1@mail.com, friend2@mail.com"
                autoComplete="off"
              />
            </label>
            <label className="podwiz__field">
              <span>Short message (optional)</span>
              <textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                rows={3}
                placeholder="Join our pod for shared bills."
              />
            </label>
            <button type="button" className="podwiz__btn podwiz__btn--primary" onClick={handleSendInvites} disabled={sendingInvites}>
              {sendingInvites ? 'Sending…' : 'Send invite emails'}
            </button>
            {inviteFeedback && (
              <p className="pset-block__hint" role="status">
                {inviteFeedback}
              </p>
            )}
          </section>

          <section className="pset-block" aria-labelledby="pset-mem">
            <h3 id="pset-mem" className="pset-block__title">
              Members
            </h3>
            <ul className="pset-members">
              {members.map((m) => (
                <li key={m} className="pset-member">
                  <span>{m}</span>
                  <button type="button" className="pset-remove" disabled title="Connect API to remove">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <p className="pset-block__hint">Add/remove members syncs with the server in a later build.</p>
          </section>

          <section className="pset-block pset-block--danger" aria-labelledby="pset-leave">
            <h3 id="pset-leave" className="pset-block__title">
              Leave Pod
            </h3>
            {!leaveConfirm ? (
              <button
                type="button"
                className="pset-leave-btn"
                onClick={() => setLeaveConfirm(true)}
              >
                Leave this Pod…
              </button>
            ) : (
              <div className="pset-leave-confirm">
                <p>Leave for real? Nothing is saved.</p>
                <div className="pset-leave-actions">
                  <button type="button" className="podwiz__btn podwiz__btn--ghost" onClick={() => setLeaveConfirm(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="podwiz__btn pset-leave-confirm-btn"
                    onClick={onClose}
                  >
                    Confirm leave
                  </button>
                </div>
              </div>
            )}
          </section>

          <p className="pset-foot">Currency for this Pod: {currency}</p>
        </div>
      </div>
    </div>
  )
}
