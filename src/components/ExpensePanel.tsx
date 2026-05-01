import { useMemo, useState } from 'react'
import { createId } from '../lib/id'
import { formatMoney } from '../lib/format'
import type { ExpenseItem, Member, SplitMode } from '../types/expense'
import { computeShares } from '../lib/settlement'

type Props = {
  members: Member[]
  expenses: ExpenseItem[]
  currency: string
  onAdd: (expense: ExpenseItem) => void
  onRemove: (id: string) => void
}

export function ExpensePanel({
  members,
  expenses,
  currency,
  onAdd,
  onRemove,
}: Props) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [paidById, setPaidById] = useState(() => members[0]?.id ?? '')
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  const participantIds = useMemo(
    () => members.filter((m) => selected[m.id]).map((m) => m.id),
    [members, selected],
  )

  const [weights, setWeights] = useState<Record<string, string>>({})

  const resolvedPaidById =
    members.find((m) => m.id === paidById)?.id ?? members[0]?.id ?? ''

  const canSubmit =
    members.length > 0 &&
    title.trim().length > 0 &&
    Number(amount) > 0 &&
    !!resolvedPaidById &&
    participantIds.length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const w: Record<string, number> = {}
    for (const id of participantIds) {
      const raw = weights[id]
      const n = raw === undefined || raw === '' ? 1 : Number(raw)
      w[id] = Number.isFinite(n) && n > 0 ? n : 1
    }

    const expense: ExpenseItem = {
      id: createId('e'),
      title: title.trim(),
      amount: round2(Number(amount)),
      splitMode,
      paidById: resolvedPaidById,
      participantIds,
      weights: w,
      date: new Date().toISOString().slice(0, 10),
    }

    onAdd(expense)
    setTitle('')
    setAmount('')
  }

  if (members.length === 0) {
    return (
      <section className="panel" aria-labelledby="expenses-heading">
        <div className="panel__head">
          <div>
            <h2 id="expenses-heading">Expenses</h2>
            <p className="panel__lede">
              Add at least one household member before logging expenses.
            </p>
          </div>
        </div>
        <p className="muted">The expense form will appear here once members exist.</p>
      </section>
    )
  }

  return (
    <section className="panel" aria-labelledby="expenses-heading">
      <div className="panel__head">
        <div>
          <h2 id="expenses-heading">Expenses</h2>
          <p className="panel__lede">
            Log what was paid and how it should be shared.
          </p>
        </div>
      </div>

      <form className="expense-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field">
            <span className="field__label">What was it?</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Rent, utilities, groceries…"
              maxLength={160}
            />
          </label>
          <label className="field">
            <span className="field__label">Amount</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </label>
          <label className="field">
            <span className="field__label">Paid by</span>
            <select
              value={resolvedPaidById}
              onChange={(e) => setPaidById(e.target.value)}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="fieldset">
          <legend className="fieldset__legend">Split method</legend>
          <div className="segmented">
            <label className="segmented__item">
              <input
                type="radio"
                name="split"
                checked={splitMode === 'equal'}
                onChange={() => setSplitMode('equal')}
              />
              Equal
            </label>
            <label className="segmented__item">
              <input
                type="radio"
                name="split"
                checked={splitMode === 'weighted'}
                onChange={() => setSplitMode('weighted')}
              />
              Weighted
            </label>
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset__legend">Split between</legend>
          <div className="checkbox-grid">
            {members.map((m) => (
              <label key={m.id} className="check">
                <input
                  type="checkbox"
                  checked={!!selected[m.id]}
                  onChange={(e) =>
                    setSelected((s) => ({ ...s, [m.id]: e.target.checked }))
                  }
                />
                <span>{m.name}</span>
                {splitMode === 'weighted' && selected[m.id] && (
                  <input
                    className="check__weight"
                    inputMode="decimal"
                    placeholder="weight"
                    value={weights[m.id] ?? ''}
                    onChange={(e) =>
                      setWeights((w) => ({ ...w, [m.id]: e.target.value }))
                    }
                    aria-label={`Weight for ${m.name}`}
                  />
                )}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={!canSubmit}
          >
            Add expense
          </button>
        </div>
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <caption className="sr-only">Recorded expenses</caption>
          <thead>
            <tr>
              <th scope="col">Expense</th>
              <th scope="col">Amount</th>
              <th scope="col">Split</th>
              <th scope="col">Shares</th>
              <th scope="col" />
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-cell">
                  No expenses yet — add your first bill above.
                </td>
              </tr>
            ) : (
              expenses.map((ex) => {
                const shares = computeShares(ex)
                const shareText = Object.entries(shares)
                  .map(([id, amt]) => {
                    const name = members.find((m) => m.id === id)?.name ?? id
                    return `${name}: ${formatMoney(amt, currency)}`
                  })
                  .join(' · ')
                return (
                  <tr key={ex.id}>
                    <td>
                      <div className="cell-title">{ex.title}</div>
                      <div className="cell-meta">
                        Paid by{' '}
                        {members.find((m) => m.id === ex.paidById)?.name ?? '—'}
                      </div>
                    </td>
                    <td>{formatMoney(ex.amount, currency)}</td>
                    <td>
                      <span className="pill">
                        {ex.splitMode === 'equal' ? 'Equal' : 'Weighted'}
                      </span>
                    </td>
                    <td className="shares-cell">{shareText}</td>
                    <td className="actions-cell">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => onRemove(ex.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
