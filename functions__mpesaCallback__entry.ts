import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);
    const callback = body?.Body?.stkCallback;
    if (!callback?.CheckoutRequestID) return Response.json({ ResultCode: 1, ResultDesc: 'Invalid callback payload' });

    const requests = await base44.asServiceRole.entities.DetailRequest.filter({ checkout_request_id: callback.CheckoutRequestID });
    if (!requests?.length) return Response.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    const detailRequest = requests[0];

    // Idempotency: successful callbacks can be retried safely.
    if (detailRequest.payment_status === 'paid') return Response.json({ ResultCode: 0, ResultDesc: 'Already processed' });

    const items = callback.CallbackMetadata?.Item || [];
    const receipt = items.find((x: any) => x.Name === 'MpesaReceiptNumber')?.Value || '';
    const amount = Number(items.find((x: any) => x.Name === 'Amount')?.Value || 0);

    if (callback.ResultCode === 0) {
      await base44.asServiceRole.entities.DetailRequest.update(detailRequest.id, {
        payment_status: 'paid', status: 'pending_approval', amount_paid: amount, mpesa_receipt: receipt
      });
      const txs = await base44.asServiceRole.entities.Transaction.filter({ reference_id: detailRequest.id, status: 'pending' });
      if (txs?.[0]) await base44.asServiceRole.entities.Transaction.update(txs[0].id, { status: 'successful', amount, mpesa_receipt: receipt });
    } else {
      await base44.asServiceRole.entities.DetailRequest.update(detailRequest.id, { payment_status: 'failed', status: 'pending_payment' });
      const txs = await base44.asServiceRole.entities.Transaction.filter({ reference_id: detailRequest.id, status: 'pending' });
      if (txs?.[0]) await base44.asServiceRole.entities.Transaction.update(txs[0].id, { status: 'failed' });
    }
    return Response.json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (error) {
    console.error('mpesaCallback error', error);
    return Response.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});