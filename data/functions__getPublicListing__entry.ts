import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { listingId } = await req.json();
    if (!listingId) return Response.json({ error: "listingId is required" }, { status: 400 });
    const listing = await base44.asServiceRole.entities.BusinessListing.get(listingId);
    if (!listing || listing.status !== "approved") return Response.json({ error: "Not found" }, { status: 404 });
    const { exact_location, location_lat, location_lng, business_licence, registration_cert, owner_id_docs,
      financial_docs, supplier_info, staff_info, lease_docs, seller_phone, admin_notes, ...publicListing } = listing;
    return Response.json({ success: true, listing: publicListing });
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
});
