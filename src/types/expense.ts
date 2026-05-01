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
  weights: Record<string, number>
  date: string
}
