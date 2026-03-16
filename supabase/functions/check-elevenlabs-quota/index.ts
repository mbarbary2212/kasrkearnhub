import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function mapToBrevoPayload(params: { toEmail: string; toName: string; subject: string; html: string }) {
  return {
    sender: { name: 'SurgTeach', email: 'no-reply@kalmhub.com' },
    to: [{ email: params.toEmail, name: params.toName }],
    subject: params.subject,
    htmlContent: params.html,
  };
}

async function sendEmail(params: {
  resendApiKey: string;
  fromEmail: string;
  toEmail: string;
  toName: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; provider: string }> {
  // Try Resend first
  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: params.fromEmail,
        to: [params.toEmail],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (resendRes.ok) {
      return { sent: true, provider: 'resend' };
    }
    const errText = await resendRes.text();
    console.warn(`Resend error (${resendRes.status}), falling back to Brevo: ${errText}`);
  } catch (err) {
    console.warn('Resend threw an error, falling back to Brevo:', err);
  }

  // Fallback to Brevo
  const brevoApiKey = Deno.env.get('BREVO_API_KEY');
  if (!brevoApiKey) {
    throw new Error('Resend failed and BREVO_API_KEY is not configured');
  }

  const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': brevoApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mapToBrevoPayload(params)),
  });

  if (!brevoRes.ok) {
    const brevoErr = await brevoRes.text();
    throw new Error(`Both Resend and Brevo failed. Brevo error: ${brevoErr}`);
  }

  return { sent: true, provider: 'brevo' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const elevenlabsKey = Deno.env.get('ELEVENLABS_API_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL');
    const appUrl = Deno.env.get('PUBLIC_APP_URL') || 'https://kasrkearnhub.lovable.app';

    if (!elevenlabsKey) {
      return new Response(JSON.stringify({ error: 'ELEVENLABS_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch ElevenLabs quota
    const elResponse = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': elevenlabsKey },
    });

    if (!elResponse.ok) {
      const errText = await elResponse.text();
      console.error('ElevenLabs API error:', errText);
      return new Response(JSON.stringify({ error: 'Failed to fetch ElevenLabs quota', details: errText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userData = await elResponse.json();
    const characterCount = userData.subscription?.character_count ?? 0;
    const characterLimit = userData.subscription?.character_limit ?? 0;
    const remaining = characterLimit - characterCount;
    const percentUsed = characterLimit > 0 ? Math.round((characterCount / characterLimit) * 100) : 0;
    const percentRemaining = 100 - percentUsed;

    console.log(`ElevenLabs quota: ${remaining} remaining (${characterCount}/${characterLimit}, ${percentRemaining}% left)`);

    const client = createClient(supabaseUrl, serviceKey);

    // 2. Read threshold from ai_settings
    const { data: thresholdSetting } = await client
      .from('ai_settings')
      .select('value')
      .eq('key', 'elevenlabs_alert_threshold')
      .single();

    const threshold = typeof thresholdSetting?.value === 'number'
      ? thresholdSetting.value
      : 5000;

    const isCritical = remaining < threshold;

    // 3. Get all super/platform admin user IDs
    const { data: adminRoles } = await client
      .from('user_roles')
      .select('user_id')
      .in('role', ['super_admin', 'platform_admin']);

    const adminUserIds = [...new Set((adminRoles || []).map(r => r.user_id))];

    if (adminUserIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No admins found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Insert daily summary notification for all admins
    const notificationType = isCritical ? 'content_activity' : 'content_activity';
    const notificationTitle = isCritical
      ? '⚠️ ElevenLabs Credits Critical'
      : '📊 ElevenLabs Daily Credit Report';
    const notificationMessage = isCritical
      ? `Only ${remaining.toLocaleString()} credits remaining (${percentRemaining}% left). Threshold: ${threshold.toLocaleString()}. Please top up soon.`
      : `${remaining.toLocaleString()} credits remaining out of ${characterLimit.toLocaleString()} (${percentRemaining}% left).`;

    const notifications = adminUserIds.map(uid => ({
      recipient_id: uid,
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      entity_type: 'system',
      metadata: {
        character_count: characterCount,
        character_limit: characterLimit,
        remaining,
        percent_remaining: percentRemaining,
        threshold,
        is_critical: isCritical,
      },
    }));

    const { error: notifError } = await client
      .from('admin_notifications')
      .insert(notifications);

    if (notifError) {
      console.error('Failed to insert notifications:', notifError);
    }

    let emailsSent = 0;

    // 5. If critical, send email alerts
    if (isCritical && resendApiKey && fromEmail) {
      const { data: adminProfiles } = await client
        .from('profiles')
        .select('id, email, full_name')
        .in('id', adminUserIds);

      const ctaUrl = `${appUrl}/admin?tab=platform-settings`;

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:#fef2f2;border-radius:12px;padding:32px;border:1px solid #fecaca;">
      <h2 style="margin:0 0 8px;color:#991b1b;font-size:20px;">
        ⚠️ ElevenLabs Credits Running Low
      </h2>
      <p style="margin:0 0 16px;color:#b91c1c;font-size:28px;font-weight:700;">
        ${remaining.toLocaleString()} credits remaining
      </p>
      <div style="background:#ffffff;border-radius:8px;padding:16px;margin:0 0 24px;border:1px solid #fee2e2;">
        <table style="width:100%;font-size:14px;color:#64748b;">
          <tr><td>Used</td><td style="text-align:right;font-weight:600;color:#1e293b;">${characterCount.toLocaleString()}</td></tr>
          <tr><td>Limit</td><td style="text-align:right;font-weight:600;color:#1e293b;">${characterLimit.toLocaleString()}</td></tr>
          <tr><td>Remaining</td><td style="text-align:right;font-weight:600;color:#dc2626;">${percentRemaining}%</td></tr>
          <tr><td>Alert Threshold</td><td style="text-align:right;font-weight:600;color:#1e293b;">${threshold.toLocaleString()}</td></tr>
        </table>
      </div>
      <a href="${ctaUrl}"
         style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
        View AI Settings
      </a>
    </div>
    <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;text-align:center;">
      This alert is sent when ElevenLabs credits fall below ${threshold.toLocaleString()}.
      <br/>Adjust the threshold in Admin → Platform Settings → AI Settings.
    </p>
  </div>
</body>
</html>`;

      for (const profile of (adminProfiles || [])) {
        if (!profile.email) continue;
        try {
          await sendEmail({
            resendApiKey,
            fromEmail,
            toEmail: profile.email,
            toName: profile.full_name || 'Admin',
            subject: `[KALM Hub] ⚠️ ElevenLabs credits critically low (${remaining.toLocaleString()} remaining)`,
            html,
          });
          emailsSent++;
        } catch (err) {
          console.error(`Failed to send alert to ${profile.email}:`, err);
        }
      }
    }

    return new Response(JSON.stringify({
      remaining,
      character_count: characterCount,
      character_limit: characterLimit,
      percent_remaining: percentRemaining,
      threshold,
      is_critical: isCritical,
      notifications_sent: adminUserIds.length,
      emails_sent: emailsSent,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in check-elevenlabs-quota:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
