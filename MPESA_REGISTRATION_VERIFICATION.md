# KSh 100 M-Pesa Registration Verification

New buyer/seller signup requires a one-time KSh 100 M-Pesa STK Push. No Twilio is used.

Required Render variables:
- DATABASE_URL
- JWT_SECRET
- MPESA_SHORTCODE
- MPESA_PASSKEY
- MPESA_CONSUMER_KEY
- MPESA_CONSUMER_SECRET
- MPESA_CALLBACK_URL=https://YOUR-RENDER-DOMAIN/api/payments/mpesa/callback
- MPESA_ENV=production
- MPESA_TRANSACTION_TYPE=CustomerPayBillOnline (use CustomerBuyGoodsOnline if the shortcode is a Till)

The callback only activates an account when Safaricom reports success, the amount is exactly KSh 100, and the callback phone matches the pending registration.
