# GSEVA — Tech Stack

## Backend (`backend-mysql/`)

- **Runtime/framework:** Node.js + Express 5
- **Architecture:** layered — `routes/` → `controllers/` → `services/` → `models/`, plus `middleware/`, `config/`, `utils/`, `errors/`
- **Database:** MySQL/MariaDB (remote, Hostinger-hosted), via **Sequelize** ORM, with `migrations/` and `seeders/` for schema and dev data
- **Auth:** JWT (`jsonwebtoken`) + `bcrypt` password hashing, plus Google OAuth (`google-auth-library`)
- **Security middleware:** `helmet`, `cors`
- **Background jobs:** `node-cron` — nightly meal forecast, periodic health checks
- **Payments:** Razorpay
- **Documents/codes:** `pdfkit` (PDF generation), `qrcode` (QR generation)
- **External integrations (via `axios`):** Interakt (WhatsApp), eZee Centrix, Greythr HRMS
- **Config:** `dotenv` for env vars
- **Dev tooling:** `nodemon` (hot reload), `sequelize-cli` (migrate/seed)
- **Entry point:** `src/index.js`, runs on port `3001`

## Frontend (`frontend/`)

- **Framework:** React 19 + TypeScript
- **Build/dev server:** Vite 8 (dev server on port `5175`)
- **Routing:** `react-router-dom` v7 — multiple sub-apps (admin, canteen, dashboard, gate, register)
- **Data fetching/caching:** `@tanstack/react-query` v5
- **Auth:** `@react-oauth/google` — Google login
- **Styling:** CSS Modules (e.g. `canteen.module.css`)
- **QR scanning:** `html5-qrcode`
- **Other libs:** `react-phone-number-input`, `xlsx` (spreadsheet import/export), `lucide-react` (icons)
- **Linting:** `oxlint`

## Integrations referenced in code/env

- Google OAuth
- Razorpay (payments)
- Interakt (WhatsApp)
- eZee Centrix
- Greythr HRMS
