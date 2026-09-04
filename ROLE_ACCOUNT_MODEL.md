# LATIELLE MARKET HUB — Buyer/Seller Account Model

A single Kenyan phone number may have **two separate verified accounts**:

- one `buyer` account
- one `seller` account

The same 4-digit PIN may be used for both accounts. The role selected on the login screen is sent to the server and is part of authentication. The server authenticates `phone + role + PIN`, returns the matching account, and the frontend immediately routes to that account's dashboard.

## Routing

- Buyer → `/buyer-dashboard`
- Seller → `/seller-dashboard`
- Admin → `/admin`

There is no in-account buyer/seller mode switch. A user who has both accounts chooses the account type at login.

## Registration

Buyer and Seller registration are role-specific. The same phone can complete the KSh 100 verification flow once for each role. Pending registrations are unique by `(phone, role)`.

## Database

`users` uses a unique `(phone, role)` index rather than a globally unique phone index. Generated internal emails are also role-specific so the database's existing unique email constraint does not collide between the two role accounts.
