# Update

## Full implementation status

## 1) Landing, sign up, and log in
- Landing page includes hero section, feature cards, and auth section with tab switch between Sign Up and Log In.
- Sign Up form captures `fullName`, `email`, `phone`, and `password`.
- Sign Up now sends data to backend endpoint `POST /api/signups`.
- Signup data is written to `backend/storage/signups.json` (created automatically if missing).
- Log In uses local credential check in `src/config/demoAuth.ts`:
  - Email: `jessica@smartexpense.local`
  - Password: `123456`
- Successful login routes the user into the Pod flow.

## 2) App phase and session flow
- App switches between two phases in `src/App.tsx`:
  - `landing` -> `pods` after authentication
  - `pods` -> `landing` on sign out
- Pod home session data is stored in `sessionStorage` via `src/onboarding/podHomeStorage.ts`.
- Returning users can reopen their last created Pod from the decision screen.

## 3) Pod decision and onboarding
- After login, users get a decision screen:
  - `Create a Pod`
  - `Join a Pod`
- DB status pill checks `/api/pods` and shows:
  - checking state
  - online state with pod count
  - offline state when backend/DB is unavailable

## 4) Create Pod flow
- 3-step create wizard implemented in `src/onboarding/CreatePodWizard.tsx`:
  1. Pod type selection
  2. Name and member count
  3. Defaults and category customization
- Pod types available:
  - Shared Residence (default)
  - Trip
  - Short Stay
  - Other / General
- Default split methods supported:
  - Equal
  - Weighted
- Category customization includes:
  - rename categories
  - toggle dashboard visibility
  - add custom categories
  - remove categories
- Pod code is generated when creating a pod.

## 5) Join Pod flow
- Join screen accepts invite code input and normalizes format.
- Validation enforces code pattern like `HSE-92KD`.
- Invalid format shows clear inline error.
- Successful join opens Pod dashboard in member mode.

## 6) Pod dashboard and invite experience
- Admin and member dashboard views are implemented in `src/onboarding/PodDashboard.tsx`.
- Admin view includes:
  - pod title
  - invite code card
  - copy invite code action
  - optional email invite section (UI present, sending disabled)
- Member view shows joined code and shared dashboard preview.

## 7) Group dashboard functionality
- Main dashboard implemented in `src/dashboard/GroupDashboardDemo.tsx` with:
  - total spending card
  - category breakdown list
  - category drilldown table
  - balance summary
  - people list + person drilldown
  - transaction history filters (`all`, `expense`, `payment`)
  - settle-up section with suggested transfers
  - mark-as-paid toggles per transfer
- Current configured profile data:
  - Viewer: Jessica
  - Pod default name: Kingship Apartment
  - Members: PraiseGod, Inez
  - Updated sample expenses and settlement entries are in `src/demo/groupDashboardDummyData.ts`.

## 8) Add expense and settings modals
- Add Expense modal flow is implemented (5 steps):
  1. basic details
  2. category/subcategory
  3. split method
  4. processing state
  5. confirmation state
- Pod Settings modal includes:
  - pod name input
  - default split selector
  - invite code display
  - member list UI
  - leave pod confirmation UI
- Some actions in these modals are currently UI-only and not persisted to backend.

## 9) Backend API currently wired
- `GET /api/health` -> API heartbeat
- `GET /api/pods` -> reads pods from MySQL (`pods` table)
- `POST /api/signups` -> appends signup records to local JSON storage
- Router is in `backend/public/index.php`.

## 10) Responsive and UI foundation
- Global responsive styles are present (`src/responsive.css`) and component-level styles are implemented for:
  - home
  - pod flow
  - dashboard
  - modals
- Core UX includes animated transitions, cards, segmented controls, and mobile-friendly layout behavior.

## Known limitations (current build)
- Login is local credential matching, not real account authentication yet.
- Signup stores password in plain text JSON for now (not production-safe).
- Email invite sending is UI-only (mailer not connected).
- Several dashboard interactions are currently preview/local-state behavior and not fully persisted server-side.
