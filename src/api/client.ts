export type HealthResponse = { ok: boolean; service?: string; time?: string }
export type AuthUser = {
  id: number
  firstName: string
  lastName: string
  email: string
  phone: string
}

export type SignupInput = {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
}

export type SignupResponse = {
  ok: boolean
  message?: string
  data?: {
    id: number
    firstName: string
    lastName: string
    email: string
    phone: string
  }
}

export type LoginInput = {
  email: string
  password: string
}

export type LoginResponse = {
  ok: boolean
  message?: string
  data?: {
    id: number
    firstName: string
    lastName: string
    email: string
    phone: string
  }
}

export type MeResponse = {
  ok: boolean
  data?: AuthUser
}

export type DashboardCategoryExpense = {
  expense_id: string
  title: string
  amount: number
  subcategory?: string
  split_mode?: 'equal' | 'percentage'
  split_scope?: 'all' | 'category_only'
  participant_ids?: number[]
  participant_weights?: Record<string, number>
  paid_by: string
  added_by: string
  can_edit?: boolean
  date_label: string
}

export type DashboardCategory = {
  category_id: string
  emoji: string
  label: string
  total: number
  you_owe: number
  expenses: DashboardCategoryExpense[]
}

export type DashboardPerson = {
  person_id: string
  name: string
  paid_by_category: { category: string; amount: number }[]
  you_owe_by_category: { category: string; amount: number }[]
}

export type DashboardTx = {
  tx_id: string
  date_label: string
  title: string
  category: string
  amount: number
  actor: string
  kind: 'expense' | 'payment'
}

export type PodDashboardResponse = {
  ok: boolean
  data?: {
    pod: {
      podId: number
      podName: string
      inviteCode: string
      currency: string
      defaultSplitMethod: 'equal' | 'weighted'
      isArchived: boolean
    } | null
    viewerName: string
    viewerId: number
    members: { id: number; name: string; role: 'admin' | 'member' | string }[]
    categories: DashboardCategory[]
    totals: { spending: number; youOwe: number }
    people: DashboardPerson[]
    netBalances: Record<string, number>
    memberLabel: Record<string, string>
    transactions: DashboardTx[]
    adminNotice: {
      noticeId: number
      kind: 'member_left_split_policy'
      leftUserName: string
      reason: string
      previousDefaultSplitMethod: 'equal' | 'weighted' | string
      remainingMemberCount: number
    } | null
  }
}

export type CreateExpenseInput = {
  podId: number
  inviteCode?: string
  title: string
  amount: number
  category: string
  subcategory?: string
  splitMode: 'equal' | 'percentage'
  splitScope: 'all' | 'category_only'
  expenseDate: string
  participantIds?: number[]
  participantWeights?: Record<string, number>
}

export type UpdateExpenseInput = {
  expenseId: number
  title: string
  amount: number
  category: string
  subcategory?: string
  splitMode: 'equal' | 'percentage'
  splitScope: 'all' | 'category_only'
  expenseDate: string
  participantIds?: number[]
  participantWeights?: Record<string, number>
}

export type PodInviteInput = {
  podId?: number
  inviteCode?: string
  emails: string[]
  message?: string
}

export type PodInviteResult = {
  ok?: boolean
  error?: string
  detail?: string
  data?: {
    sent?: string[]
    failed?: { email: string; reason: string }[]
  }
}

export type PaymentNotifyInput = {
  podId: number
  payerUserId: number
  receiverUserId: number
  amount: number
  currency: string
  note?: string
}

export type PodUpdateInput = {
  podId: number
  podName: string
  defaultSplitMethod: 'equal' | 'weighted'
}

export type PodMemberRoleInput = {
  podId: number
  targetUserId: number
  newRole: 'admin' | 'member'
}

export type PodMemberRemoveInput = {
  podId: number
  targetUserId: number
}

export type PodLeaveInput = {
  podId: number
  reason?: string
  confirmStepOne?: boolean
  confirmStepTwo?: boolean
}

