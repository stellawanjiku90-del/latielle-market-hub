import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { hashPin } from "../_shared/pin.ts";
import { normalizePhone, jsonError } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { userId, phone, pin } = await req.json();
    if (!userId || !phone || !pin) return Response.json({ error: 'userId, phone and pin are required' }, { status: 400 });
    if (!/^\d{4,8}$/.test(pin)) return Response.json({ error: 'PIN must be 4 to 8 digits' }, { status: 400 });

    const normalized = normalizePhone(phone);
    const users = await base44.asServiceRole.entities.PhoneUser.filter({ id: userId });
    if (!users?.length || users[0].phone_number !== normalized) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const hashed = await hashPin(pin, normalized);
    await base44.asServiceRole.entities.PhoneUser.update(userId, {
      pin: hashed, has_pin: true, failed_login_attempts: 0, pin_locked_until: ''
    });
    return Response.json({ success: true });
  } catch (error) { return jsonError(error); }
});
