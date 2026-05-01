# Smart Expense

Bill-splitting for shared households, trips, and small groups. People log expenses, see who owes what, and settle in real life—the app keeps the math and history straight. It does **not** handle actual money transfers.

## Stack

- **Frontend:** React, TypeScript, Vite (`src/`)
- **API:** PHP under `backend/public/` (session cookies + JSON routes)
- **Database:** MySQL — schema in `smart_expense.sql` at the repo root

Mail goes out through PHPMailer; Composer deps live in `vendor/`.

## Run it locally

You need two processes: the PHP API and the Vite dev server. Vite proxies `/api` to the backend (see `vite.config.ts`).

**Terminal 1 — API**

```bash
composer install
```

Duplicate `backend/config/config.example.php` to `backend/config/config.php` and edit it.

Edit `backend/config/config.php` with your DB credentials, then:

```bash
npm run php:dev
```

That listens on port **8080**.

**Terminal 2 — UI**

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). API calls hit `/api` and forward to PHP.

### Mail (optional locally)

Copy `backend/.env.example` to `backend/.env` and set SMTP vars if you want invites and notifications to actually send. Without them, mail-related actions may fail quietly or return errors depending on the endpoint.

### Production build

```bash
npm run build
```

Static output goes to `dist/`. Deploy that plus the PHP files documented in `update.md` (there’s a Hostinger-oriented file list there).

## Repo layout (short)

| Path | What |
|------|------|
| `src/` | React app |
| `backend/api/` | Route handlers (`*.php`) |
| `backend/lib/` | Shared PHP (`bootstrap`, DB, HTTP helpers, mailer) |
| `backend/public/` | Front controller + router |
| `public/` | Built assets the UI references (logo, favicon) |

For a narrative walkthrough of features and user flow, see `flow.md`. For what’s implemented vs deployment notes, see `update.md`.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production bundle |
| `npm run lint` | ESLint |
| `npm run php:dev` | PHP built-in server for the API |
