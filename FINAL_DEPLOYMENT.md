# LATIELLE MARKET HUB — deployment

The application is designed to run as one Render Web Service.

Build:
`npm install && npm run build`

Start:
`npm start`

The Express server serves the Vite production build and `/api/*` from the same origin.

## Secrets
Set real credentials in Render Environment. Never put secrets in React code, `VITE_*` variables, GitHub, or the ZIP archive.

For the support chat, set:
- `OPENAI_API_KEY` to the current OpenAI project key.
- `OPENAI_MODEL=gpt-5.6-luna`.

The backend owns the support instructions and sends requests to OpenAI's Responses API. The browser only sends conversation text to `/api/ai`.

For support email, use the verified domain sender:
`LATIELLE MARKET HUB <support@latiellemarkethub.co.ke>`

Send support notifications to:
`realityofafrica2023@gmail.com`
