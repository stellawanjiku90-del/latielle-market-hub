import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ADMIN_EMAIL = "realityofafrica2023@gmail.com";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_name, user_email, message, conversation_id } = await req.json();

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: ADMIN_EMAIL,
      from_name: "LATIELLE MARKET HUB",
      subject: `🔔 Support Chat Request from ${user_name || user_email}`,
      body: `
Hello,

A user has requested to chat directly with LATIELLE MARKET HUB support.

━━━━━━━━━━━━━━━━━━━━━━━
👤 User: ${user_name || "Unknown"}
📧 Email: ${user_email || "Not provided"}
💬 Their message: "${message || "No initial message provided"}"
🆔 Conversation ID: ${conversation_id}
━━━━━━━━━━━━━━━━━━━━━━━

Please log in to the Admin Dashboard → Conversations tab to respond.

Direct link: https://app.latielle.com/admin

— LATIELLE MARKET HUB System
      `.trim(),
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
