/**
 * Local credentials (no server validation).
 * Remove or replace when real auth is wired.
 */
export const DEMO_EMAIL = 'jessica@smartexpense.local'
export const DEMO_PASSWORD = '123456'

export function isDemoLogin(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === DEMO_EMAIL.toLowerCase() &&
    password === DEMO_PASSWORD
  )
}
