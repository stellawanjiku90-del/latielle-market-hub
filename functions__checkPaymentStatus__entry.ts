import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { checkoutRequestId } = await req.json();
    if (!checkoutRequestId) {
      return Response.json({ error: 'checkoutRequestId is required' }, { status: 400 });
    }

    const matches = await base44.asServiceRole.entities.DetailRequest.filter({
      checkout_request_id: checkoutRequestId,
    });

    if (matches.length === 0) {
      return Response.json({ status: 'pending', payment_status: 'pending' });
    }

    const dr = matches[0];
    return Response.json({
      status: dr.status,
      payment_status: dr.payment_status,
      detail_request_id: dr.id,
    });
  } catch (error) {
    console.error('checkPaymentStatus error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});