export type HealthResponse = { ok: boolean; service?: string; time?: string }
export type AuthUser = {
  id: number
  fullName: string
  email: string
  phone: string
}

export type SignupInput = {
  fullName: string
  email: string
  phone: string
  password: string
}

export type SignupResponse = {
  ok: boolean
  message?: string
  data?: {
    id: number
    fullName: string
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
    fullName: string
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
  paid_by: string
  added_by: string
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
    } | null
    viewerName: string
    members: { id: number; name: string; role: 'admin' | 'member' | string }[]
    categories: DashboardCategory[]
    totals: { spending: number; youOwe: number }
    people: DashboardPerson[]
    netBalances: Record<string, number>
    memberLabel: Record<string, string>
    transactions: DashboardTx[]
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
}

export type PodInviteInput = {
  podId?: number
  inviteCode?: string
  emails: string[]
  message?: string
}

export type PaymentNotifyInput = {
  podId: number
  receiverUserId: number
  amount: number
  currency: string
  note?: string
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

export async function sendPodInviteEmails(payload: PodInviteInput) {
  const res = await apiFetch('/api/pod-invites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json()) as {
    ok?: boolean
    error?: string
    data?: { sent?: string[]; failed?: string[] }
  }
  if (!res.ok) {
    throw new Error(data.error || `Send invites failed (${res.status})`)
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
