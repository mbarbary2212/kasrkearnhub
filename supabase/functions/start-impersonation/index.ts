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

    // Check if caller is platform_admin or super_admin
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: callerRole } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!callerRole || !['platform_admin', 'super_admin'].includes(callerRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Only Platform Admins and Super Admins can impersonate users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { targetUserId } = await req.json();
    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'targetUserId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate target user exists and is a student
    const { data: targetRole } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUserId)
      .single();

    if (!targetRole) {
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (targetRole.role !== 'student') {
      return new Response(
        JSON.stringify({ error: 'Can only impersonate students' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // End any existing active impersonation for this actor
    await serviceClient
      .from('impersonation_sessions')
      .update({
        ended_at: new Date().toISOString(),
        end_reason: 'new_session',
      })
      .eq('actor_id', user.id)
      .is('ended_at', null);

    // Create new impersonation session (30 min expiry)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    
    const { data: session, error: insertError } = await serviceClient
      .from('impersonation_sessions')
      .insert({
        actor_id: user.id,
        effective_user_id: targetUserId,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to create impersonation session:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create impersonation session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user profile
    const { data: targetProfile } = await serviceClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', targetUserId)
      .single();

    // Log the impersonation start to activity_logs
    await serviceClient
      .from('activity_logs')
      .insert({
        actor_user_id: user.id,
        actor_role: callerRole.role,
        action: 'impersonation_started',
        entity_type: 'impersonation',
        entity_id: session.id,
        metadata: {
          effective_user_id: targetUserId,
          effective_user_email: targetProfile?.email,
          effective_user_name: targetProfile?.full_name,
        },
      });

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        effectiveUserId: targetUserId,
        effectiveUserName: targetProfile?.full_name || null,
        effectiveUserEmail: targetProfile?.email || null,
        expiresAt,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in start-impersonation:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
