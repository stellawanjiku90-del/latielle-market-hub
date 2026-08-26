import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const listing = body.data;
    if (!listing || listing.status !== 'approved') {
      return Response.json({ skipped: true, reason: 'Not an approved listing' });
    }

    // Fetch all active buyer preferences
    const preferences = await base44.asServiceRole.entities.BuyerPreference.filter({ is_active: true });
    if (!preferences.length) return Response.json({ notified: 0 });

    let notified = 0;

    for (const pref of preferences) {
      // County match — buyer must have this listing's county in their list
      const countyMatch = pref.counties?.includes(listing.county);
      if (!countyMatch) continue;

      // Budget match
      const price = listing.asking_price || 0;
      if (pref.max_budget && price > pref.max_budget) continue;
      if (pref.min_budget && price < pref.min_budget) continue;

      // Category match (empty = any category)
      if (pref.categories?.length > 0 && !pref.categories.includes(listing.category)) continue;

      // Send email
      const listingTitle = listing.title || `${listing.category} in ${listing.county}`;
      const priceText = `KES ${price.toLocaleString()}`;
      const budgetText = pref.max_budget ? `KES ${pref.max_budget.toLocaleString()}` : 'your budget';

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: pref.buyer_email,
        from_name: 'BizTrust Kenya',
        subject: `🔔 New Business Match: ${listingTitle}`,
        body: `
Hello ${pref.buyer_name || 'there'},

A new business listing has been posted on BizTrust Kenya that matches your alert criteria!

📌 Business: ${listingTitle}
📍 Location: ${listing.county}
🏷️ Category: ${listing.category}
💰 Asking Price: ${priceText}
${listing.monthly_revenue_range ? `📈 Monthly Revenue: ${listing.monthly_revenue_range}` : ''}
${listing.years_operating ? `⏳ Years Operating: ${listing.years_operating}` : ''}

${listing.description ? listing.description.slice(0, 200) + (listing.description.length > 200 ? '...' : '') : ''}

You're receiving this alert because you have a saved alert for businesses in ${pref.counties.join(', ')} within ${budgetText}.

View this listing: https://biztrust.base44.app/listing/${listing.id}

To manage your alerts, visit your Buyer Dashboard.

– BizTrust Kenya Team
        `.trim(),
      });

      notified++;
    }

    return Response.json({ notified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
