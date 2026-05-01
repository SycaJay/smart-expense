export type HealthResponse = { ok: boolean; service?: string; time?: string }
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
    id: string
    fullName: string
    email: string
    phone: string
    createdAt: string
  }
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health')
  if (!res.ok) {
    throw new Error(`Health check failed (${res.status})`)
  }
  return res.json() as Promise<HealthResponse>
}

export async function saveSignup(
  payload: SignupInput,
): Promise<SignupResponse> {
  const res = await fetch('/api/signups', {
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
