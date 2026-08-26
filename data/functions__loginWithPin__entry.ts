import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { verifyPin } from "../_shared/pin.ts";
import { normalizePhone, jsonError } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { phone, pin } = await req.json();
    if (!phone || !pin) return Response.json({ error: 'Phone and PIN are required' }, { status: 400 });
    const normalized = normalizePhone(phone);
    const matches = await base44.asServiceRole.entities.PhoneUser.filter({ phone_number: normalized });
    if (!matches?.length) return Response.json({ error: 'Invalid phone or PIN' }, { status: 401 });
    const user = matches[0];
    const now = Date.now();
    if (user.pin_locked_until && Date.parse(user.pin_locked_until) > now) {
      return Response.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }
    if (!user.has_pin || !user.pin) return Response.json({ error: 'No PIN set. Please sign in with a verification code.' }, { status: 400 });

    const valid = await verifyPin(pin, normalized, user.pin);
    if (!valid) {
      const attempts = Number(user.failed_login_attempts || 0) + 1;
      const update: any = { failed_login_attempts: attempts };
      if (attempts >= 5) {
        update.failed_login_attempts = 0;
        update.pin_locked_until = new Date(now + 15 * 60 * 1000).toISOString();
      }
      await base44.asServiceRole.entities.PhoneUser.update(user.id, update);
      return Response.json({ error: 'Invalid phone or PIN' }, { status: 401 });
    }
    await base44.asServiceRole.entities.PhoneUser.update(user.id, { failed_login_attempts: 0, pin_locked_until: '' });
    return Response.json({ success: true, user: { id: user.id, phone_number: user.phone_number, full_name: user.full_name || '', role: user.role || 'buyer' } });
  } catch (error) { return jsonError(error); }
});