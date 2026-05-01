import { useEffect, useState } from 'react'
import {
  closePod,
  leavePod,
  removePodMember,
  sendPodInviteEmails,
  updatePodMemberRole,
  updatePodSettings,
} from '../api/client'

type Props = {
  open: boolean
  onClose: () => void
  onUpdated: () => void
  onLeft: () => void
  defaultPodName: string
  inviteCode: string
  podId: number | null
  viewerId: number | null
  currency: string
  defaultSplitMethod: 'equal' | 'weighted'
  members: { id: number; name: string; role: 'admin' | 'member' | string }[]
}

type LeaveStage = 'intro' | 'confirm_reason' | 'confirm_final'

export function PodSettingsDemoModal({
  open,
  onClose,
  onUpdated,
  onLeft,
  defaultPodName,
  inviteCode,
  podId,
  viewerId,
  currency,
  defaultSplitMethod,
  members,
}: Props) {
  const [podName, setPodName] = useState(defaultPodName)
  const [defaultSplit, setDefaultSplit] = useState<'equal' | 'weighted'>(defaultSplitMethod)
  const [leaveStage, setLeaveStage] = useState<LeaveStage>('intro')
  const [leaveReason, setLeaveReason] = useState('')
  const [leaveAckOne, setLeaveAckOne] = useState(false)
  const [leaveAckTwo, setLeaveAckTwo] = useState(false)
  const [inviteEmailsInput, setInviteEmailsInput] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null)
  const [sendingInvites, setSendingInvites] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null)
  const [savingPod, setSavingPod] = useState(false)
  const [memberActionFeedback, setMemberActionFeedback] = useState<string | null>(null)
  const [workingMemberId, setWorkingMemberId] = useState<number | null>(null)
  const [leavingPod, setLeavingPod] = useState(false)
  const [closeReason, setCloseReason] = useState('')
  const [closeConfirm, setCloseConfirm] = useState(false)
  const [closingPod, setClosingPod] = useState(false)

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
      const firstFailure = result.data?.failed?.[0]
      setInviteFeedback(
        failedCount > 0
          ? `Sent ${sentCount} invite(s), ${failedCount} failed.${firstFailure ? ` First error (${firstFailure.email}): ${firstFailure.reason}` : ''}`
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

  const viewer = members.find((m) => m.id === viewerId)
  const isViewerAdmin = viewer?.role === 'admin'

  const handleSaveSettings = async () => {
    if (!podId) {
      setSaveFeedback('No active pod selected.')
      return
    }
    if (!isViewerAdmin) {
      setSaveFeedback('Only admins can update pod settings.')
      return
    }
    if (podName.trim() === '') {
      setSaveFeedback('Pod name cannot be empty.')
      return
    }

    try {
      setSavingPod(true)
      setSaveFeedback(null)
      await updatePodSettings({
        podId,
        podName: podName.trim(),
        defaultSplitMethod: defaultSplit,
      })
      setSaveFeedback('Pod settings saved.')
      onUpdated()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save pod settings.'
      setSaveFeedback(msg)
    } finally {
      setSavingPod(false)
    }
  }

  const handleRoleChange = async (targetUserId: number, nextRole: 'admin' | 'member') => {
    if (!podId) return
    try {
      setWorkingMemberId(targetUserId)
      setMemberActionFeedback(null)
      await updatePodMemberRole({ podId, targetUserId, newRole: nextRole })
      setMemberActionFeedback('Member role updated.')
      onUpdated()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to update member role.'
      setMemberActionFeedback(msg)
    } finally {
      setWorkingMemberId(null)
    }
  }

  const handleRemoveMember = async (targetUserId: number) => {
    if (!podId) return
    try {
      setWorkingMemberId(targetUserId)
      setMemberActionFeedback(null)
      await removePodMember({ podId, targetUserId })
      setMemberActionFeedback('Member removed.')
      onUpdated()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to remove member.'
      setMemberActionFeedback(msg)
    } finally {
      setWorkingMemberId(null)
    }
  }

  const handleLeavePod = async () => {
    if (!podId) return
    if (!leaveAckOne || !leaveAckTwo) {
      setMemberActionFeedback('Please complete both leave confirmations.')
      return
    }
    try {
      setLeavingPod(true)
      setMemberActionFeedback(null)
      await leavePod({
        podId,
        reason: leaveReason.trim(),
        confirmStepOne: leaveAckOne,
        confirmStepTwo: leaveAckTwo,
      })
      onLeft()
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to leave pod.'
      setMemberActionFeedback(msg)
    } finally {
      setLeavingPod(false)
      setLeaveStage('intro')
      setLeaveAckOne(false)
      setLeaveAckTwo(false)
      setLeaveReason('')
    }
  }

  const handleClosePod = async () => {
    if (!podId) return
    if (!isViewerAdmin) {
      setMemberActionFeedback('Only admins can close a pod.')
      return
    }
    if (!closeConfirm) {
      setMemberActionFeedback('Please confirm pod archive before closing.')
      return
    }
    try {
      setClosingPod(true)
      setMemberActionFeedback(null)
      await closePod({
        podId,
        reason: closeReason.trim() || undefined,
        confirmArchive: true,
      })
      setMemberActionFeedback('Pod archived successfully.')
      onUpdated()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not close pod.'
      setMemberActionFeedback(msg)
    } finally {
      setClosingPod(false)
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
            Manage pod settings, roles, and membership
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
              disabled={!isViewerAdmin}
            />
          </label>

          <label className="podwiz__field">
            <span>Default split for new expenses</span>
            <select
              value={defaultSplit}
              onChange={(e) => setDefaultSplit(e.target.value as 'equal' | 'weighted')}
              disabled={!isViewerAdmin}
            >
              <option value="equal">Equal</option>
              <option value="weighted">Weighted</option>
            </select>
          </label>
          <button
            type="button"
            className="podwiz__btn podwiz__btn--primary"
            onClick={handleSaveSettings}
            disabled={!isViewerAdmin || savingPod}
          >
            {savingPod ? 'Saving…' : 'Save pod settings'}
          </button>
          {saveFeedback && (
            <p className="pset-block__hint" role="status">
              {saveFeedback}
            </p>
          )}

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
                disabled={!isViewerAdmin || sendingInvites}
              />
            </label>
            <label className="podwiz__field">
              <span>Short message (optional)</span>
              <textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                rows={3}
                placeholder="Join our pod for shared bills."
                disabled={!isViewerAdmin || sendingInvites}
              />
            </label>
            <button
              type="button"
              className="podwiz__btn podwiz__btn--primary"
              onClick={handleSendInvites}
              disabled={sendingInvites || !isViewerAdmin}
            >
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
                <li key={m.id} className="pset-member">
                  <span>{m.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value as 'admin' | 'member')}
                      disabled={!isViewerAdmin || workingMemberId === m.id}
                      aria-label={`Role for ${m.name}`}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    {m.id !== viewerId && (
                      <button
                        type="button"
                        className="pset-remove"
                        onClick={() => handleRemoveMember(m.id)}
                        disabled={!isViewerAdmin || workingMemberId === m.id}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {memberActionFeedback && (
              <p className="pset-block__hint" role="status">
                {memberActionFeedback}
              </p>
            )}
          </section>

          <section className="pset-block pset-block--danger" aria-labelledby="pset-leave">
            <h3 id="pset-leave" className="pset-block__title">
              Leave Pod
            </h3>
            {leaveStage === 'intro' ? (
              <button
                type="button"
                className="pset-leave-btn"
                onClick={() => setLeaveStage('confirm_reason')}
              >
                Leave this Pod…
              </button>
            ) : leaveStage === 'confirm_reason' ? (
              <div className="pset-leave-confirm">
                <p>Are you sure you want to leave this pod?</p>
                <label className="podwiz__field">
                  <span>Tell us why you are leaving (optional)</span>
                  <textarea
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    rows={3}
                    placeholder="Your feedback helps us improve."
                    maxLength={500}
                  />
                </label>
                <label className="pset-leave-check">
                  <input
                    type="checkbox"
                    checked={leaveAckOne}
                    onChange={(e) => setLeaveAckOne(e.target.checked)}
                  />
                  I understand I will lose access to this pod after leaving.
                </label>
                <div className="pset-leave-actions">
                  <button type="button" className="podwiz__btn podwiz__btn--ghost" onClick={() => setLeaveStage('intro')}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="podwiz__btn"
                    onClick={() => setLeaveStage('confirm_final')}
                    disabled={!leaveAckOne}
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              <div className="pset-leave-confirm">
                <p>Final confirmation: leave this pod now?</p>
                <label className="pset-leave-check">
                  <input
                    type="checkbox"
                    checked={leaveAckTwo}
                    onChange={(e) => setLeaveAckTwo(e.target.checked)}
                  />
                  Yes, I want to leave this pod now.
                </label>
                <div className="pset-leave-actions">
                  <button type="button" className="podwiz__btn podwiz__btn--ghost" onClick={() => setLeaveStage('confirm_reason')}>
                    Back
                  </button>
                  <button
                    type="button"
                    className="podwiz__btn pset-leave-confirm-btn"
                    onClick={handleLeavePod}
                    disabled={leavingPod || !leaveAckTwo}
                  >
                    {leavingPod ? 'Leaving…' : 'Confirm leave'}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="pset-block pset-block--danger" aria-labelledby="pset-close">
            <h3 id="pset-close" className="pset-block__title">
              Close Pod (Archive)
            </h3>
            <p className="pset-block__text">
              For finished groups (for example, a completed trip). This keeps data for future reference,
              but blocks new bills and active pod actions.
            </p>
            <label className="podwiz__field">
              <span>Reason (optional)</span>
              <textarea
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Trip completed and all expenses are settled."
                disabled={!isViewerAdmin || closingPod}
              />
            </label>
            <label className="pset-leave-check">
              <input
                type="checkbox"
                checked={closeConfirm}
                onChange={(e) => setCloseConfirm(e.target.checked)}
                disabled={!isViewerAdmin || closingPod}
              />
              I confirm all outstanding balances are settled and I want to archive this pod.
            </label>
            <button
              type="button"
              className="podwiz__btn pset-leave-confirm-btn"
              onClick={handleClosePod}
              disabled={!isViewerAdmin || closingPod || !closeConfirm}
            >
              {closingPod ? 'Closing…' : 'Close pod now'}
            </button>
          </section>

          <p className="pset-foot">Currency for this Pod: {currency}</p>
        </div>
      </div>
    </div>
  )
}
