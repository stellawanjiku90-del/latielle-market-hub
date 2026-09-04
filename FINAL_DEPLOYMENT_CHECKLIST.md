# LATIELLE MARKET HUB — final deployment checklist

## Render
Build command:
`npm install && npm run build`

Start command:
`npm start`

## Required environment variables
- `DATABASE_URL`
- `JWT_SECRET`
- `CLIENT_URL`
- `MPESA_SHORTCODE`
- `MPESA_PASSKEY`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_CALLBACK_URL`
- `MPESA_ENV=production`
- `MPESA_TRANSACTION_TYPE=CustomerBuyGoodsOnline`
- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-5.6-luna`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL=LATIELLE MARKET HUB <support@latiellemarkethub.co.ke>`
- `SUPPORT_NOTIFICATION_EMAIL=realityofafrica2023@gmail.com`

## Security
- Do not commit `.env` or API keys.
- Keep `OPENAI_API_KEY` on the server only. The browser calls `/api/ai`; it never receives the secret.
- The `/api/ai` endpoint uses server-owned support instructions so it cannot be turned into an unrestricted OpenAI proxy by changing browser requests.
- The API has a per-IP chat rate limit and an upstream timeout.

## Smoke tests after deployment
1. Open the homepage on desktop and mobile.
2. Search for a business and confirm `/browse` opens.
3. Open the floating support chat and send a question.
4. Confirm an OpenAI answer is returned without exposing any key in browser storage or source.
5. Submit a human-support request and confirm the support email is received.
6. Test account creation/login.
7. Test listing creation and dashboard access.
8. Test an M-Pesa registration payment, including cancellation/timeout and retry.
9. Open the app once online, then test the offline notice and cached public pages.
10. Confirm `/api/health` reports database status and the configured AI/email services.
