import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify the caller's identity
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Find active impersonation session for this actor
    const { data: activeSession } = await serviceClient
      .from('impersonation_sessions')
      .select('id, effective_user_id')
      .eq('actor_id', user.id)
      .is('ended_at', null)
      .single();

    if (!activeSession) {
      return new Response(
        JSON.stringify({ error: 'No active impersonation session found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // End the session
    const { error: updateError } = await serviceClient
      .from('impersonation_sessions')
      .update({
        ended_at: new Date().toISOString(),
        end_reason: 'manual',
      })
      .eq('id', activeSession.id);

    if (updateError) {
      console.error('Failed to end impersonation session:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to end impersonation session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get caller's role for logging
    const { data: callerRole } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    // Log the impersonation end to activity_logs
    await serviceClient
      .from('activity_logs')
      .insert({
        actor_user_id: user.id,
        actor_role: callerRole?.role || null,
        action: 'impersonation_ended',
        entity_type: 'impersonation',
        entity_id: activeSession.id,
        metadata: {
          effective_user_id: activeSession.effective_user_id,
          end_reason: 'manual',
        },
      });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in end-impersonation:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
