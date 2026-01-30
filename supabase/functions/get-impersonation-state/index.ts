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

    // Find active, non-expired impersonation session for this actor
    const now = new Date().toISOString();
    
    const { data: activeSession } = await serviceClient
      .from('impersonation_sessions')
      .select('id, effective_user_id, expires_at')
      .eq('actor_id', user.id)
      .is('ended_at', null)
      .gt('expires_at', now)
      .single();

    if (!activeSession) {
      // No active impersonation
      return new Response(
        JSON.stringify({
          isImpersonating: false,
          effectiveUserId: null,
          effectiveUserName: null,
          effectiveUserEmail: null,
          sessionId: null,
          expiresAt: null,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get effective user profile
    const { data: effectiveProfile } = await serviceClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', activeSession.effective_user_id)
      .single();

    return new Response(
      JSON.stringify({
        isImpersonating: true,
        effectiveUserId: activeSession.effective_user_id,
        effectiveUserName: effectiveProfile?.full_name || null,
        effectiveUserEmail: effectiveProfile?.email || null,
        sessionId: activeSession.id,
        expiresAt: activeSession.expires_at,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-impersonation-state:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
