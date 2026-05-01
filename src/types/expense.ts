export type SplitMode = 'equal' | 'weighted'

export interface Member {
  id: string
  name: string
}

export interface ExpenseItem {
  id: string
  title: string
  amount: number
  splitMode: SplitMode
  paidById: string
  participantIds: string[]
  /** Per-member weights when splitMode === 'weighted' */
  weights: Record<string, number>
  date: string
}
