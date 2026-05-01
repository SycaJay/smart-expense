import { useEffect, useMemo, useState } from 'react'
import { AppShell } from './components/AppShell'
import { MemberPanel } from './components/MemberPanel'
import { ExpensePanel } from './components/ExpensePanel'
import { BalanceSummary } from './components/BalanceSummary'
import { SettlementPlan } from './components/SettlementPlan'
import { createId } from './lib/id'
import {
  balancesFromExpenses,
  minimizeTransfers,
} from './lib/settlement'
import { fetchHealth } from './api/client'
import type { ExpenseItem, Member } from './types/expense'
import './App.css'

function createInitialState(): { members: Member[]; expenses: ExpenseItem[] } {
  const members: Member[] = [
    { id: createId('m'), name: 'Alex' },
    { id: createId('m'), name: 'Jordan' },
    { id: createId('m'), name: 'Sam' },
  ]
  const expenses: ExpenseItem[] = [
    {
      id: createId('e'),
      title: 'Rent — April',
      amount: 2400,
      splitMode: 'equal',
      paidById: members[0].id,
      participantIds: members.map((m) => m.id),
      weights: Object.fromEntries(members.map((m) => [m.id, 1])),
      date: new Date().toISOString().slice(0, 10),
    },
  ]
  return { members, expenses }
}

// Standalone split demo (in-memory). Live app uses PodFlow + API dashboard.
export function ExpenseDashboard() {
  const [{ members, expenses }, setState] = useState(createInitialState)
  const [apiOk, setApiOk] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchHealth()
      .then(() => {
        if (!cancelled) setApiOk(true)
      })
      .catch(() => {
        if (!cancelled) setApiOk(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const currency = 'USD'

  const balances = useMemo(
    () => balancesFromExpenses(members, expenses),
    [members, expenses],
  )

  const transfers = useMemo(() => minimizeTransfers(balances), [balances])

  function addMember(name: string) {
    const id = createId('m')
    setState((s) => ({
      ...s,
      members: [...s.members, { id, name }],
    }))
  }

  function removeMember(id: string) {
    setState((s) => ({
      members: s.members.filter((m) => m.id !== id),
      expenses: s.expenses.filter(
        (e) =>
          e.paidById !== id &&
          !e.participantIds.includes(id),
      ),
    }))
  }

  function addExpense(expense: ExpenseItem) {
    setState((s) => ({ ...s, expenses: [expense, ...s.expenses] }))
  }

  function removeExpense(id: string) {
    setState((s) => ({
      ...s,
      expenses: s.expenses.filter((e) => e.id !== id),
    }))
  }

  const badge =
    apiOk === null ? (
      <span className="status-pill status-pill--pending">Checking API…</span>
    ) : apiOk ? (
      <span className="status-pill status-pill--ok">API connected</span>
    ) : (
      <span className="status-pill status-pill--warn" title="Run PHP locally">
        API offline
      </span>
    )

  return (
    <AppShell
      title="Smart Expense"
      subtitle="Split shared housing costs fairly — then settle with fewer payments."
      badge={badge}
    >
      <div className="col col--main">
        <MemberPanel
          members={members}
          onAdd={addMember}
          onRemove={removeMember}
        />
        <ExpensePanel
          members={members}
          expenses={expenses}
          currency={currency}
          onAdd={addExpense}
          onRemove={removeExpense}
        />
      </div>
      <aside className="col col--side">
        <BalanceSummary
          members={members}
          balances={balances}
          currency={currency}
        />
        <SettlementPlan
          members={members}
          transfers={transfers}
          currency={currency}
        />
      </aside>
    </AppShell>
  )
}
