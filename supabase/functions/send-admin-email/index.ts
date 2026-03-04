import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map notification type → preference column
const TYPE_TO_PREF: Record<string, string> = {
  new_access_request: 'notify_access_requests',
  new_feedback: 'notify_new_feedback',
  new_inquiry: 'notify_new_inquiries',
  ticket_assigned: 'notify_ticket_assigned',
  content_activity: 'notify_new_content',
  role_changed: 'notify_access_requests',
  module_assigned: 'notify_access_requests',
  topic_assigned: 'notify_access_requests',
};

// Map notification type to email subject suffix
const TYPE_TO_SUBJECT: Record<string, string> = {
  new_access_request: 'New access request',
  new_feedback: 'New feedback received',
  new_inquiry: 'New student inquiry',
  ticket_assigned: 'Ticket assigned to you',
  content_activity: 'Content update',
  role_changed: 'Your role has been updated',
  module_assigned: 'You have been assigned to a module',
  topic_assigned: 'You have been assigned to a topic',
};

// Map notification type to CTA URL path
const TYPE_TO_PATH: Record<string, string> = {
  new_access_request: '/admin?tab=accounts',
  new_feedback: '/admin?tab=inbox',
  new_inquiry: '/admin?tab=inbox',
  ticket_assigned: '/admin?tab=inbox',
  content_activity: '/admin?tab=activity-log',
  role_changed: '/dashboard',
  module_assigned: '/dashboard',
  topic_assigned: '/dashboard',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipient_user_id, type, notification_id } = await req.json();

    if (!recipient_user_id || !type || !notification_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if this type should trigger emails
    const prefColumn = TYPE_TO_PREF[type];
    if (!prefColumn) {
      return new Response(JSON.stringify({ sent: false, reason: 'type_not_emailable' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL');
    const appUrl = Deno.env.get('PUBLIC_APP_URL') || 'https://kasrkearnhub.lovable.app';

    if (!resendApiKey || !fromEmail) {
      console.error('Missing RESEND_API_KEY or RESEND_FROM_EMAIL');
      return new Response(JSON.stringify({ sent: false, reason: 'email_not_configured' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const client = createClient(supabaseUrl, serviceKey);

    // Check email preferences
    const { data: prefs } = await client
      .from('admin_email_preferences')
      .select('*')
      .eq('user_id', recipient_user_id)
      .maybeSingle();

    // If no prefs row, use defaults (access_requests=true, content=false, etc.)
    const isOptedIn = prefs
      ? (prefs as Record<string, unknown>)[prefColumn] === true
      : (prefColumn !== 'notify_new_content'); // default: all true except content

    if (!isOptedIn) {
      return new Response(JSON.stringify({ sent: false, reason: 'opted_out' }), {
        status: 204,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch recipient email
    const { data: profile } = await client
      .from('profiles')
      .select('email, full_name')
      .eq('id', recipient_user_id)
      .single();

    if (!profile?.email) {
      return new Response(JSON.stringify({ sent: false, reason: 'no_email' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch notification content
    const { data: notification } = await client
      .from('admin_notifications')
      .select('title, message')
      .eq('id', notification_id)
      .single();

    if (!notification) {
      return new Response(JSON.stringify({ sent: false, reason: 'notification_not_found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subject = `[KALM Hub] ${TYPE_TO_SUBJECT[type] || notification.title}`;
    const ctaUrl = `${appUrl}${TYPE_TO_PATH[type] || '/admin'}`;
    const recipientName = profile.full_name || 'Admin';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:#f8fafc;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">
        ${notification.title}
      </h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.5;">
        ${notification.message}
      </p>
      <a href="${ctaUrl}" 
         style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
        View in KALM Hub
      </a>
    </div>
    <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;text-align:center;">
      You're receiving this because you have email notifications enabled in KALM Hub.
      <br/>Manage your preferences in Admin → Platform Settings.
    </p>
  </div>
</body>
</html>`;

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [profile.email],
        subject,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('Resend error:', errText);
      return new Response(JSON.stringify({ sent: false, reason: 'resend_error' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-admin-email:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
