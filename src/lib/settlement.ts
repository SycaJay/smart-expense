import type { ExpenseItem, Member } from '../types/expense'

export interface Transfer {
  from: string
  to: string
  amount: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function computeShares(expense: ExpenseItem): Record<string, number> {
  const { amount, splitMode, participantIds, weights } = expense
  const shares: Record<string, number> = {}
  if (participantIds.length === 0) return shares

  if (splitMode === 'equal') {
    const each = amount / participantIds.length
    for (const id of participantIds) {
      shares[id] = round2(each)
    }
    fixRoundingDrift(shares, participantIds, amount)
    return shares
  }

  let sum = 0
  const w: Record<string, number> = {}
  for (const id of participantIds) {
    const wi = Math.max(0, weights[id] ?? 1)
    w[id] = wi
    sum += wi
  }
  if (sum <= 0) {
    const each = amount / participantIds.length
    for (const id of participantIds) {
      shares[id] = round2(each)
    }
    fixRoundingDrift(shares, participantIds, amount)
    return shares
  }

  for (const id of participantIds) {
    shares[id] = round2((amount * w[id]) / sum)
  }
  fixRoundingDrift(shares, participantIds, amount)
  return shares
}

function fixRoundingDrift(
  shares: Record<string, number>,
  participantIds: string[],
  targetTotal: number,
): void {
  const current = participantIds.reduce((a, id) => a + (shares[id] ?? 0), 0)
  const diff = round2(targetTotal - current)
  if (Math.abs(diff) >= 0.001 && participantIds.length > 0) {
    const first = participantIds[0]
    shares[first] = round2((shares[first] ?? 0) + diff)
  }
}

export function balancesFromExpenses(
  members: Member[],
  expenses: ExpenseItem[],
): Record<string, number> {
  const bal: Record<string, number> = {}
  for (const m of members) bal[m.id] = 0

  for (const e of expenses) {
    const shares = computeShares(e)
    bal[e.paidById] = round2((bal[e.paidById] ?? 0) + e.amount)
    for (const id of Object.keys(shares)) {
      bal[id] = round2((bal[id] ?? 0) - (shares[id] ?? 0))
    }
  }
  return bal
}

export function minimizeTransfers(balances: Record<string, number>): Transfer[] {
  const eps = 0.005
  const creditors: { id: string; v: number }[] = []
  const debtors: { id: string; v: number }[] = []

  for (const [id, b] of Object.entries(balances)) {
    if (b > eps) creditors.push({ id, v: b })
    else if (b < -eps) debtors.push({ id, v: -b })
  }

  creditors.sort((a, b) => b.v - a.v)
  debtors.sort((a, b) => b.v - a.v)

  const out: Transfer[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].v, creditors[j].v)
    const amt = round2(pay)
    if (amt >= 0.01) {
      out.push({ from: debtors[i].id, to: creditors[j].id, amount: amt })
    }
    debtors[i].v = round2(debtors[i].v - pay)
    creditors[j].v = round2(creditors[j].v - pay)
    if (debtors[i].v < eps) i++
    if (creditors[j].v < eps) j++
  }
  return out
}
