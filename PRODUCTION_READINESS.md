# Production readiness

## Included backend
- Base44 entities and server functions
- OTP authentication with Twilio Verify
- Hardened PIN hashing with PBKDF2 and lockouts
- Role data stored in PhoneUser records (no hard-coded admin promotion)
- Listing/detail-request workflow
- Idempotent M-Pesa callback handling
- Notifications and support flows
- Public listing endpoint that strips confidential fields

## Required before publishing
1. Create/configure the Base44 app and set VITE_BASE44_APP_ID.
2. Add all server secrets in the deployment environment; never expose them in VITE_ variables.
3. Configure Twilio Verify.
4. Configure Safaricom Daraja credentials and callback URL.
5. Set real production domain and HTTPS.
6. Restrict entity permissions so confidential listing fields are never broadly readable.
7. Create admin accounts by securely updating their PhoneUser role in the backend.
8. Run npm ci, npm run lint, and npm run build.
9. Test OTP, PIN lockout, listing creation, approval, detail requests, M-Pesa success/failure/retry, notifications, and admin authorization.

## Important deployment note
This repository uses Base44 server functions. Publishing requires an actual Base44 project plus payment/SMS credentials. Those external accounts and secrets cannot be created or activated from this local project package.
