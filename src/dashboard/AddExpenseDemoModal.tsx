import { useCallback, useEffect, useState } from 'react'
import { createExpense } from '../api/client'
import { formatMoney } from '../lib/format'

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  podId: number | null
  inviteCode?: string
  currency: string
  categories: string[]
  members: { id: number; name: string; role: string }[]
}

export function AddExpenseDemoModal({
  open,
  onClose,
  onSaved,
  podId,
  inviteCode,
  currency,
  categories,
  members,
}: Props) {
  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('120')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState(categories[0] ?? 'Other')
  const [subcategory, setSubcategory] = useState('')
  const [split, setSplit] = useState<'equal' | 'percentage'>('equal')
  const [splitScope, setSplitScope] = useState<'all' | 'category_only'>('all')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setStep(1)
    setTitle('')
    setAmount('120')
    setDate(new Date().toISOString().slice(0, 10))
    setCategory(categories[0] ?? 'Other')
    setSubcategory('')
    setSplit('equal')
    setSplitScope('all')
    setIsSaving(false)
    setSaveError(null)
  }, [categories])

  const close = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [close, open])

  if (!open) return null

  const amountNumber = Number(amount)
  const canContinueStep1 =
    title.trim().length > 0 && Number.isFinite(amountNumber) && amountNumber > 0

  async function confirmSave() {
    if (!podId) {
      setSaveError('Pod is not ready yet. Please try again.')
      return
    }
    setSaveError(null)
    setIsSaving(true)
    try {
      await createExpense({
        podId,
        inviteCode,
        title: title.trim(),
        amount: amountNumber,
        category,
        subcategory: subcategory.trim() || undefined,
        splitMode: split,
        splitScope,
        expenseDate: date,
      })
      onSaved()
      setStep(5)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Could not save expense.'
      setSaveError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="addexp-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="addexp-title"
      aria-describedby="addexp-step"
    >
      <div className="addexp-modal__backdrop" onClick={close} aria-hidden />
      <div className="addexp-modal__card">
        <div className="addexp-modal__head">
          <h2 id="addexp-title">Add bill</h2>
          <p id="addexp-step" className="addexp-modal__step" aria-live="polite">
            Step {step} of 5 · {members.length} member
            {members.length === 1 ? '' : 's'}
          </p>
          <button
            type="button"
            className="addexp-modal__x"
            onClick={close}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {step === 1 && (
          <div className="addexp-modal__body">
            <label className="podwiz__field">
              <span>Bill title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Electricity bill"
                autoFocus
              />
            </label>
            <label className="podwiz__field">
              <span>Amount ({currency})</span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="podwiz__field">
              <span>Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="podwiz__btn podwiz__btn--primary"
              disabled={!canContinueStep1}
              onClick={() => setStep(2)}
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="addexp-modal__body">
            <label className="podwiz__field">
              <span>Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="podwiz__field">
              <span>Subcategory (optional)</span>
              <input
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                placeholder="Electricity / Water / Gas..."
              />
            </label>
            <div className="addexp-modal__nav">
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
                onClick={() => setStep(3)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="addexp-modal__body">
            <p id="split-help" className="addexp-modal__hint">
              How should this bill be split?
            </p>
            <fieldset className="segmented addexp-seg" aria-describedby="split-help">
              <legend className="sr-only">Split method</legend>
              <label className="segmented__item">
                <input
                  type="radio"
                  name="split"
                  checked={split === 'equal'}
                  onChange={() => setSplit('equal')}
                />
                Equal
              </label>
              <label className="segmented__item">
                <input
                  type="radio"
                  name="split"
                  checked={split === 'percentage'}
                  onChange={() => setSplit('percentage')}
                />
                Percentage
              </label>
            </fieldset>
            <p id="scope-help" className="addexp-modal__hint">
              Should this split rule apply to all categories or only this category?
            </p>
            <fieldset className="segmented addexp-seg" aria-describedby="scope-help">
              <legend className="sr-only">Split scope</legend>
              <label className="segmented__item">
                <input
                  type="radio"
                  name="split-scope"
                  checked={splitScope === 'all'}
                  onChange={() => setSplitScope('all')}
                />
                All categories
              </label>
              <label className="segmented__item">
                <input
                  type="radio"
                  name="split-scope"
                  checked={splitScope === 'category_only'}
                  onChange={() => setSplitScope('category_only')}
                />
                This category only
              </label>
            </fieldset>
            <div className="addexp-modal__nav">
              <button
                type="button"
                className="podwiz__btn podwiz__btn--ghost"
                onClick={() => setStep(2)}
              >
                Back
              </button>
              <button
                type="button"
                className="podwiz__btn podwiz__btn--primary"
                onClick={() => setStep(4)}
              >
                Review
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="addexp-modal__body">
            <p className="addexp-modal__hint">Review before confirming</p>
            <ul className="addexp-modal__confirm">
              <li>
                <strong>Title:</strong> {title.trim()}
              </li>
              <li>
                <strong>Amount:</strong> {formatMoney(amountNumber || 0, currency)}
              </li>
              <li>
                <strong>Category:</strong> {category}
                {subcategory.trim() ? ` · ${subcategory.trim()}` : ''}
              </li>
              <li>
                <strong>Split:</strong>{' '}
                {split === 'equal' ? 'Equal split' : 'Percentage split'}
              </li>
              <li>
                <strong>Rule scope:</strong>{' '}
                {splitScope === 'all' ? 'All categories' : `Only ${category}`}
              </li>
              <li>
                <strong>Date:</strong> {date}
              </li>
            </ul>
            {saveError && (
              <p className="home__auth-error" role="alert">
                {saveError}
              </p>
            )}
            <div className="addexp-modal__nav">
              <button
                type="button"
                className="podwiz__btn podwiz__btn--ghost"
                onClick={() => setStep(3)}
                disabled={isSaving}
              >
                Back
              </button>
              <button
                type="button"
                className="podwiz__btn podwiz__btn--primary"
                onClick={confirmSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Confirm bill'}
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="addexp-modal__body">
            <p className="addexp-modal__done">Bill saved</p>
            <ul className="addexp-modal__confirm">
              <li>
                <strong>{title.trim() || 'New bill'}</strong> ·{' '}
                {formatMoney(Number(amount) || 0, currency)}
              </li>
              <li>Balances and transaction history are now refreshed for this pod.</li>
              <li>All members will see this update on their side.</li>
            </ul>
            <button
              type="button"
              className="podwiz__btn podwiz__btn--primary"
              onClick={close}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
