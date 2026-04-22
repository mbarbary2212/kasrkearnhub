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
  'department',
  'mcq_review_session',
];

const ALLOWED_ACTIONS = [
  // MCQ
  'created_mcq', 'updated_mcq', 'deleted_mcq', 'bulk_upload_mcq',
  'completed_mcq_review_session',
  // Essay
  'created_essay', 'updated_essay', 'deleted_essay', 'bulk_upload_essay',
  // OSCE
  'created_osce', 'updated_osce', 'deleted_osce', 'bulk_upload_osce',
  // Flashcard
  'created_flashcard', 'updated_flashcard', 'deleted_flashcard', 'bulk_upload_flashcard',
  // Department
  'created_department', 'updated_department', 'deleted_department',
];

// Map actions to friendly labels for notifications
const ACTION_LABELS: Record<string, string> = {
  created_mcq: 'created an MCQ',
  updated_mcq: 'updated an MCQ',
  deleted_mcq: 'deleted an MCQ',
  bulk_upload_mcq: 'bulk uploaded MCQs',
  created_essay: 'created an Essay',
  updated_essay: 'updated an Essay',
  deleted_essay: 'deleted an Essay',
  bulk_upload_essay: 'bulk uploaded Essays',
  created_osce: 'created an OSCE',
  updated_osce: 'updated an OSCE',
  deleted_osce: 'deleted an OSCE',
  bulk_upload_osce: 'bulk uploaded OSCE questions',
  created_flashcard: 'created a Flashcard',
  updated_flashcard: 'updated a Flashcard',
  deleted_flashcard: 'deleted a Flashcard',
  bulk_upload_flashcard: 'bulk uploaded Flashcards',
  created_department: 'created a Department',
  updated_department: 'updated a Department',
  deleted_department: 'deleted a Department',
};

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

    // Notify super_admin and platform_admin users about the content change
    // Skip notifications for bulk_upload actions to prevent flooding (the activity log entry is sufficient)
    if (!payload.action.startsWith('bulk_upload')) {
      try {
        const { data: superAdmins } = await serviceClient
          .from('user_roles')
          .select('user_id')
          .in('role', ['super_admin', 'platform_admin']);

        if (superAdmins && superAdmins.length > 0) {
          const { data: actorProfile } = await serviceClient
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single();

          const actorName = actorProfile?.full_name || actorProfile?.email?.split('@')[0] || 'An admin';
          const actionLabel = ACTION_LABELS[payload.action] || payload.action;

          let notificationTitle = 'Content Modified';
          if (payload.action.includes('created')) {
            notificationTitle = 'Content Created';
          } else if (payload.action.includes('updated')) {
            notificationTitle = 'Content Updated';
          } else if (payload.action.includes('deleted')) {
            notificationTitle = 'Content Deleted';
          }

          const notifications = superAdmins
            .filter(admin => admin.user_id !== user.id)
            .map(admin => ({
              recipient_id: admin.user_id,
              type: 'content_activity',
              title: notificationTitle,
              message: `${actorName} ${actionLabel}`,
              entity_type: 'activity_log',
              entity_id: null,
              metadata: {
                action: payload.action,
                entity_type: payload.entity_type,
                actor_name: actorName,
                actor_id: user.id,
              },
            }));

          if (notifications.length > 0) {
            const { error: notifyError } = await serviceClient
              .from('admin_notifications')
              .insert(notifications);

            if (notifyError) {
              console.error('Failed to create notifications:', notifyError);
            }
          }
        }
      } catch (notifyErr) {
        console.error('Error creating notifications:', notifyErr);
      }
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
