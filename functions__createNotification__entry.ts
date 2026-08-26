import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Creates an in-app notification for a recipient (buyer/seller/admin).
// Uses service role so the sender can notify the other party regardless of ownership.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipient, type, title, body, link, conversationId } = await req.json();
    if (!recipient || !title) {
      return Response.json({ error: 'recipient and title are required' }, { status: 400 });
    }

    const notification = await base44.asServiceRole.entities.Notification.create({
      recipient,
      type: type || 'general',
      title,
      body: body || '',
      link: link || '',
      conversation_id: conversationId || '',
      is_read: false,
    });

    return Response.json({ success: true, id: notification.id });
  } catch (error) {
    console.error('createNotification error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});