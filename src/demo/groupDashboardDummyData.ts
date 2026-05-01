/**
 * Hardcoded Pod dashboard preview (STEPS §3–4) — replace with API data later.
 * Currency matches STEPS examples (GHS).
 */
export const DEMO_CURRENCY = 'GHS'

/** Logged-in viewer for “you owe” copy */
export const DEMO_VIEWER_NAME = 'Jessica'

export type DummyExpenseLine = {
  expense_id: string
  title: string
  amount: number
  subcategory?: string
  paid_by: string
  added_by: string
  date_label: string
}

export type DummyCategory = {
  category_id: string
  emoji: string
  label: string
  total: number
  you_owe: number
  expenses: DummyExpenseLine[]
}

export type DummyPerson = {
  person_id: string
  name: string
  /** What they paid toward, by category label */
  paid_by_category: { category: string; amount: number }[]
  /** What You owe this person, by category */
  you_owe_by_category: { category: string; amount: number }[]
}

/** §3.1 totals + §3.2 drill-down lines */
export const DEMO_CATEGORIES: DummyCategory[] = [
  {
    category_id: 'rent',
    emoji: '🏠',
    label: 'Rent',
    total: 2400,
    you_owe: 800,
    expenses: [
      {
        expense_id: 'e1',
        title: 'April rent — apartment lease',
        amount: 2400,
        subcategory: 'Rent',
        paid_by: 'PraiseGod',
        added_by: 'PraiseGod',
        date_label: '3 Apr 2026',
      },
    ],
  },
  {
    category_id: 'utilities',
    emoji: '⚡',
    label: 'Utilities',
    total: 450,
    you_owe: 150,
    expenses: [
      {
        expense_id: 'e2',
        title: 'Electricity prepaid top-up',
        amount: 200,
        subcategory: 'Electricity',
        paid_by: 'Inez',
        added_by: 'Inez',
        date_label: '8 Apr 2026',
      },
      {
        expense_id: 'e3',
        title: 'Water bill',
        amount: 150,
        subcategory: 'Water',
        paid_by: 'PraiseGod',
        added_by: 'PraiseGod',
        date_label: '10 Apr 2026',
      },
      {
        expense_id: 'e4',
        title: 'Cooking gas refill',
        amount: 100,
        subcategory: 'Gas',
        paid_by: 'Jessica',
        added_by: 'Jessica',
        date_label: '11 Apr 2026',
      },
    ],
  },
  {
    category_id: 'transport',
    emoji: '🚗',
    label: 'Transport',
    total: 120,
    you_owe: 0,
    expenses: [
      {
        expense_id: 'e5',
        title: 'Ride share to bulk market',
        amount: 120,
        subcategory: 'Transport',
        paid_by: 'Jessica',
        added_by: 'Jessica',
        date_label: '12 Apr 2026',
      },
    ],
  },
  {
    category_id: 'food',
    emoji: '🥘',
    label: 'Food',
    total: 360,
    you_owe: 120,
    expenses: [
      {
        expense_id: 'e6',
        title: 'Weekend grocery run',
        amount: 360,
        subcategory: 'Food',
        paid_by: 'Inez',
        added_by: 'Inez',
        date_label: '9 Apr 2026',
      },
    ],
  },
  {
    category_id: 'internet',
    emoji: '📶',
    label: 'Internet',
    total: 180,
    you_owe: 60,
    expenses: [
      {
        expense_id: 'e7',
        title: 'Home fibre — April',
        amount: 180,
        subcategory: 'Internet',
        paid_by: 'PraiseGod',
        added_by: 'PraiseGod',
        date_label: '1 Apr 2026',
      },
    ],
  },
]

export const DEMO_TOTAL_SPENDING = DEMO_CATEGORIES.reduce(
  (s, c) => s + c.total,
  0,
)

/** §3.3 — total “you owe” across Pod */
export const DEMO_TOTAL_YOU_OWE = DEMO_CATEGORIES.reduce(
  (s, c) => s + c.you_owe,
  0,
)

