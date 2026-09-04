# LATIELLE MARKET HUB — Render deployment

Use the **contents of this ZIP at the repository root**. The repository root must contain `package.json`, `render.yaml`, `vite.config.js`, `src/`, `server/`, `public/`, and `data/` directly.

## Existing Render Web Service
Set:
- Runtime: Node
- Node version: `22.16.0`
- Root Directory: leave blank if `package.json` is at repository root
- Build Command: `npm ci --include=dev && npm run build`
- Start Command: `npm start`
- Health Check Path: `/api/health`

## Required environment variables
Set these in Render:
- `DATABASE_URL` — your Render PostgreSQL connection string
- `JWT_SECRET` — a long random secret
- `CLIENT_URL` — your actual Render service URL

For payments also set:
- `MPESA_SHORTCODE`
- `MPESA_PASSKEY`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_CALLBACK_URL` — use your actual Render URL + `/api/payments/mpesa/callback`
- `MPESA_ENV=production`
- `MPESA_TRANSACTION_TYPE=CustomerBuyGoodsOnline`
- `MPESA_PARTY_B=9285991`

For AI support:
- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-5.6-luna`
- `OPENAI_FALLBACK_MODEL=gpt-5-mini`

For email support:
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `SUPPORT_NOTIFICATION_EMAIL=realityofafrica2023@gmail.com`

## Important
Do not set the Root Directory to `latielle-market-hub-main` unless you actually uploaded the project inside that subfolder. This ZIP is already flattened for repository-root deployment.

After deployment, open:
`/api/health`

A healthy web process returns JSON with `ok: true`. `database: false` means the web server is alive but PostgreSQL is not connected yet.
