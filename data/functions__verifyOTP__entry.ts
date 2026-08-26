import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import twilio from 'npm:twilio@5.3.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { phone, code, role } = await req.json();

    if (!phone || !code) {
      return Response.json({ error: 'Phone and code are required' }, { status: 400 });
    }

    const normalized = phone.startsWith('+') ? phone : `+${phone}`;

    const ADMIN_PHONES = ['+254703927978', '+254706692111'];
    const isAdmin = ADMIN_PHONES.includes(normalized);

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const apiKey = Deno.env.get('TWILIO_API_KEY');
    const apiSecret = Deno.env.get('TWILIO_API_SECRET');
    const verifySid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');

    const client = twilio(apiKey, apiSecret, { accountSid });

    const verification = await client.verify.v2.services(verifySid).verificationChecks.create({
      to: normalized,
      code,
    });

    if (verification.status !== 'approved') {
      return Response.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.PhoneUser.filter({ phone_number: normalized });

    let user;
    if (existing && existing.length > 0) {
      user = existing[0];
      const updates = { is_verified: true };
      if (isAdmin && user.role !== 'admin') updates.role = 'admin';
      await base44.asServiceRole.entities.PhoneUser.update(user.id, updates);
      user = { ...user, ...updates };
    } else {
      const assignedRole = isAdmin ? 'admin' : (role === 'seller') ? 'seller' : 'buyer';
      user = await base44.asServiceRole.entities.PhoneUser.create({
        phone_number: normalized,
        is_verified: true,
        role: assignedRole,
      });
    }

    return Response.json({
      success: true,
      user: {
        id: user.id,
        phone_number: user.phone_number,
        full_name: user.full_name || '',
        role: user.role || 'buyer',
        has_pin: !!user.has_pin,
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});