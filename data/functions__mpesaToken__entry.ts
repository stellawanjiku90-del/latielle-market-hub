import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET');
    const credentials = btoa(`${consumerKey}:${consumerSecret}`);

    const res = await fetch('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${credentials}` },
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: `OAuth failed: ${text}` }, { status: 502 });
    }

    const data = await res.json();
    return Response.json({ access_token: data.access_token, expires_in: data.expires_in });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
