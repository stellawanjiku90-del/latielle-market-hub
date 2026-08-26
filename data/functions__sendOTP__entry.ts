import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import twilio from 'npm:twilio@5.3.4';

Deno.serve(async (req) => {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return Response.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Normalize: ensure E.164 format (e.g. +254...)
    const normalized = phone.startsWith('+') ? phone : `+${phone}`;

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const apiKey = Deno.env.get('TWILIO_API_KEY');
    const apiSecret = Deno.env.get('TWILIO_API_SECRET');
    const verifySid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');

    const client = twilio(apiKey, apiSecret, { accountSid });

    await client.verify.v2.services(verifySid).verifications.create({
      to: normalized,
      channel: 'sms',
    });

    return Response.json({ success: true, phone: normalized });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});