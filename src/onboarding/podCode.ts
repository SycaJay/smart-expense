// No I, O, 0, 1 in the random part — easier to read aloud.
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
