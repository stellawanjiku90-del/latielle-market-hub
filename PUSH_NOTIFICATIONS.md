# LATIELLE MARKET HUB — Push Notifications

## What is included

Buyer browser push notifications are registered automatically when supported. There is no in-app enable/disable control.

Buyers receive:
- **New business available** when an administrator publishes/approves a listing.
- **Business marked as sold** when an administrator marks an approved/active listing as sold.

The same events are also stored in the existing in-app Notifications feed.

## Production setup on Render

Web Push uses VAPID keys. Do not commit the private key to GitHub.

Set these Render environment variables:

- `VAPID_SUBJECT` = `mailto:realityofafrica2023@gmail.com`
- `VAPID_PUBLIC_KEY` = your VAPID public key
- `VAPID_PRIVATE_KEY` = your VAPID private key

After `web-push` has been installed by the Render build, generate a key pair with:

```bash
npx web-push generate-vapid-keys
```

Copy the generated public and private keys into Render Environment → Environment Variables.

## Browser behavior

Push registration is automatic. Each browser/device gets its own subscription, which is re-synced for the logged-in buyer. The browser/OS may still require the user to grant notification permission; websites cannot override a permission that the user has denied or a browser policy that requires a user gesture. Removing an in-app enable/disable control does not override browser-level notification settings. Expired subscriptions are handled automatically.

Push delivery is best-effort: the in-app notification is still created even when a push endpoint is unavailable.

## Android / Play Store

The current web implementation uses the browser Push API. A native Android WebView does not reliably provide browser Web Push. For the Play Store AAB, native Firebase Cloud Messaging (FCM) should be added to the Android wrapper if native push notifications are required inside the installed Android app.
