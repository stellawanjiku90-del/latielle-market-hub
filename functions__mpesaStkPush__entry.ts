import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { phone, amount, listingId, buyerEmail, sellerEmail, listingTitle, message } = await req.json();

    if (!phone || !amount || !listingId || !buyerEmail) {
      return Response.json({ error: 'phone, amount, listingId and buyerEmail are required' }, { status: 400 });
    }

    // --- Normalize phone to 2547XXXXXXXX format ---
    let normalizedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '');
    if (normalizedPhone.startsWith('0')) normalizedPhone = '254' + normalizedPhone.slice(1);
    if (!normalizedPhone.startsWith('254')) normalizedPhone = '254' + normalizedPhone;

    const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET');
    const passkey = Deno.env.get('MPESA_PASSKEY');

    // Buy Goods (Till) setup:
    // - BusinessShortCode & Password use the store number (head office short code)
    // - PartyB uses the actual Till number
    const businessShortCode = '4646497';
    const tillNumber = '9285991';

    // --- Step 1: Get OAuth token ---
    const credentials = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenRes = await fetch('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      method: 'GET',
      headers: { Authorization: `Basic ${credentials}` },
    });

    if (!tokenRes.ok) {
      const tokenErr = await tokenRes.text();
      console.error('M-Pesa token error:', tokenErr);
      return Response.json({ success: false, error: 'Failed to get M-Pesa access token' });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('No access_token in response:', JSON.stringify(tokenData));
      return Response.json({ success: false, error: 'No access token returned from M-Pesa' });
    }

    // --- Step 2: Create DetailRequest record (pending_payment) ---
    const detailRequest = await base44.asServiceRole.entities.DetailRequest.create({
      listing_id: listingId,
      buyer_email: buyerEmail,
      seller_email: sellerEmail || '',
      status: 'pending_payment',
      payment_status: 'pending',
      message: message || '',
      listing_title: listingTitle || '',
    });

    // --- Step 3: Build STK Push payload ---
    const now = new Date();
    const timestamp = now.getFullYear().toString()
      + String(now.getMonth() + 1).padStart(2, '0')
      + String(now.getDate()).padStart(2, '0')
      + String(now.getHours()).padStart(2, '0')
      + String(now.getMinutes()).padStart(2, '0')
      + String(now.getSeconds()).padStart(2, '0');

    const password = btoa(`${businessShortCode}${passkey}${timestamp}`);

    // Safaricom requires a publicly accessible HTTPS URL
    const callbackUrl = 'https://latiellemarkethub.co.ke/functions/mpesaCallback';

    const stkPayload = {
      BusinessShortCode: businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerBuyGoodsOnline',
      Amount: Math.ceil(amount),
      PartyA: normalizedPhone,
      PartyB: tillNumber,
      PhoneNumber: normalizedPhone,
      CallBackURL: callbackUrl,
      // Pass the detailRequest ID as AccountReference so the callback can update the right record
      AccountReference: detailRequest.id,
      TransactionDesc: `Details for ${listingTitle || 'listing'}`,
    };

    console.log('STK Push payload:', JSON.stringify({ ...stkPayload, Password: '***' }));

    // --- Step 4: Trigger STK Push ---
    const stkRes = await fetch('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPayload),
    });

    const stkData = await stkRes.json();
    console.log('STK Push response:', JSON.stringify(stkData));

    if (stkData.ResponseCode !== '0') {
      // STK failed — delete the DetailRequest so it doesn't show on dashboard
      await base44.asServiceRole.entities.DetailRequest.delete(detailRequest.id);
      return Response.json({
        success: false,
        error: stkData.errorMessage || stkData.ResponseDescription || 'STK push failed',
        raw: stkData,
      });
    }

    // Store CheckoutRequestID on the DetailRequest so the callback can find it
    // (AccountReference gets truncated to 12 chars by Safaricom)
    await base44.asServiceRole.entities.DetailRequest.update(detailRequest.id, {
      checkout_request_id: stkData.CheckoutRequestID,
    });

    // --- Step 5: Record pending transaction ---
    await base44.asServiceRole.entities.Transaction.create({
      user_email: buyerEmail,
      phone_number: normalizedPhone,
      amount: Math.ceil(amount),
      service_type: 'detail_request',
      reference_id: detailRequest.id,
      status: 'pending',
      description: `M-Pesa STK Push | CheckoutRequestID: ${stkData.CheckoutRequestID}`,
    });

    return Response.json({
      success: true,
      CheckoutRequestID: stkData.CheckoutRequestID,
      ResponseDescription: stkData.ResponseDescription,
    });

  } catch (error) {
    console.error('mpesaStkPush error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});