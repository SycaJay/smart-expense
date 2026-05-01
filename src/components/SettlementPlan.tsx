import { formatMoney } from '../lib/format'
import type { Member } from '../types/expense'
import type { Transfer } from '../lib/settlement'

type Props = {
  members: Member[]
  transfers: Transfer[]
  currency: string
}

export function SettlementPlan({ members, transfers, currency }: Props) {
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? id

  return (
    <section className="panel panel--accent" aria-labelledby="settle-heading">
      <h2 id="settle-heading">Optimized settlement</h2>
      <p className="panel__lede">
        Fewest payments to settle everyone up. Pay exactly these transfers (or
        use them as a guide).
      </p>
      {transfers.length === 0 ? (
        <p className="muted">All square — no payments needed.</p>
      ) : (
        <ol className="settle-list">
          {transfers.map((t, i) => (
            <li key={`${t.from}-${t.to}-${i}`} className="settle-item">
              <span className="settle-item__names">
                <strong>{name(t.from)}</strong>
                <span className="settle-arrow" aria-hidden>
                  →
                </span>
                <strong>{name(t.to)}</strong>
              </span>
              <span className="settle-item__amt">
                {formatMoney(t.amount, currency)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
