import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrueFalseFormData {
  statement: string;
  correct_answer: boolean;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  section_id?: string | null;
  original_section_name?: string | null;
  original_section_number?: string | null;
}

interface RequestBody {
  questions: TrueFalseFormData[];
  moduleId: string;
  chapterId?: string | null;
  topicId?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RequestBody = await req.json();
    const { questions, moduleId, chapterId, topicId } = body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No questions provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const MAX_COUNT = 500;
    if (questions.length > MAX_COUNT) {
      return new Response(
        JSON.stringify({ error: `Too many questions. Maximum ${MAX_COUNT} per request.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!moduleId) {
      return new Response(
        JSON.stringify({ error: 'Module ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Permission check
    const { data: canManageModule } = await adminClient.rpc(
      'can_manage_module_content',
      { _user_id: user.id, _module_id: moduleId }
    );

    let canManageChapter: boolean | null = null;
    if (chapterId) {
      const { data } = await adminClient.rpc('can_manage_chapter_content', {
        _user_id: user.id,
        _chapter_id: chapterId,
      });
      canManageChapter = data as boolean;
    }

    const canManage = Boolean(canManageModule) || Boolean(canManageChapter);
    if (!canManage) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to import questions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const records = questions.map((q, index) => ({
      module_id: moduleId,
      chapter_id: chapterId || null,
      topic_id: topicId || null,
      statement: q.statement,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      display_order: index,
      created_by: user.id,
      original_section_name: q.original_section_name || null,
      original_section_number: q.original_section_number || null,
    }));

    console.log(`Inserting ${records.length} T/F questions for module ${moduleId}`);

    const { error: insertError } = await adminClient.from('true_false_questions').insert(records);

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: `Failed to import questions: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Audit log
    try {
      await adminClient.from('audit_log').insert({
        actor_id: user.id,
        action: 'BULK_IMPORT_TRUE_FALSE',
        entity_type: 'true_false_questions',
        entity_id: moduleId,
        metadata: { count: questions.length, moduleId, chapterId: chapterId || null, topicId: topicId || null },
      });
    } catch (auditErr) {
      console.error('Audit log error (non-fatal):', auditErr);
    }

    return new Response(
      JSON.stringify({ success: true, count: questions.length, moduleId, chapterId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
