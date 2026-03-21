import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "https://esm.sh/svix@1.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    to: string[];
    from?: string;
    subject?: string;
    bounce?: { message: string };
    complaint?: { feedback_type?: string };
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify Svix signature
    const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('RESEND_WEBHOOK_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error('Missing Svix headers');
      return new Response(JSON.stringify({ error: 'Missing webhook signature headers' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.text();
    const wh = new Webhook(webhookSecret);

    let event: ResendWebhookEvent;
    try {
      event = wh.verify(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ResendWebhookEvent;
    } catch (verifyError) {
      console.error('Webhook signature verification failed:', verifyError);
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Use service role to insert (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Extract data from webhook payload
    const eventType = event.type;
    const toEmail = event.data.to?.[0] || 'unknown';
    
    // Get reason based on event type
    let reason: string | null = null;
    if (eventType === 'email.bounced' && event.data.bounce?.message) {
      reason = event.data.bounce.message;
    } else if (eventType === 'email.complained' && event.data.complaint?.feedback_type) {
      reason = `Spam complaint: ${event.data.complaint.feedback_type}`;
    }

    // Insert event into database
    const { error } = await supabaseAdmin.from('email_events').insert({
      resend_email_id: event.data.email_id,
      to_email: toEmail.toLowerCase(),
      event_type: eventType,
      status: eventType.replace('email.', ''),
      reason: reason,
      metadata: event,
    });

    if (error) {
      console.error('Database insert error:', error.message);
      throw error;
    }

    console.log(`Email event received: ${eventType} for ${toEmail}`);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Webhook error:', error.message);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
