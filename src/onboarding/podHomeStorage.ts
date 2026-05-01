import type { CreatedPodPayload } from './CreatePodWizard'

const KEY = 'smart_expense_pod_home_v1'

export function savePodHome(payload: CreatedPodPayload): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadPodHome(): CreatedPodPayload | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as CreatedPodPayload
    if (
      typeof p?.podName !== 'string' ||
      typeof p?.code !== 'string' ||
      !Array.isArray(p?.categories)
    ) {
      return null
    }
    return p
  } catch {
    return null
  }
}

export function clearPodHome(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
