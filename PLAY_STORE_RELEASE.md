# LATIELLE MARKET HUB — Release Notes

## Web production
- Render build command: `npm install --include=dev --no-audit --no-fund && npm run build`
- Start command: `npm start`
- Node: 22.16.0
- Health check: `/api/health`
- PWA manifest and installable icons included.
- Service-worker cache version bumped to prevent stale deployments.

## Android / Google Play
This repository is a web/PWA application. It is **not yet an Android Studio/AAB project**. A Play Store upload requires a signed Android App Bundle and a completed Google Play Console listing/data-safety declaration. Do not claim that this ZIP alone is an uploaded Play Store app.

The recommended next step is to package this stable production URL with a maintained Android wrapper (for example Capacitor or Trusted Web Activity), then build and sign the AAB. The final Android package name and signing identity must be chosen before generating `assetlinks.json` and Play Store assets.
