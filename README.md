# LATIELLE MARKET HUB

LATIELLE MARKET HUB is a Kenya-focused marketplace for established businesses for sale. The project contains a React/Vite frontend and an Express/PostgreSQL backend designed to run as one service on Render.

## Production behavior
- Guests can browse public marketplace content and read the public information pages.
- Buyers and sellers authenticate with a phone number and 4-digit PIN. A verified phone may have one buyer account and one seller account, with the selected role determining the dashboard.
- Confidential listing information is kept behind the platform access flow.
- Required payments use M-Pesa STK Push and are confirmed from the payment callback before access or listing publication progresses.
- Public support chat is routed through the backend to OpenAI; human support can be requested through the chat.
- Listing images use seller-supplied media where available; missing images use a neutral local placeholder rather than stock photography.
- Legacy service-worker registrations are removed at startup so an old cached application shell cannot trap a deployment on stale content.

## Render
Build: `npm install --include=dev --no-audit --no-fund && npm run build`
Start: `npm start`
Health check: `/api/health`

Required production secrets and service credentials are documented in `.env.example` and `render.yaml`.

## Final pre-launch checks
Run `npm run lint` and `npm run build`, then test the complete buyer and seller flows with live M-Pesa credentials, private document access, file uploads, support chat and database connectivity before opening the marketplace to the public.
