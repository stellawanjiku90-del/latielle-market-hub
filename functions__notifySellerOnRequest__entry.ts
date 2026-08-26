import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const request = body.data;
    if (!request) return Response.json({ skipped: true, reason: 'No data' });

    const sellerEmail = request.seller_email;
    const buyerEmail = request.buyer_email;
    const listingTitle = request.listing_title || 'your business listing';
    const message = request.message || '';

    if (!sellerEmail) return Response.json({ skipped: true, reason: 'No seller email on request' });

    // Try Gmail connector — skip gracefully if not connected
    let accessToken = null;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('gmail');
      accessToken = conn.accessToken;
    } catch (_) {
      console.log('Gmail connector not connected — skipping email notification');
      return Response.json({ skipped: true, reason: 'Gmail not connected' });
    }

    const subject = `New Detail Request: ${listingTitle}`;
    const bodyText = [
      `Hello,`,
      ``,
      `A buyer has requested confidential details about your listing on Latielle Market Hub.`,
      ``,
      `Listing: ${listingTitle}`,
      `Buyer: ${buyerEmail}`,
      message ? `Message from buyer:\n"${message}"` : '',
      ``,
      `Please log in to your Seller Dashboard to review and respond.`,
      ``,
      `https://latiellemarkethub.co.ke/seller-dashboard`,
      ``,
      `– Latielle Market Hub Team`,
    ].filter(Boolean).join('\n');

    const mimeMessage = [
      `To: ${sellerEmail}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      bodyText,
    ].join('\r\n');

    const encoded = btoa(unescape(encodeURIComponent(mimeMessage)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    });

    if (!sendRes.ok) {
      const err = await sendRes.text();
      console.error('Gmail send failed:', err);
      return Response.json({ skipped: true, reason: 'Gmail send failed' });
    }

    return Response.json({ success: true, notified: sellerEmail });
  } catch (error) {
    console.error('notifySellerOnRequest error:', error.message);
    return Response.json({ skipped: true, reason: error.message });
  }
});