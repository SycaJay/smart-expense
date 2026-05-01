import { useState } from 'react'
import { DEMO_CURRENCY } from '../demo/groupDashboardDummyData'

type Props = {
  open: boolean
  onClose: () => void
  defaultPodName: string
  inviteCode: string
}

const DEMO_MEMBERS = ['You (admin)', 'Kwame', 'Ama', 'Sam']

export function PodSettingsDemoModal({
  open,
  onClose,
  defaultPodName,
  inviteCode,
}: Props) {
  const [podName, setPodName] = useState(defaultPodName)
  const [defaultSplit, setDefaultSplit] = useState<'equal' | 'weighted'>('equal')
  const [leaveConfirm, setLeaveConfirm] = useState(false)

  if (!open) return null

  return (
    <div className="pset-modal" role="dialog" aria-modal="true" aria-labelledby="pset-title">
      <div className="pset-modal__backdrop" onClick={onClose} />
      <div className="pset-modal__card">
        <div className="pset-modal__head">
          <h2 id="pset-title">Pod settings</h2>
          <p className="pset-modal__sub">Changes stay in this browser session only</p>
          <button type="button" className="addexp-modal__x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="pset-modal__body">
          <label className="podwiz__field">
            <span>Group / Pod name</span>
            <input value={podName} onChange={(e) => setPodName(e.target.value)} maxLength={120} />
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
              Your active invite code (same as Pod home). Regenerate will be available when the
              backend is connected.
            </p>
            <code className="pset-code">{inviteCode}</code>
          </section>

          <section className="pset-block" aria-labelledby="pset-mem">
            <h3 id="pset-mem" className="pset-block__title">
              Members
            </h3>
            <ul className="pset-members">
              {DEMO_MEMBERS.map((m) => (
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

          <p className="pset-foot">Currency for this Pod: {DEMO_CURRENCY}</p>
        </div>
      </div>
    </div>
  )
}
