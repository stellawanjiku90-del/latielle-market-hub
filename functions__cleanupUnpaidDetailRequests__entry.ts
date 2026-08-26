import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all DetailRequest records that are pending or unpaid
    const pending = await base44.asServiceRole.entities.DetailRequest.filter({ payment_status: 'pending' });
    const unpaid = await base44.asServiceRole.entities.DetailRequest.filter({ payment_status: 'unpaid' });

    const candidates = [...pending, ...unpaid].filter(
      (r) => !r.mpesa_receipt || r.mpesa_receipt.trim() === ''
    );

    let deletedCount = 0;
    for (const record of candidates) {
      await base44.asServiceRole.entities.DetailRequest.delete(record.id);
      deletedCount++;
    }

    console.log(`Deleted ${deletedCount} unpaid/pending DetailRequest records with no receipt.`);

    return Response.json({ success: true, deletedCount });
  } catch (error) {
    console.error('cleanupUnpaidDetailRequests error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});