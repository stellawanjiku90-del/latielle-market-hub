# LATIELLE MARKET HUB — Push Notifications

## What is included

Buyer accounts can opt in to browser push notifications from the Buyer Dashboard → Alerts.

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

A buyer must explicitly click **Enable notifications** and grant browser permission. Each browser/device gets its own subscription. Removing an expired subscription is handled automatically.

Push delivery is best-effort: the in-app notification is still created even when a push endpoint is unavailable.

## Android / Play Store

The current web implementation uses the browser Push API. A native Android WebView does not reliably provide browser Web Push. For the Play Store AAB, native Firebase Cloud Messaging (FCM) should be added to the Android wrapper if native push notifications are required inside the installed Android app.
