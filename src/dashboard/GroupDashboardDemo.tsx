import { useMemo, useState } from 'react'
import {
  DEMO_CATEGORIES,
  DEMO_CURRENCY,
  DEMO_MEMBER_LABEL,
  DEMO_NET_BALANCES,
  DEMO_PEOPLE,
  DEMO_TOTAL_SPENDING,
  DEMO_TOTAL_YOU_OWE,
  DEMO_TRANSACTIONS,
  DEMO_VIEWER_NAME,
  type DummyCategory,
} from '../demo/groupDashboardDummyData'
import { formatMoney } from '../lib/format'
import { minimizeTransfers, type Transfer } from '../lib/settlement'
import { AddExpenseDemoModal } from './AddExpenseDemoModal'
import { PodSettingsDemoModal } from './PodSettingsDemoModal'
import './GroupDashboardDemo.css'

export type GroupDashboardDemoProps = {
  podName?: string
  inviteCode?: string
}

function transferKey(t: Transfer): string {
  return `${t.from}|${t.to}|${t.amount}`
}

export function GroupDashboardDemo({
  podName = 'Kingship Apartment',
  inviteCode = 'HSE-A4J9',
}: GroupDashboardDemoProps) {
  const [openAdd, setOpenAdd] = useState(false)
  const [openSettings, setOpenSettings] = useState(false)
  const [openCatId, setOpenCatId] = useState<string | null>(
    DEMO_CATEGORIES[1]?.category_id ?? null,
  )
  const [openPersonId, setOpenPersonId] = useState<string | null>(null)
  const [txFilter, setTxFilter] = useState<'all' | 'expense' | 'payment'>('all')
  const [paidTransfers, setPaidTransfers] = useState<Record<string, boolean>>({})

  const settlementPlan = useMemo(
    () => minimizeTransfers(DEMO_NET_BALANCES),
    [],
  )

  const filteredTx = useMemo(() => {
    if (txFilter === 'all') return DEMO_TRANSACTIONS
    return DEMO_TRANSACTIONS.filter((t) => t.kind === txFilter)
  }, [txFilter])

  function togglePaid(t: Transfer) {
    const k = transferKey(t)
    setPaidTransfers((p) => ({ ...p, [k]: !p[k] }))
  }

  function scrollToSettle() {
    document.getElementById('gdemo-settle')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="gdemo">
      <div className="gdemo__banner">
        <span className="gdemo__banner-dot" aria-hidden />
        Preview · balances, history, settle-up, settings
      </div>

      <nav className="gdemo__toolbar" aria-label="Pod actions">
        <h2 className="gdemo__h2">Group overview</h2>
        <div className="gdemo__toolbar-btns">
          <button
            type="button"
            className="podwiz__btn podwiz__btn--ghost"
            onClick={() => setOpenSettings(true)}
          >
            Pod settings
          </button>
          <button type="button" className="podwiz__btn podwiz__btn--ghost" onClick={scrollToSettle}>
            Settle up
          </button>
          <button
            type="button"
            className="podwiz__btn podwiz__btn--primary"
            onClick={() => setOpenAdd(true)}
          >
            Add expense
          </button>
        </div>
      </nav>

      <section className="gdemo__loop" aria-labelledby="loop-title">
        <h3 id="loop-title" className="gdemo__loop-title">
          How you’ll use Smart Expense
        </h3>
        <ol className="gdemo__loop-list">
          <li>Add expenses as you go</li>
          <li>Everything lands in categories automatically</li>
          <li>Balances update as soon as you save</li>
          <li>Check the dashboard anytime</li>
          <li>End of month → Settle up with fewer payments</li>
        </ol>
      </section>

      <div className="gdemo__grid">
        <div className="gdemo__col gdemo__col--main">
          <section className="gdemo__card" aria-labelledby="ov-total">
            <h3 id="ov-total" className="gdemo__card-title">
              Total group spending
            </h3>
            <p className="gdemo__mega">{formatMoney(DEMO_TOTAL_SPENDING, DEMO_CURRENCY)}</p>
            <p className="gdemo__muted">This month · total</p>
          </section>

          <section className="gdemo__card" aria-labelledby="cat-br">
            <h3 id="cat-br" className="gdemo__card-title">
              Category breakdown
            </h3>
            <p className="gdemo__hint">Click a row to drill into line items</p>
            <ul className="gdemo__cat-list">
              {DEMO_CATEGORIES.map((c) => (
                <li key={c.category_id}>
                  <button
                    type="button"
                    className={`gdemo__cat-row ${openCatId === c.category_id ? 'is-open' : ''}`}
                    onClick={() =>
                      setOpenCatId((id) => (id === c.category_id ? null : c.category_id))
                    }
                  >
                    <span className="gdemo__cat-emoji" aria-hidden>
                      {c.emoji}
                    </span>
                    <span className="gdemo__cat-label">{c.label}</span>
                    <span className="gdemo__cat-amt">{formatMoney(c.total, DEMO_CURRENCY)}</span>
                  </button>
                  {openCatId === c.category_id && (
                    <CategoryDrillDown category={c} />
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="gdemo__col gdemo__col--side">
          <section className="gdemo__card" aria-labelledby="bal-total">
            <h3 id="bal-total" className="gdemo__card-title">
              Your balance
            </h3>
            <p className="gdemo__owe-label">Global · you owe (total)</p>
            <p className="gdemo__owe-total">{formatMoney(DEMO_TOTAL_YOU_OWE, DEMO_CURRENCY)}</p>
            <p className="gdemo__hint gdemo__hint--tight">
              Category balances below — so you see what you owe and why
            </p>
            <ul className="gdemo__bal-cats">
              {DEMO_CATEGORIES.map((c) => (
                <li key={c.category_id} className="gdemo__bal-cat">
                  <span>
                    {c.emoji} {c.label}
                  </span>
                  <span className={c.you_owe > 0 ? 'gdemo__owe-pos' : 'gdemo__owe-zero'}>
                    {c.you_owe > 0
                      ? `${DEMO_VIEWER_NAME} owes ${formatMoney(c.you_owe, DEMO_CURRENCY)}`
                      : 'Even'}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="gdemo__card" aria-labelledby="people-h">
            <h3 id="people-h" className="gdemo__card-title">
              People
            </h3>
            <p className="gdemo__hint">Tap someone for paid / owed detail</p>
            <ul className="gdemo__people">
              {DEMO_PEOPLE.map((p) => (
                <li key={p.person_id}>
                  <button
                    type="button"
                    className={`gdemo__person ${openPersonId === p.person_id ? 'is-open' : ''}`}
                    onClick={() =>
                      setOpenPersonId((id) => (id === p.person_id ? null : p.person_id))
                    }
                  >
                    <span className="gdemo__person-av" aria-hidden>
                      {p.name.slice(0, 1)}
                    </span>
                    {p.name}
                  </button>
                  {openPersonId === p.person_id && <PersonDrillDown person={p} />}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <section className="gdemo__card gdemo__card--wide" aria-labelledby="tx-h">
        <div className="gdemo__tx-head">
          <div>
            <h3 id="tx-h" className="gdemo__card-title">
              Transaction history
            </h3>
            <p className="gdemo__hint gdemo__hint--tight">
              Global activity log — expenses and settlement payments (live sync later)
            </p>
          </div>
          <div className="gdemo__tx-filters" role="group" aria-label="Filter transactions">
            {(['all', 'expense', 'payment'] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={`gdemo__tx-filter ${txFilter === f ? 'is-on' : ''}`}
                onClick={() => setTxFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'expense' ? 'Expenses' : 'Settlements'}
              </button>
            ))}
          </div>
        </div>
        <div className="gdemo__tx-table-wrap">
          <table className="gdemo__tx-table">
            <thead>
              <tr>
                <th>When</th>
                <th>What</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.map((tx) => (
                <tr key={tx.tx_id} className={`gdemo__tx-row--${tx.kind}`}>
                  <td>{tx.date_label}</td>
                  <td>{tx.title}</td>
                  <td>
                    <span className="gdemo__tx-cat">{tx.category}</span>
                  </td>
                  <td className="gdemo__tx-amt">{formatMoney(tx.amount, DEMO_CURRENCY)}</td>
                  <td className="gdemo__tx-actor">{tx.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="gdemo-settle" className="gdemo__card gdemo__card--wide gdemo__settle" aria-labelledby="settle-h">
        <h3 id="settle-h" className="gdemo__card-title">
          Settle up
        </h3>
        <p className="gdemo__settle-lede">
          The system cancels redundant back-and-forth, combines debts, and{' '}
          <strong>minimizes how many payments</strong> it takes for everyone to be even — instead
          of many one-to-one transfers.
        </p>
        <p className="gdemo__settle-meta">
          Plan: <strong>{settlementPlan.length}</strong> payment
          {settlementPlan.length === 1 ? '' : 's'} to settle this Pod’s current balances.
        </p>

        <div className="gdemo__settle-grid">
          <div className="gdemo__settle-balances">
            <p className="gdemo__settle-sub">Net per person</p>
            <ul className="gdemo__settle-bal-list">
              {Object.entries(DEMO_NET_BALANCES).map(([id, b]) => (
                <li key={id}>
                  <span>{DEMO_MEMBER_LABEL[id] ?? id}</span>
                  <span className={b >= 0 ? 'gdemo__net-pos' : 'gdemo__net-neg'}>
                    {b >= 0 ? '+' : ''}
                    {formatMoney(b, DEMO_CURRENCY)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="gdemo__settle-plan">
            <p className="gdemo__settle-sub">Suggested transfers</p>
            {settlementPlan.length === 0 ? (
              <p className="gdemo__muted">Everyone is even — nothing to settle.</p>
            ) : (
              <ul className="gdemo__settle-list">
                {settlementPlan.map((t) => {
                  const k = transferKey(t)
                  const done = paidTransfers[k]
                  return (
                    <li key={k} className={`gdemo__settle-item ${done ? 'is-paid' : ''}`}>
                      <div className="gdemo__settle-row">
                        <span className="gdemo__settle-arrow">
                          <strong>{DEMO_MEMBER_LABEL[t.from] ?? t.from}</strong>
                          <span aria-hidden> → </span>
                          <strong>{DEMO_MEMBER_LABEL[t.to] ?? t.to}</strong>
                        </span>
                        <span className="gdemo__settle-amt">
                          {formatMoney(t.amount, DEMO_CURRENCY)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={`gdemo__mark-paid ${done ? 'is-done' : ''}`}
                        onClick={() => togglePaid(t)}
                      >
                        {done ? 'Marked paid' : 'Mark as paid'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      <AddExpenseDemoModal open={openAdd} onClose={() => setOpenAdd(false)} />
      <PodSettingsDemoModal
        open={openSettings}
        onClose={() => setOpenSettings(false)}
        defaultPodName={podName}
        inviteCode={inviteCode}
      />
    </div>
  )
}

function CategoryDrillDown({ category }: { category: DummyCategory }) {
  return (
    <div className="gdemo__drill gdemo__drill--cat">
      <p className="gdemo__drill-title">
        {category.emoji} {category.label}
      </p>
      <table className="gdemo__table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Amount</th>
            <th>Paid by</th>
            <th>Added by</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {category.expenses.map((ex) => (
            <tr key={ex.expense_id}>
              <td>
                {ex.title}
                {ex.subcategory && (
                  <span className="gdemo__sub"> · {ex.subcategory}</span>
                )}
              </td>
              <td>{formatMoney(ex.amount, DEMO_CURRENCY)}</td>
              <td>{ex.paid_by}</td>
              <td>{ex.added_by}</td>
              <td>{ex.date_label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PersonDrillDown({
  person,
}: {
  person: (typeof DEMO_PEOPLE)[number]
}) {
  return (
    <div className="gdemo__drill gdemo__drill--person">
      <p className="gdemo__drill-kicker">Paid toward</p>
      <ul className="gdemo__mini-list">
        {person.paid_by_category.map((row) => (
          <li key={row.category}>
            {row.category}: {formatMoney(row.amount, DEMO_CURRENCY)}
          </li>
        ))}
      </ul>
      <p className="gdemo__drill-kicker">You → {person.name}</p>
      <ul className="gdemo__mini-list">
        {person.you_owe_by_category.map((row) => (
          <li key={row.category}>
            {row.category}: {formatMoney(row.amount, DEMO_CURRENCY)}
          </li>
        ))}
      </ul>
    </div>
  )
}
