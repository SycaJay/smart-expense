import { useId, useMemo, useState } from 'react'
import {
  type DefaultSplitMethod,
  type PodTypeId,
  getPreset,
  POD_TYPE_PRESETS,
} from '../data/podPresets'
import { createId } from '../lib/id'
import { generatePodCode } from './podCode'

export type EditableCategory = {
  id: string
  label: string
  showOnDashboard: boolean
}

export type CreatedPodPayload = {
  podName: string
  podType: PodTypeId
  memberCount: number
  defaultSplit: DefaultSplitMethod
  categories: EditableCategory[]
  code: string
}

type Props = {
  onCancel: () => void
  onComplete: (payload: CreatedPodPayload) => void
}

function cloneCategoriesFromPreset(type: PodTypeId): EditableCategory[] {
  const p = getPreset(type)
  return p.categories.map((c) => ({
    id: c.id,
    label: c.label,
    showOnDashboard: c.dashboardDefault,
  }))
}

export function CreatePodWizard({ onCancel, onComplete }: Props) {
  const baseId = useId()
  const [step, setStep] = useState(0)
  const [podType, setPodType] = useState<PodTypeId>('shared_residence')
  const [podName, setPodName] = useState('')
  const [memberCount, setMemberCount] = useState(4)
  const [categories, setCategories] = useState<EditableCategory[]>(() =>
    cloneCategoriesFromPreset('shared_residence'),
  )
  const [defaultSplit, setDefaultSplit] = useState<DefaultSplitMethod>('equal')
  const [customizeOpen, setCustomizeOpen] = useState(false)

  const preset = useMemo(() => getPreset(podType), [podType])

  const equalSharePct = useMemo(() => {
    if (memberCount < 1) return 0
    return Math.round((10000 / memberCount)) / 100
  }, [memberCount])

  function applyPodType(next: PodTypeId) {
    setPodType(next)
    setCategories(cloneCategoriesFromPreset(next))
    const p = getPreset(next)
    setDefaultSplit(p.suggestedSplit)
  }

  function updateCategory(id: string, patch: Partial<EditableCategory>) {
    setCategories((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    )
  }

  function removeCategory(id: string) {
    setCategories((rows) => rows.filter((r) => r.id !== id))
  }

  function addCategory() {
    setCategories((rows) => [
      ...rows,
      {
        id: createId('cat'),
        label: 'New category',
        showOnDashboard: true,
      },
    ])
  }

  function canAdvanceFromStep0() {
    return true
  }

  function canAdvanceFromStep1() {
    return podName.trim().length >= 2 && memberCount >= 2 && memberCount <= 24
  }

  function finish() {
    const code = generatePodCode()
    onComplete({
      podName: podName.trim(),
      podType,
      memberCount,
      defaultSplit,
      categories: categories.map((c) => ({ ...c })),
      code,
    })
  }

  const stepTitles = ['Pod type', 'Name & people', 'Defaults & customize']

  return (
    <div className="podwiz">
      <div className="podwiz__top">
        <button type="button" className="podwiz__back" onClick={onCancel}>
          ← Back
        </button>
        <div className="podwiz__progress" aria-hidden>
          {stepTitles.map((t, i) => (
            <span
              key={t}
              className={`podwiz__dot ${i === step ? 'is-active' : ''} ${i < step ? 'is-done' : ''}`}
            />
          ))}
        </div>
        <span className="podwiz__step-label">
          Step {step + 1} of 3 · {stepTitles[step]}
        </span>
      </div>

      {step === 0 && (
        <div className="podwiz__panel podwiz__panel--enter">
          <header className="podwiz__head">
            <p className="podwiz__eyebrow">Create a Pod</p>
            <h2 className="podwiz__title">What is this Pod for?</h2>
            <p className="podwiz__lede">
              Pick a template — each one ships with smart defaults (categories,
              split suggestions, and dashboard layout). You can fine-tune
              everything on the next steps.
            </p>
          </header>

          <div className="podwiz__type-grid" role="list">
            {POD_TYPE_PRESETS.map((p) => {
              const selected = podType === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  role="listitem"
                  className={`podwiz__type-card ${selected ? 'is-selected' : ''}`}
                  onClick={() => applyPodType(p.id)}
                >
                  {p.isDefault && (
                    <span className="podwiz__badge">Default</span>
                  )}
                  <span className="podwiz__type-emoji" aria-hidden>
                    {p.emoji}
                  </span>
                  <span className="podwiz__type-title">{p.title}</span>
                  <span className="podwiz__type-tag">{p.tagline}</span>
                  <span className="podwiz__type-detail">{p.detail}</span>
                </button>
              )
            })}
          </div>

          <div className="podwiz__nav">
            <button
              type="button"
              className="podwiz__btn podwiz__btn--primary"
              disabled={!canAdvanceFromStep0()}
              onClick={() => setStep(1)}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="podwiz__panel podwiz__panel--enter">
          <header className="podwiz__head">
            <p className="podwiz__eyebrow">Name &amp; crew size</p>
            <h2 className="podwiz__title">Give your Pod a name</h2>
            <p className="podwiz__lede">
              This is how everyone will recognize the space — apartment name,
              trip name, or anything your group agrees on.
            </p>
          </header>

          <div className="podwiz__fields">
            <label className="podwiz__field">
              <span>What should we call this Pod?</span>
              <input
                value={podName}
                onChange={(e) => setPodName(e.target.value)}
                placeholder='e.g. "Kingship Apartment" · "Japan 2026"'
                autoComplete="off"
                maxLength={120}
                aria-describedby={`${baseId}-name-hint`}
              />
              <span id={`${baseId}-name-hint`} className="podwiz__hint">
                Use something everyone in the group will recognize instantly.
              </span>
            </label>

            <div className="podwiz__field">
              <span id={`${baseId}-count-label`}>How many people are in this Pod?</span>
              <div className="podwiz__stepper" role="group" aria-labelledby={`${baseId}-count-label`}>
                <button
                  type="button"
                  className="podwiz__stepper-btn"
                  onClick={() => setMemberCount((n) => Math.max(2, n - 1))}
                  aria-label="Decrease people"
                >
                  −
                </button>
                <output className="podwiz__stepper-out">{memberCount}</output>
                <button
                  type="button"
                  className="podwiz__stepper-btn"
                  onClick={() => setMemberCount((n) => Math.min(24, n + 1))}
                  aria-label="Increase people"
                >
                  +
                </button>
              </div>
              <p className="podwiz__split-explainer">
                <strong>Starting split: equal.</strong> With{' '}
                <strong>{memberCount}</strong> people, each person’s share
                begins around <strong>{equalSharePct}%</strong> of any expense
                split across the whole Pod — before you adjust per bill.
                You’ll be able to change weights per expense anytime.
              </p>
            </div>
          </div>

          <aside className="podwiz__callout podwiz__callout--soft">
            <span className="podwiz__callout-icon" aria-hidden>
              ✓
            </span>
            <div>
              <p className="podwiz__callout-title">Everyone approves the house rules</p>
              <p className="podwiz__callout-text">
                When you set or update shared defaults (like category weights or
                Pod-wide rules), every member gets a clear summary — and can
                confirm so nobody is surprised. Individual expenses stay fast to
                add; big changes stay transparent.
              </p>
            </div>
          </aside>

          <div className="podwiz__nav">
            <button
              type="button"
              className="podwiz__btn podwiz__btn--ghost"
              onClick={() => setStep(0)}
            >
              Back
            </button>
            <button
              type="button"
              className="podwiz__btn podwiz__btn--primary"
              disabled={!canAdvanceFromStep1()}
              onClick={() => setStep(2)}
            >
              Review defaults
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="podwiz__panel podwiz__panel--enter">
          <header className="podwiz__head">
            <p className="podwiz__eyebrow">Defaults for “{preset.title}”</p>
            <h2 className="podwiz__title">Tune categories &amp; dashboard</h2>
            <p className="podwiz__lede">{preset.layoutNote}</p>
          </header>

          <div className="podwiz__summary-card">
            <div>
              <span className="podwiz__summary-emoji" aria-hidden>
                {preset.emoji}
              </span>
              <div>
                <p className="podwiz__summary-name">{podName.trim() || 'Your Pod'}</p>
                <p className="podwiz__summary-meta">
                  {memberCount} people · default split{' '}
                  <strong>
                    {defaultSplit === 'equal' ? 'Equal' : 'Weighted'}
                  </strong>
                </p>
              </div>
            </div>
          </div>

          <label className="podwiz__field podwiz__field--inline">
            <span>Default split method for new expenses</span>
            <select
              value={defaultSplit}
              onChange={(e) =>
                setDefaultSplit(e.target.value as DefaultSplitMethod)
              }
            >
              <option value="equal">Equal (recommended to start)</option>
              <option value="weighted">Weighted (custom shares)</option>
            </select>
          </label>

          <section className="podwiz__preset-cats" aria-label="Suggested categories">
            <h3 className="podwiz__subhead">Pre-configured categories</h3>
            <p className="podwiz__micro">
              These power your category breakdown and quick-add flows. Toggle
              visibility on the main Pod dashboard per row.
            </p>
            <ul className="podwiz__chip-list">
              {categories.map((c) => (
                <li key={c.id} className="podwiz__chip-row">
                  <label className="podwiz__chip-check">
                    <input
                      type="checkbox"
                      checked={c.showOnDashboard}
                      onChange={(e) =>
                        updateCategory(c.id, {
                          showOnDashboard: e.target.checked,
                        })
                      }
                    />
                    <span className="sr-only">Show {c.label} on dashboard</span>
                  </label>
                  <input
                    className="podwiz__chip-input"
                    value={c.label}
                    onChange={(e) =>
                      updateCategory(c.id, { label: e.target.value })
                    }
                    aria-label="Category name"
                  />
                  <button
                    type="button"
                    className="podwiz__chip-remove"
                    onClick={() => removeCategory(c.id)}
                    aria-label={`Remove ${c.label}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="podwiz__linkish" onClick={addCategory}>
              + Add custom category
            </button>
          </section>

          <button
            type="button"
            className={`podwiz__custom-toggle ${customizeOpen ? 'is-open' : ''}`}
            onClick={() => setCustomizeOpen((o) => !o)}
            aria-expanded={customizeOpen}
          >
            <span>Customize your Pod</span>
            <span className="podwiz__chev" aria-hidden>
              ▾
            </span>
          </button>

          {customizeOpen && (
            <div className="podwiz__custom-panel podwiz__panel--sub">
              <p className="podwiz__micro">
                Rename anything, drop what you won’t use, and add custom expense
                types. Dashboard toggles control what appears in your Pod
                overview — you can still log expenses in hidden categories from
                the full list.
              </p>
              <ul className="podwiz__checklist">
                <li>Add or remove categories to match how your group talks about money.</li>
                <li>Rename labels anytime — old expenses keep their history.</li>
                <li>
                  Switch default split method for new expenses (equal vs weighted).
                </li>
                <li>
                  Choose which categories surface on the dashboard for at-a-glance totals.
                </li>
              </ul>
            </div>
          )}

          <div className="podwiz__nav">
            <button
              type="button"
              className="podwiz__btn podwiz__btn--ghost"
              onClick={() => setStep(1)}
            >
              Back
            </button>
            <button
              type="button"
              className="podwiz__btn podwiz__btn--primary"
              onClick={finish}
            >
              Create Pod &amp; open home
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
