/** Human-friendly Pod invite code (e.g. HSE-92KD) — avoids ambiguous chars */
export function generatePodCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 4; i++) {
    s += chars[Math.floor(Math.random() * chars.length)]
  }
  return `HSE-${s}`
}

export function looksLikePodCode(raw: string): boolean {
  return /^HSE-[A-Z0-9]{4}$/i.test(raw.trim())
}
