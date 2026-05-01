import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle: string
  badge?: ReactNode
  children: ReactNode
}

export function AppShell({ title, subtitle, badge, children }: Props) {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand__mark" aria-hidden />
          <div>
            <h1 className="brand__title">{title}</h1>
            <p className="brand__subtitle">{subtitle}</p>
          </div>
        </div>
        {badge}
      </header>
      <main className="main-grid">{children}</main>
      <footer className="footer">
        <span>Smart Expense</span>
        <span className="footer__dot" aria-hidden>
          ·
        </span>
        <span>Equal & weighted splits · minimal transfers</span>
      </footer>
    </div>
  )
}
