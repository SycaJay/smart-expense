import { useState } from 'react'
import { DEMO_CURRENCY } from '../demo/groupDashboardDummyData'
import { formatMoney } from '../lib/format'

type Props = {
  open: boolean
  onClose: () => void
}

const CATS = ['Rent', 'Utilities', 'Transport', 'Food', 'Internet', 'Other']
const PEOPLE = ['You', 'Kwame', 'Ama', 'Sam']

export function AddExpenseDemoModal({ open, onClose }: Props) {
  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('120')
  const [paidBy, setPaidBy] = useState('You')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState('Utilities')
  const [subcategory, setSubcategory] = useState('Electricity')
  const [split, setSplit] = useState<'equal' | 'weighted'>('equal')

  if (!open) return null

  function reset() {
    setStep(1)
    setTitle('')
    setAmount('120')
    setPaidBy('You')
    setDate(new Date().toISOString().slice(0, 10))
    setCategory('Utilities')
    setSubcategory('Electricity')
    setSplit('equal')
  }

  function close() {
    reset()
    onClose()
  }

  function runProcessing() {
    setStep(4)
    window.setTimeout(() => setStep(5), 600)
  }

  return (
    <div className="addexp-modal" role="dialog" aria-modal="true" aria-labelledby="addexp-title">
      <div className="addexp-modal__backdrop" onClick={close} aria-hidden />
      <div className="addexp-modal__card">
        <div className="addexp-modal__head">
          <h2 id="addexp-title">Add expense</h2>
          <p className="addexp-modal__step">Step {step} of 5</p>
          <button type="button" className="addexp-modal__x" onClick={close} aria-label="Close">
            ×
          </button>
        </div>

        {step === 1 && (
          <div className="addexp-modal__body">
            <label className="podwiz__field">
              <span>Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Electricity bill"
              />
            </label>
            <label className="podwiz__field">
              <span>Amount ({DEMO_CURRENCY})</span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="podwiz__field">
              <span>Who paid</span>
              <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
                {PEOPLE.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
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
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATS.map((c) => (
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
                placeholder="Electricity / Water / Gas…"
              />
            </label>
            <div className="addexp-modal__nav">
              <button type="button" className="podwiz__btn podwiz__btn--ghost" onClick={() => setStep(1)}>
                Back
              </button>
              <button type="button" className="podwiz__btn podwiz__btn--primary" onClick={() => setStep(3)}>
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="addexp-modal__body">
            <p className="addexp-modal__hint">How should this expense be split?</p>
            <div className="segmented addexp-seg">
              <label className="segmented__item">
                <input
                  type="radio"
                  name="split"
                  checked={split === 'equal'}
                  onChange={() => setSplit('equal')}
                />
                Equal split
              </label>
              <label className="segmented__item">
                <input
                  type="radio"
                  name="split"
                  checked={split === 'weighted'}
                  onChange={() => setSplit('weighted')}
                />
                Weighted split
              </label>
            </div>
            <div className="addexp-modal__nav">
              <button type="button" className="podwiz__btn podwiz__btn--ghost" onClick={() => setStep(2)}>
                Back
              </button>
              <button type="button" className="podwiz__btn podwiz__btn--primary" onClick={runProcessing}>
                Save &amp; split
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="addexp-modal__body addexp-modal__center">
            <p className="addexp-modal__processing">Calculating shares &amp; updating balances…</p>
          </div>
        )}

        {step === 5 && (
          <div className="addexp-modal__body">
            <p className="addexp-modal__done">Expense saved</p>
            <ul className="addexp-modal__confirm">
              <li>
                <strong>{title.trim() || 'New expense'}</strong> ·{' '}
                {formatMoney(Number(amount) || 0, DEMO_CURRENCY)}
              </li>
              <li>Everyone’s category balances would refresh here.</li>
              <li>
                Example: You might owe{' '}
                {formatMoney(Math.min(40, Number(amount) || 0) / 4, DEMO_CURRENCY)} more in{' '}
                {category} until settlement.
              </li>
            </ul>
            <button type="button" className="podwiz__btn podwiz__btn--primary" onClick={close}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
