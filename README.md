# Latielle Market Hub

LATIELLE MARKET HUB is a React/Vite marketplace with a self-hosted Express/PostgreSQL backend for buying and selling established businesses across Kenya.

## Local setup

```bash
cp .env.example .env
npm ci
npm run dev
```

## Production

The Render web service builds the React app with Vite and serves the finished site and `/api/*` from the same Express process.

```bash
npm install && npm run build
npm start
```

Keep all secrets in Render environment variables. Never place OpenAI, M-Pesa, database or email credentials in frontend code or commit them to GitHub.