export type PodSplitPolicyConfirmInput = {
  podId: number
  noticeId: number
  policy: 'equal' | 'keep_previous'
}

export type PodCloseInput = {
  podId: number
  reason?: string
  confirmArchive: boolean
}

export type SettlementPlanSummary = {
  settlementPlanId: number
  status: 'open' | 'closed' | 'cancelled' | string
  createdAt: string
  updatedAt: string
  pendingTransfers: number
  paidTransfers: number
  cancelledTransfers: number
}

export type WeeklyReportResponse = {
  ok: boolean
  data?: {
    type: 'weekly'
    podId: number
    podName: string
    currency: string
    range: { start: string; end: string }
    summary: { totalSpent: number; totalBills: number; totalSettled: number }
    days: { date: string; label: string; spent: number; bills: number; settled: number }[]
  }
}

async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    credentials: 'include',
    ...init,
  })
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await apiFetch('/api/health')
  if (!res.ok) {
    throw new Error(`Health check failed (${res.status})`)
  }
  return res.json() as Promise<HealthResponse>
}

export async function saveSignup(
  payload: SignupInput,
): Promise<SignupResponse> {
  const res = await apiFetch('/api/signups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = (await res.json()) as SignupResponse & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Signup save failed (${res.status})`)
  }
  return data
}

export async function login(payload: LoginInput): Promise<LoginResponse> {
  const res = await apiFetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = (await res.json()) as LoginResponse & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Login failed (${res.status})`)
  }
  return data
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await apiFetch('/api/me')
  if (res.status === 401) return null
  const data = (await res.json()) as MeResponse & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Session check failed (${res.status})`)
  }
  return data.data ?? null
}

export async function logoutSession(): Promise<void> {
  const res = await apiFetch('/api/logout', {
    method: 'POST',
  })
  if (!res.ok) {
    const data = (await res.json()) as { error?: string }
    throw new Error(data.error || `Logout failed (${res.status})`)
  }
}

export async function fetchPodDashboard(inviteCode?: string) {
  const query = inviteCode ? `?inviteCode=${encodeURIComponent(inviteCode)}` : ''
  const res = await apiFetch(`/api/pod-dashboard${query}`)
  if (res.status === 401) {
    throw new Error('Unauthorized')
  }
  const data = (await res.json()) as PodDashboardResponse & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Dashboard load failed (${res.status})`)
  }
  return data.data ?? null
}

export async function createExpense(payload: CreateExpenseInput) {
  const res = await apiFetch('/api/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json()) as { ok?: boolean; error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Create expense failed (${res.status})`)
  }
  return data
}

export async function updateExpense(payload: UpdateExpenseInput) {
  const res = await apiFetch('/api/expense-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json()) as { ok?: boolean; error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Update expense failed (${res.status})`)
  }
  return data
}

export async function deleteExpense(expenseId: number) {
  const res = await apiFetch('/api/expense-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expenseId }),
  })
  const data = (await res.json()) as { ok?: boolean; error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Delete expense failed (${res.status})`)
  }
  return data
}

export async function sendPodInviteEmails(payload: PodInviteInput) {
  const res = await apiFetch('/api/pod-invites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json()) as PodInviteResult
  if (!res.ok) {
    throw new Error(
      data.detail
        ? `${data.error || 'Send invites failed'}: ${data.detail}`
        : data.error || `Send invites failed (${res.status})`,
    )
  }
  return data
}

export async function notifyPayment(payload: PaymentNotifyInput) {
  const res = await apiFetch('/api/payment-notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json()) as { ok?: boolean; error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Payment notify failed (${res.status})`)
  }
  return data
}

export async function updatePodSettings(payload: PodUpdateInput) {
  const res = await apiFetch('/api/pod-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json()) as { ok?: boolean; error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Update pod settings failed (${res.status})`)
  }
  return data
}

