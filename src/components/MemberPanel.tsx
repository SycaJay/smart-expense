import type { Member } from '../types/expense'

type Props = {
  members: Member[]
  onAdd: (name: string) => void
  onRemove: (id: string) => void
}

export function MemberPanel({ members, onAdd, onRemove }: Props) {
  return (
    <section className="panel" aria-labelledby="members-heading">
      <div className="panel__head">
        <div>
          <h2 id="members-heading">Household members</h2>
          <p className="panel__lede">Everyone who shares bills in this space.</p>
        </div>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const name = String(fd.get('name') ?? '').trim()
            if (name) onAdd(name)
            e.currentTarget.reset()
          }}
        >
          <label className="sr-only" htmlFor="member-name">
            Name
          </label>
          <input
            id="member-name"
            name="name"
            type="text"
            placeholder="Add name…"
            autoComplete="name"
            maxLength={80}
          />
          <button type="submit" className="btn btn--primary">
            Add
          </button>
        </form>
      </div>
      <ul className="chip-list">
        {members.map((m) => (
          <li key={m.id} className="chip">
            <span className="chip__label">{m.name}</span>
            <button
              type="button"
              className="chip__remove"
              onClick={() => onRemove(m.id)}
              aria-label={`Remove ${m.name}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <p className="hint">Tip: keep at least two people to split expenses.</p>
    </section>
  )
}
