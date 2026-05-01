# Smart Expense Progress Update

_Last updated: 2026-05-01_

## Done So Far
- Landing page and auth UI are built (Sign Up + Log In tabs).
- Sign up now saves users into MySQL `users` table with hashed passwords (no hardcoded login credentials).
- Login is now backend-based (`POST /api/login`) using real account records from DB.
- Cookie session auth is implemented app-wide:
  - session created on login
  - `GET /api/me` restores login on refresh
  - `POST /api/logout` clears session
  - protected routes (like pods) require authenticated session
- App flow is wired: `landing` -> `pods` after login, plus session restore on refresh.
- Pod onboarding is implemented:
  - create pod (type, member count, defaults, categories)
  - join pod by code with format validation
  - generated pod invite code
- Pod dashboard screens exist for admin/member and include invite code + copy action.
- Group dashboard demo is implemented (totals, categories, drilldowns, balances, history, settlement preview).
- Add Expense and Pod Settings modals are implemented (main UI flow complete).
- Dashboard/settings data is now API-driven (hardcoded frontend demo dataset removed).
- New dashboard endpoint is live: `GET /api/pod-dashboard` (auth protected).
- Smooth add-bill flow is now implemented in app UI:
  - amount -> category -> split -> review -> confirm
  - final confirmation state after save
  - all pod members can add bills
  - dashboard auto-refreshes so other members receive new bill updates on their side
- Add expense endpoint is live: `POST /api/expenses` (auth protected, pod-membership required).
- New uploaded logo is now integrated as app branding:
  - app logo uses `public/app-logo.png`
  - favicon uses `public/favicon.png`
  - applied on home page and pod flow headers
- Backend routes currently working:
  - `GET /api/health`
  - `POST /api/signups`
  - `POST /api/login`
  - `GET /api/me`
  - `POST /api/logout`
  - `POST /api/expenses` (auth protected, pod-membership required)
  - `GET /api/pods` (auth protected)
  - `GET /api/pod-dashboard` (auth protected)
- Responsive base styles are in place across home, onboarding, dashboard, and modal views.
- Accessibility and UX improvements completed:
  - visible keyboard focus states
  - dialog accessibility improvements (`Escape` close, labels/descriptions)
  - live regions/status announcements for key UI feedback
  - improved control semantics (`aria-expanded`, `aria-controls`, `aria-pressed`)
  - reduced-motion support globally
- Project planning docs are done (`diagrams.md`, `STEPS.md`).

## Left To Do
- Connect email invites to a real mail service (currently UI-only).
- Persist dashboard and modal actions to backend (not just local/browser state).
- Implement full expense CRUD with participant selection and weighted split persistence.
- Implement real settlement engine + payment recording in backend.
- Build full group settings management (member roles, remove member, defaults, leave flow persistence):
  - add backend endpoints for update pod name/default split
  - add role update endpoint (admin/member) with permission checks
  - add remove-member + leave-pod endpoints with audit-safe validation
  - persist settings modal actions to API instead of local state only
- Complete reports/export features (CSV/PDF) if required:
  - monthly pod summary export
  - category breakdown export
  - settlement history export
  - downloadable CSV first, then optional PDF format
- Complete final cross-device QA pass (phones, tablets, desktop, keyboard-only navigation, screen reader checks).
- Add automated tests + CI checks and update deployment docs.

## How Bills Are Split and Paid (Simple)
- The Pod creator (admin) is the one who sets the bill-sharing rules for that Pod.
- Every member in the Pod can add a bill.
- A user adds the bill amount and selects how the bill should be shared.
- Sharing options are:
  - Equal split
  - Percentage-based split
- After selecting equal or percentage, the app asks if that rule should apply:
  - to all categories, or
  - only to specific categories
- This allows mixed rules, for example:
  - Rent = equal split
  - Transport = percentage split
- When members are invited (by code or email), they should first see these Pod rules before joining.
- New members review the configured sharing setup and approve/accept it before they enter the Pod.
- Bill entry should feel smooth: amount -> category -> split -> review -> confirm.
- After confirm, the bill appears clearly and balances update automatically.
- The new bill should also appear for other pod members on their side.
- During settlement, the app suggests the minimum number of payments, and members mark payments as paid.

## Files To Upload To `public_html`
- Upload all files inside `dist/` to `public_html/` (frontend build output).
- Upload `backend/public/index.php` to `public_html/api/index.php`.
- Upload `backend/public/.htaccess` to `public_html/api/.htaccess`.
- Upload `backend/api/login.php` to `public_html/api/login.php`.
- Upload `backend/api/logout.php` to `public_html/api/logout.php`.
- Upload `backend/api/me.php` to `public_html/api/me.php`.
- Upload `backend/api/pods.php` to `public_html/api/pods.php`.
- Upload `backend/api/pod_dashboard.php` to `public_html/api/pod_dashboard.php`.
- Upload `backend/api/signups.php` to `public_html/api/signups.php`.
- Upload `backend/api/health.php` to `public_html/api/health.php`.
- Upload `backend/lib/Database.php` to `public_html/lib/Database.php`.
- Upload `backend/lib/Http.php` to `public_html/lib/Http.php`.
- Upload `backend/lib/bootstrap.php` to `public_html/lib/bootstrap.php`.
- Upload `public/app-logo.png` to `public/app-logo.png`.
- Upload `public/favicon.png` to `public/favicon.png`.
- Create and upload `backend/config/config.php` (from `backend/config/config.example.php`) to `public_html/config/config.php`.
- Import `smart_expense.sql` into Hostinger MySQL database (this is imported to DB, not placed in `public_html`).