/** §3.4 — roommate-style breakdown */
/** Net balances for Pod (positive = owed to person, negative = they owe). Sums to ~0. */
export const DEMO_NET_BALANCES: Record<string, number> = {
  you: -370,
  praisegod: 900,
  inez: -530,
}

export const DEMO_MEMBER_LABEL: Record<string, string> = {
  you: 'Jessica',
  praisegod: 'PraiseGod',
  inez: 'Inez',
}

/** §5 — flat history (demo): expenses + sample settlement payments */
export type DemoTx = {
  tx_id: string
  date_label: string
  title: string
  category: string
  amount: number
  actor: string
  kind: 'expense' | 'payment'
}

export const DEMO_TRANSACTIONS: DemoTx[] = [
  {
    tx_id: 'tx1',
    date_label: '12 Apr 2026 · 18:40',
    title: 'Ride share to bulk market',
    category: 'Transport',
    amount: 120,
    actor: 'Added by Jessica · paid by Jessica',
    kind: 'expense',
  },
  {
    tx_id: 'tx2',
    date_label: '11 Apr 2026 · 09:12',
    title: 'Cooking gas refill',
    category: 'Utilities',
    amount: 100,
    actor: 'Added by Jessica · paid by Jessica',
    kind: 'expense',
  },
  {
    tx_id: 'tx3',
    date_label: '10 Apr 2026 · 14:03',
    title: 'Water bill',
    category: 'Utilities',
    amount: 150,
    actor: 'Added by PraiseGod · paid by PraiseGod',
    kind: 'expense',
  },
  {
    tx_id: 'tx4',
    date_label: '9 Apr 2026 · 11:20',
    title: 'Weekend grocery run',
    category: 'Food',
    amount: 360,
    actor: 'Added by Inez · paid by Inez',
    kind: 'expense',
  },
  {
    tx_id: 'tx5',
    date_label: '8 Apr 2026 · 08:55',
    title: 'Electricity prepaid top-up',
    category: 'Utilities',
    amount: 200,
    actor: 'Added by Inez · paid by Inez',
    kind: 'expense',
  },
  {
    tx_id: 'tx6',
    date_label: '6 Apr 2026 · 19:30',
    title: 'Settlement · mobile money to PraiseGod',
    category: 'Settle up',
    amount: 220,
    actor: 'Jessica marked paid',
    kind: 'payment',
  },
  {
    tx_id: 'tx7',
    date_label: '5 Apr 2026 · 21:02',
    title: 'Settlement · transfer to Inez',
    category: 'Settle up',
    amount: 150,
    actor: 'PraiseGod marked paid',
    kind: 'payment',
  },
  {
    tx_id: 'tx8',
    date_label: '3 Apr 2026 · 10:00',
    title: 'April rent — apartment lease',
    category: 'Rent',
    amount: 2400,
    actor: 'Added by PraiseGod · paid by PraiseGod',
    kind: 'expense',
  },
  {
    tx_id: 'tx9',
    date_label: '1 Apr 2026 · 07:15',
    title: 'Home fibre — April',
    category: 'Internet',
    amount: 180,
    actor: 'Added by PraiseGod · paid by PraiseGod',
    kind: 'expense',
  },
]

export const DEMO_PEOPLE: DummyPerson[] = [
  {
    person_id: 'p1',
    name: 'PraiseGod',
    paid_by_category: [
      { category: 'Rent', amount: 2400 },
      { category: 'Utilities', amount: 150 },
      { category: 'Internet', amount: 180 },
    ],
    you_owe_by_category: [
      { category: 'Rent', amount: 800 },
      { category: 'Utilities', amount: 50 },
      { category: 'Internet', amount: 60 },
    ],
  },
  {
    person_id: 'p2',
    name: 'Inez',
    paid_by_category: [
      { category: 'Utilities', amount: 200 },
      { category: 'Food', amount: 360 },
    ],
    you_owe_by_category: [
      { category: 'Utilities', amount: 100 },
      { category: 'Food', amount: 120 },
    ],
  },
]
