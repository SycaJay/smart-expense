import { formatMoney } from '../lib/format'
import type { Member } from '../types/expense'

type Props = {
  members: Member[]
  balances: Record<string, number>
  currency: string
}

export function BalanceSummary({ members, balances, currency }: Props) {
  return (
    <section className="panel panel--compact" aria-labelledby="balances-heading">
      <h2 id="balances-heading">Balances</h2>
      <p className="panel__lede">
        Positive means the person is owed money; negative means they owe others.
      </p>
      <ul className="balance-list">
        {members.map((m) => {
          const b = balances[m.id] ?? 0
          const tone = b > 0.005 ? 'pos' : b < -0.005 ? 'neg' : 'zero'
          return (
            <li key={m.id} className={`balance-row balance-row--${tone}`}>
              <span className="balance-row__name">{m.name}</span>
              <span className="balance-row__amt">{formatMoney(b, currency)}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
