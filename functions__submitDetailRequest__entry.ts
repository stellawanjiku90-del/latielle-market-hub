import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAuthenticated, jsonError } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireAuthenticated(base44);
    const { listingId, message } = await req.json();
    if (!listingId) return Response.json({ error: 'listingId is required' }, { status: 400 });

    const listing = await base44.asServiceRole.entities.BusinessListing.get(listingId);
    if (!listing || listing.status !== 'approved') return Response.json({ error: 'Listing is unavailable' }, { status: 404 });

    const buyerEmail = user.email || user.phone || user.phone_number || user.id;
    const existing = await base44.asServiceRole.entities.DetailRequest.filter({ listing_id: listingId, buyer_email: buyerEmail, payment_status: 'paid' });
    if (existing?.length) return Response.json({ success: true, detail_request_id: existing[0].id, already_exists: true });

    const detailRequest = await base44.asServiceRole.entities.DetailRequest.create({
      listing_id: listingId,
      buyer_email: buyerEmail,
      seller_email: listing.created_by || '',
      status: 'pending_approval',
      payment_status: 'paid',
      message: String(message || '').slice(0, 2000),
      listing_title: listing.title || '',
    });
    return Response.json({ success: true, detail_request_id: detailRequest.id });
  } catch (error) { return jsonError(error); }
});