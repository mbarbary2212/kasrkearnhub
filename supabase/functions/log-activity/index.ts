import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActivityLogPayload {
  action: string;
  entity_type: string;
  entity_id?: string | null;
  scope?: {
    module_id?: string | null;
    chapter_id?: string | null;
    topic_id?: string | null;
  } | null;
  metadata?: Record<string, unknown> | null;
}

const MAX_METADATA_SIZE = 4096; // 4KB limit

// Allowlists for validation (governance)
const ALLOWED_ENTITY_TYPES = [
  'mcq', 'essay', 'osce', 'flashcard',
  'resource', 'lecture', 'clinical_case', 'matching',
];

const ALLOWED_ACTIONS = [
  // MCQ
  'created_mcq', 'updated_mcq', 'deleted_mcq', 'bulk_upload_mcq',
  // Essay
  'created_essay', 'updated_essay', 'deleted_essay', 'bulk_upload_essay',
  // OSCE
  'created_osce', 'updated_osce', 'deleted_osce', 'bulk_upload_osce',
  // Flashcard
  'created_flashcard', 'updated_flashcard', 'deleted_flashcard', 'bulk_upload_flashcard',
];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user with anon client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    // Get user's role
    const { data: roleData } = await anonClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const userRole = roleData?.role || null;

    // Parse payload
    const payload: ActivityLogPayload = await req.json();

    // Validate required fields
    if (!payload.action || !payload.entity_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, entity_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate action and entity_type against allowlist
    if (!ALLOWED_ACTIONS.includes(payload.action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action: ${payload.action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!ALLOWED_ENTITY_TYPES.includes(payload.entity_type)) {
      return new Response(
        JSON.stringify({ error: `Invalid entity_type: ${payload.entity_type}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate metadata size
    if (payload.metadata) {
      const metadataStr = JSON.stringify(payload.metadata);
      if (metadataStr.length > MAX_METADATA_SIZE) {
        return new Response(
          JSON.stringify({ error: `Metadata exceeds max size of ${MAX_METADATA_SIZE} bytes` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Insert using service role (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { error: insertError } = await serviceClient
      .from('activity_logs')
      .insert({
        actor_user_id: user.id,
        actor_role: userRole,
        action: payload.action,
        entity_type: payload.entity_type,
        entity_id: payload.entity_id || null,
        scope: payload.scope || null,
        metadata: payload.metadata || null,
      });

    if (insertError) {
      console.error('Failed to insert activity log:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to log activity' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in log-activity:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
