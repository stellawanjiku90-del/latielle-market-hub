# Production readiness

## Included
- React/Vite frontend
- Express/PostgreSQL backend
- Phone/PIN authentication and role protection
- Business listings and confidential-detail requests
- M-Pesa STK Push and callback handling
- Support requests and Resend email notifications
- Public listing responses that exclude confidential fields
- OpenAI-powered public support chat routed through the backend
- Cache-safe production shell; legacy service-worker registrations are explicitly removed

## Render configuration
Build command:
`npm install && npm run build`

Start command:
`npm start`

Required environment variables are listed in `.env.example`. At minimum, the server requires `DATABASE_URL` and `JWT_SECRET`; production chat requires `OPENAI_API_KEY`.

## Before going live
1. Set the real PostgreSQL connection URL and verify the production schema migration completes successfully.
2. Set a strong `JWT_SECRET`.
3. Set the production M-Pesa/Daraja credentials and callback URL.
4. Set `OPENAI_API_KEY` and `OPENAI_MODEL=gpt-5.6-luna`.
5. Set `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL` such as `LATIELLE MARKET HUB <support@latiellemarkethub.co.ke>`.
6. Keep `SUPPORT_NOTIFICATION_EMAIL=realityofafrica2023@gmail.com` unless the support destination changes.
7. Run `npm run lint` and `npm run build` before deployment. Confirm there are no build-time warnings that affect runtime behavior.
8. Test registration, login, role-specific dashboards, listing creation, buyer requests, M-Pesa success/failure/retry, private document access, support email and the public chat.