export async function updatePodMemberRole(payload: PodMemberRoleInput) {
  const res = await apiFetch('/api/pod-member-role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json()) as { ok?: boolean; error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Update member role failed (${res.status})`)
  }
  return data
}

export async function removePodMember(payload: PodMemberRemoveInput) {
  const res = await apiFetch('/api/pod-member-remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json()) as { ok?: boolean; error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Remove member failed (${res.status})`)
  }
  return data
}

export async function leavePod(payload: PodLeaveInput) {
  const res = await apiFetch('/api/pod-leave', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json()) as { ok?: boolean; error?: string; data?: { podDeleted?: boolean } }
  if (!res.ok) {
    throw new Error(data.error || `Leave pod failed (${res.status})`)
  }
  return data
}

export async function confirmPodSplitPolicy(payload: PodSplitPolicyConfirmInput) {
  const res = await apiFetch('/api/pod-split-policy-confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json()) as { ok?: boolean; error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Split policy confirm failed (${res.status})`)
  }
  return data
}

export async function closePod(payload: PodCloseInput) {
  const res = await apiFetch('/api/pod-close', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json()) as { ok?: boolean; error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Close pod failed (${res.status})`)
  }
  return data
}

export async function openSettlementPlan(podId: number) {
  const res = await apiFetch('/api/settlement-plan-open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ podId }),
  })
  const data = (await res.json()) as {
    ok?: boolean
    error?: string
    data?: {
      settlementPlanId: number
      status: 'open' | string
      transferCount: number
      transfers: { from_user_id: number; to_user_id: number; amount: number }[]
    }
  }
  if (!res.ok) {
    throw new Error(data.error || `Open settlement plan failed (${res.status})`)
  }
  return data.data ?? null
}

export async function reconcileSettlementPlan(podId: number, settlementPlanId: number) {
  const res = await apiFetch('/api/settlement-plan-reconcile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ podId, settlementPlanId }),
  })
  const data = (await res.json()) as {
    ok?: boolean
    error?: string
    data?: {
      settlementPlanId: number
      status: 'open' | 'closed' | string
      pendingTransfers: number
      paidTransfers: number
    }
  }
  if (!res.ok) {
    throw new Error(data.error || `Reconcile settlement plan failed (${res.status})`)
  }
  return data.data ?? null
}

export async function fetchSettlementPlans(
  podId: number,
  status?: 'open' | 'closed' | 'cancelled',
) {
  const params = new URLSearchParams({ podId: String(podId) })
  if (status) params.set('status', status)
  const res = await apiFetch(`/api/settlement-plans?${params.toString()}`)
  const data = (await res.json()) as {
    ok?: boolean
    error?: string
    data?: { plans?: SettlementPlanSummary[] }
  }
  if (!res.ok) {
    throw new Error(data.error || `Fetch settlement plans failed (${res.status})`)
  }
  return data.data?.plans ?? []
}

export async function fetchWeeklyReport(podId?: number, inviteCode?: string) {
  const params = new URLSearchParams({ type: 'weekly', format: 'json' })
  if (podId) params.set('podId', String(podId))
  if (inviteCode) params.set('inviteCode', inviteCode)
  const res = await apiFetch(`/api/reports?${params.toString()}`)
  if (res.status === 401) throw new Error('Unauthorized')
  const data = (await res.json()) as WeeklyReportResponse & { error?: string }
  if (!res.ok) throw new Error(data.error || `Weekly report failed (${res.status})`)
  return data.data ?? null
}

export function downloadReport(
  type: 'monthly' | 'category' | 'settlement' | 'weekly',
  format: 'csv' | 'pdf',
  podId?: number,
  inviteCode?: string,
) {
  const params = new URLSearchParams({ type, format })
  if (podId) params.set('podId', String(podId))
  if (inviteCode) params.set('inviteCode', inviteCode)
  window.open(`/api/reports?${params.toString()}`, '_blank', 'noopener,noreferrer')
}
