import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { buyerEmail, listingTitle, content, type } = await req.json();
    if (!buyerEmail || !content) {
      return Response.json({ error: 'buyerEmail and content are required' }, { status: 400 });
    }

    // Only send an email if the buyer identifier is actually an email address.
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail);
    if (!isEmail) {
      return Response.json({ success: true, emailed: false, note: 'Buyer has no email on file; response recorded only.' });
    }

    const subject = type === 'rejection'
      ? `Update on your request${listingTitle ? ` for ${listingTitle}` : ''}`
      : `Response to your request${listingTitle ? ` for ${listingTitle}` : ''}`;

    const body = `Hello,\n\n${content}\n\n— LATIELLE Market Hub Team`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'LATIELLE Market Hub',
      to: buyerEmail,
      subject,
      body,
    });

    return Response.json({ success: true, emailed: true });
  } catch (error) {
    console.error('notifyBuyerResponse error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
