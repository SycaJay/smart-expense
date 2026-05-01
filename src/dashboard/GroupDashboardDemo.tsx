import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  confirmPodSplitPolicy,
  deleteExpense,
  fetchPodDashboard,
  fetchWeeklyReport,
  notifyPayment,
  downloadReport,
  type DashboardCategory,
  type DashboardPerson,
} from '../api/client'
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

const EMPTY_CATEGORIES: DashboardCategory[] = []
const EMPTY_PEOPLE: DashboardPerson[] = []
const EMPTY_TRANSACTIONS: {
  tx_id: string
  date_label: string
  title: string
  category: string
  amount: number
  actor: string
  kind: 'expense' | 'payment'
}[] = []
const EMPTY_NET_BALANCES: Record<string, number> = {}
const EMPTY_MEMBER_LABEL: Record<string, string> = {}
const EMPTY_MEMBERS: { id: number; name: string; role: 'admin' | 'member' | string }[] = []
const EMPTY_WEEKLY_DAYS: { date: string; label: string; spent: number; bills: number; settled: number }[] = []

export function GroupDashboardDemo({
  podName = 'Kingship Apartment',
  inviteCode = 'HSE-A4J9',
}: GroupDashboardDemoProps) {
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<Awaited<
    ReturnType<typeof fetchPodDashboard>
  > | null>(null)
  const [openAdd, setOpenAdd] = useState(false)
  const [openSettings, setOpenSettings] = useState(false)
  const [editExpense, setEditExpense] = useState<{
    expenseId: number
    title: string
    amount: number
    category: string
    subcategory?: string
    splitMode: 'equal' | 'percentage'
    splitScope: 'all' | 'category_only'
    expenseDate: string
    participantIds: number[]
    participantWeights: Record<string, number>
  } | null>(null)
  const [openCatId, setOpenCatId] = useState<string | null>(null)
  const [openPersonId, setOpenPersonId] = useState<string | null>(null)
  const [txFilter, setTxFilter] = useState<'all' | 'expense' | 'payment'>('all')
  const [paidTransfers, setPaidTransfers] = useState<Record<string, boolean>>({})
  const [weeklyReport, setWeeklyReport] = useState<Awaited<ReturnType<typeof fetchWeeklyReport>> | null>(null)

  const loadDashboard = useCallback(async (cancelledRef?: { cancelled: boolean }) => {
    return fetchPodDashboard(inviteCode)
      .then((data) => {
        if (cancelledRef?.cancelled) return
        setDashboardData(data)
        setLoadError(null)
        const firstCategory = data?.categories?.[0]?.category_id ?? null
        setOpenCatId(firstCategory)
        return fetchWeeklyReport(data?.pod?.podId, data?.pod?.inviteCode)
          .then((weekly) => {
            if (cancelledRef?.cancelled) return
            setWeeklyReport(weekly)
          })
          .catch(() => {
            if (cancelledRef?.cancelled) return
            setWeeklyReport(null)
          })
      })
      .catch((err: unknown) => {
        if (cancelledRef?.cancelled) return
        const message =
          err instanceof Error ? err.message : 'Could not load pod dashboard.'
        setLoadError(message)
        if (!cancelledRef?.cancelled) {
          setDashboardData(null)
        }
      })
  }, [inviteCode])

  useEffect(() => {
    const cancelledRef = { cancelled: false }
    void loadDashboard(cancelledRef)

    const poll = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void loadDashboard(cancelledRef)
    }, 8000)

    return () => {
      cancelledRef.cancelled = true
      window.clearInterval(poll)
    }
  }, [loadDashboard])

  const loading = dashboardData === null && loadError === null
  const categories = dashboardData?.categories ?? EMPTY_CATEGORIES
  const currency = dashboardData?.pod?.currency ?? 'GHS'
  const viewerName = dashboardData?.viewerName ?? 'You'
  const viewerId = dashboardData?.viewerId ?? null
  const people = dashboardData?.people ?? EMPTY_PEOPLE
  const transactions = dashboardData?.transactions ?? EMPTY_TRANSACTIONS
  const netBalances = dashboardData?.netBalances ?? EMPTY_NET_BALANCES
  const memberLabel = dashboardData?.memberLabel ?? EMPTY_MEMBER_LABEL
  const totals = dashboardData?.totals ?? { spending: 0, youOwe: 0 }
  const members = dashboardData?.members ?? EMPTY_MEMBERS
  const viewerRole = members.find((m) => m.id === viewerId)?.role ?? 'member'
  const isViewerAdmin = viewerRole === 'admin'
  const defaultSplitMethod = dashboardData?.pod?.defaultSplitMethod ?? 'equal'
  const isArchived = dashboardData?.pod?.isArchived ?? false
  const adminNotice = dashboardData?.adminNotice ?? null
  const weeklySummary = weeklyReport?.summary ?? { totalSpent: 0, totalBills: 0, totalSettled: 0 }
  const weeklyDays = weeklyReport?.days ?? EMPTY_WEEKLY_DAYS
  const categoryLabels = categories.map((c) => c.label)

  const settlementPlan = useMemo(
    () => minimizeTransfers(netBalances),
    [netBalances],
  )

  const filteredTx = useMemo(() => {
    if (txFilter === 'all') return transactions
    return transactions.filter((t) => t.kind === txFilter)
  }, [transactions, txFilter])

  async function togglePaid(t: Transfer) {
    if (!isViewerAdmin) {
      setLoadError('Only pod admins can confirm external payments.')
      return
    }
    const k = transferKey(t)
    const wasPaid = Boolean(paidTransfers[k])
    setPaidTransfers((p) => ({ ...p, [k]: !p[k] }))
    if (wasPaid) return

    const podId = dashboardData?.pod?.podId ?? null
    if (!podId) return

    const receiverUserId = Number(t.to)
    if (!Number.isFinite(receiverUserId)) return

    try {
      await notifyPayment({
        podId,
        payerUserId: Number(t.from),
        receiverUserId,
        amount: t.amount,
        currency,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment email notification failed.'
      setLoadError(message)
    }
  }

  async function handleSplitPolicyConfirm(policy: 'equal' | 'keep_previous') {
    const podId = dashboardData?.pod?.podId
    const noticeId = adminNotice?.noticeId
    if (!podId || !noticeId) return
    try {
      await confirmPodSplitPolicy({ podId, noticeId, policy })
      await loadDashboard()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not confirm split policy.'
      setLoadError(message)
    }
  }

  function scrollToSettle() {
    document.getElementById('gdemo-settle')?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleDeleteExpense(expenseId: string) {
    const ok = window.confirm('Delete this expense? This cannot be undone.')
    if (!ok) return
    try {
      await deleteExpense(Number(expenseId))
      await loadDashboard()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not delete expense.'
      setLoadError(message)
    }
  }

  function handleEditExpense(expense: DashboardCategory['expenses'][number], categoryLabel: string) {
    const participantIds = expense.participant_ids && expense.participant_ids.length > 0
      ? expense.participant_ids
      : members.map((m) => m.id)
    const participantWeights = expense.participant_weights && Object.keys(expense.participant_weights).length > 0
      ? expense.participant_weights
      : Object.fromEntries(
          members.map((m) => [String(m.id), Number((100 / Math.max(1, members.length)).toFixed(2))]),
        )
    setEditExpense({
      expenseId: Number(expense.expense_id),
      title: expense.title,
      amount: expense.amount,
      category: categoryLabel,
      subcategory: expense.subcategory,
      splitMode: expense.split_mode ?? 'equal',
      splitScope: expense.split_scope ?? 'all',
      expenseDate: expense.date_label.slice(0, 10),
      participantIds,
      participantWeights,
    })
    setOpenAdd(true)
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
            onClick={() => {
              setEditExpense(null)
              setOpenAdd(true)
            }}
            disabled={isArchived}
          >
            Add expense
          </button>
        </div>
      </nav>

      {isArchived && (
        <section className="gdemo__card gdemo__card--wide" aria-live="polite">
          <h3 className="gdemo__card-title">Pod archived</h3>
          <p className="gdemo__hint">
            This pod is closed and kept for records. New bills, invites, and payment updates are disabled.
          </p>
        </section>
      )}

      {loading && <p className="gdemo__muted">Loading dashboard data...</p>}
      {loadError && (
        <p className="home__auth-error" role="alert">
          {loadError}
        </p>
      )}
      {!loading && !loadError && categories.length === 0 && (
        <p className="gdemo__muted">
          No expenses yet. Add your first bill to populate this dashboard.
        </p>
      )}

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

      <section className="gdemo__card gdemo__card--wide" aria-labelledby="weekly-report-title">
        <div className="gdemo__tx-head">
          <div>
            <h3 id="weekly-report-title" className="gdemo__card-title">Weekly report</h3>
            <p className="gdemo__hint gdemo__hint--tight">Your 7-day spending and settlement snapshot.</p>
          </div>
          <div className="gdemo__tx-filters">
            <button
              type="button"
              className="gdemo__tx-filter"
              onClick={() => downloadReport('monthly', 'csv', dashboardData?.pod?.podId ?? undefined, dashboardData?.pod?.inviteCode)}
            >
              Monthly CSV
            </button>
            <button
              type="button"
              className="gdemo__tx-filter"
              onClick={() => downloadReport('category', 'csv', dashboardData?.pod?.podId ?? undefined, dashboardData?.pod?.inviteCode)}
            >
              Category CSV
            </button>
            <button
              type="button"
              className="gdemo__tx-filter"
              onClick={() => downloadReport('settlement', 'csv', dashboardData?.pod?.podId ?? undefined, dashboardData?.pod?.inviteCode)}
            >
              Settlement CSV
            </button>
            <button
              type="button"
              className="gdemo__tx-filter"
              onClick={() => downloadReport('monthly', 'pdf', dashboardData?.pod?.podId ?? undefined, dashboardData?.pod?.inviteCode)}
            >
              Monthly PDF
            </button>
            <button
              type="button"
              className="gdemo__tx-filter"
              onClick={() => downloadReport('category', 'pdf', dashboardData?.pod?.podId ?? undefined, dashboardData?.pod?.inviteCode)}
            >
              Category PDF
            </button>
            <button
              type="button"
              className="gdemo__tx-filter"
              onClick={() => downloadReport('settlement', 'pdf', dashboardData?.pod?.podId ?? undefined, dashboardData?.pod?.inviteCode)}
            >
              Settlement PDF
            </button>
          </div>
        </div>
        <div className="gdemo__settle-grid">
          <div>
            <p className="gdemo__muted">Spent this week</p>
            <p className="gdemo__mega">{formatMoney(weeklySummary.totalSpent, currency)}</p>
            <p className="gdemo__hint gdemo__hint--tight">Bills: {weeklySummary.totalBills}</p>
            <p className="gdemo__hint gdemo__hint--tight">Settled: {formatMoney(weeklySummary.totalSettled, currency)}</p>
          </div>
          <div>
            <p className="gdemo__settle-sub">By day</p>
            <ul className="gdemo__settle-bal-list">
              {weeklyDays.map((day) => (
                <li key={day.date}>
                  <span>{day.label}</span>
                  <span>{formatMoney(day.spent, currency)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {adminNotice && (
        <section className="gdemo__card gdemo__card--wide" aria-live="polite">
          <h3 className="gdemo__card-title">Member left - confirm split policy</h3>
          <p className="gdemo__hint">
            {adminNotice.leftUserName} left the pod. Remaining members: {adminNotice.remainingMemberCount}.
          </p>
          {adminNotice.reason && (
            <p className="gdemo__hint">Reason shared: "{adminNotice.reason}"</p>
          )}
          <p className="gdemo__hint">
            Choose how new bills should split from now onward.
          </p>
          <div className="gdemo__toolbar-btns">
            <button
              type="button"
              className="podwiz__btn podwiz__btn--ghost"
              onClick={() => handleSplitPolicyConfirm('keep_previous')}
            >
              Keep previous default ({adminNotice.previousDefaultSplitMethod})
            </button>
            <button
              type="button"
              className="podwiz__btn podwiz__btn--primary"
              onClick={() => handleSplitPolicyConfirm('equal')}
            >
              Switch to equal split
            </button>
          </div>
        </section>
      )}

      <div className="gdemo__grid">
        <div className="gdemo__col gdemo__col--main">
          <section className="gdemo__card" aria-labelledby="ov-total">
            <h3 id="ov-total" className="gdemo__card-title">
              Total group spending
            </h3>
            <p className="gdemo__mega">{formatMoney(totals.spending, currency)}</p>
            <p className="gdemo__muted">This month · total</p>
          </section>

          <section className="gdemo__card" aria-labelledby="cat-br">
            <h3 id="cat-br" className="gdemo__card-title">
              Category breakdown
            </h3>
            <p className="gdemo__hint">Click a row to drill into line items</p>
            <ul className="gdemo__cat-list">
              {categories.map((c) => (
                <li key={c.category_id}>
                  <button
                    type="button"
                    className={`gdemo__cat-row ${openCatId === c.category_id ? 'is-open' : ''}`}
                    aria-expanded={openCatId === c.category_id}
                    aria-controls={`cat-drill-${c.category_id}`}
                    onClick={() =>
                      setOpenCatId((id) => (id === c.category_id ? null : c.category_id))
                    }
                  >
                    <span className="gdemo__cat-emoji" aria-hidden>
                      {c.emoji}
                    </span>
                    <span className="gdemo__cat-label">{c.label}</span>
                    <span className="gdemo__cat-amt">{formatMoney(c.total, currency)}</span>
                  </button>
                  {openCatId === c.category_id && (
                    <CategoryDrillDown
                      category={c}
                      currency={currency}
                      onEdit={handleEditExpense}
                      onDelete={handleDeleteExpense}
                    />
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
            <p className="gdemo__owe-total">{formatMoney(totals.youOwe, currency)}</p>
            <p className="gdemo__hint gdemo__hint--tight">
              Category balances below — so you see what you owe and why
            </p>
            <ul className="gdemo__bal-cats">
              {categories.map((c) => (
                <li key={c.category_id} className="gdemo__bal-cat">
                  <span>
                    {c.emoji} {c.label}
                  </span>
                  <span className={c.you_owe > 0 ? 'gdemo__owe-pos' : 'gdemo__owe-zero'}>
                    {c.you_owe > 0
                      ? `${viewerName} owes ${formatMoney(c.you_owe, currency)}`
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
              {people.map((p) => (
                <li key={p.person_id}>
                  <button
                    type="button"
                    className={`gdemo__person ${openPersonId === p.person_id ? 'is-open' : ''}`}
                    aria-expanded={openPersonId === p.person_id}
                    aria-controls={`person-drill-${p.person_id}`}
                    onClick={() =>
                      setOpenPersonId((id) => (id === p.person_id ? null : p.person_id))
                    }
                  >
                    <span className="gdemo__person-av" aria-hidden>
                      {p.name.slice(0, 1)}
                    </span>
                    {p.name}
                  </button>
                  {openPersonId === p.person_id && <PersonDrillDown person={p} currency={currency} />}
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
            <p className="gdemo__hint gdemo__hint--tight">Global activity log — expenses and settlement payments</p>
          </div>
          <div className="gdemo__tx-filters" role="group" aria-label="Filter transactions">
            {(['all', 'expense', 'payment'] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={`gdemo__tx-filter ${txFilter === f ? 'is-on' : ''}`}
                aria-pressed={txFilter === f}
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
                  <td className="gdemo__tx-amt">{formatMoney(tx.amount, currency)}</td>
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
              {Object.entries(netBalances).map(([id, b]) => (
                <li key={id}>
                  <span>{memberLabel[id] ?? id}</span>
                  <span className={b >= 0 ? 'gdemo__net-pos' : 'gdemo__net-neg'}>
                    {b >= 0 ? '+' : ''}
                    {formatMoney(b, currency)}
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
                          <strong>{memberLabel[t.from] ?? t.from}</strong>
                          <span aria-hidden> → </span>
                          <strong>{memberLabel[t.to] ?? t.to}</strong>
                        </span>
                        <span className="gdemo__settle-amt">
                          {formatMoney(t.amount, currency)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={`gdemo__mark-paid ${done ? 'is-done' : ''}`}
                        onClick={() => togglePaid(t)}
                        disabled={!isViewerAdmin}
                        title={!isViewerAdmin ? 'Only pod admins can confirm external payments' : undefined}
                      >
                        {done ? 'Marked paid' : isViewerAdmin ? 'Confirm paid (external)' : 'Admin confirms payment'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      <AddExpenseDemoModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSaved={() => {
          void loadDashboard()
          setOpenAdd(false)
          setEditExpense(null)
        }}
        podId={dashboardData?.pod?.podId ?? null}
        inviteCode={dashboardData?.pod?.inviteCode ?? inviteCode}
        currency={currency}
        categories={categoryLabels.length > 0 ? categoryLabels : ['Other']}
        members={members}
        expenseToEdit={editExpense}
      />
      <PodSettingsDemoModal
        open={openSettings}
        onClose={() => setOpenSettings(false)}
        onUpdated={() => {
          void loadDashboard()
        }}
        onLeft={() => {
          void loadDashboard()
        }}
        defaultPodName={dashboardData?.pod?.podName ?? podName}
        inviteCode={dashboardData?.pod?.inviteCode ?? inviteCode}
        podId={dashboardData?.pod?.podId ?? null}
        viewerId={viewerId}
        currency={currency}
        defaultSplitMethod={defaultSplitMethod}
        members={members.length > 0 ? members : [{ id: viewerId ?? -1, name: viewerName, role: 'member' }]}
      />
    </div>
  )
}

function CategoryDrillDown({
  category,
  currency,
  onEdit,
  onDelete,
}: {
  category: DashboardCategory
  currency: string
  onEdit: (expense: DashboardCategory['expenses'][number], categoryLabel: string) => void
  onDelete: (expenseId: string) => void
}) {
  return (
    <div id={`cat-drill-${category.category_id}`} className="gdemo__drill gdemo__drill--cat">
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
            <th>Actions</th>
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
              <td>{formatMoney(ex.amount, currency)}</td>
              <td>{ex.paid_by}</td>
              <td>{ex.added_by}</td>
              <td>{ex.date_label}</td>
              <td>
                {ex.can_edit ? (
                  <div className="gdemo__toolbar-btns">
                    <button
                      type="button"
                      className="podwiz__btn podwiz__btn--ghost"
                      onClick={() => onEdit(ex, category.label)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="podwiz__btn podwiz__btn--ghost"
                      onClick={() => onDelete(ex.expense_id)}
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <span className="gdemo__muted">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PersonDrillDown({
  person,
  currency,
}: {
  person: DashboardPerson
  currency: string
}) {
  return (
    <div id={`person-drill-${person.person_id}`} className="gdemo__drill gdemo__drill--person">
      <p className="gdemo__drill-kicker">Paid toward</p>
      <ul className="gdemo__mini-list">
        {person.paid_by_category.map((row) => (
          <li key={row.category}>
            {row.category}: {formatMoney(row.amount, currency)}
          </li>
        ))}
      </ul>
      <p className="gdemo__drill-kicker">You → {person.name}</p>
      <ul className="gdemo__mini-list">
        {person.you_owe_by_category.map((row) => (
          <li key={row.category}>
            {row.category}: {formatMoney(row.amount, currency)}
          </li>
        ))}
      </ul>
    </div>
  )
}
