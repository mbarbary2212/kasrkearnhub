import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface McqChoice {
  key: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
}

interface McqFormData {
  stem: string;
  choices: McqChoice[];
  correct_key: string;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
}

interface RequestBody {
  mcqs: McqFormData[];
  moduleId: string;
  chapterId?: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
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

    // Create client with user's token to verify permissions
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { mcqs, moduleId, chapterId } = body;

    if (!mcqs || !Array.isArray(mcqs) || mcqs.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No MCQs provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!moduleId) {
      return new Response(
        JSON.stringify({ error: 'Module ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role key (bypasses RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user has permission to manage MCQs using the database function
    const { data: canManage, error: permError } = await adminClient.rpc(
      'can_manage_module_content',
      { _user_id: user.id, _module_id: moduleId }
    );

    if (permError) {
      console.error('Permission check error:', permError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!canManage) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to import MCQs to this module' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare records for insertion
    const records = mcqs.map((mcq, index) => ({
      module_id: moduleId,
      chapter_id: chapterId || null,
      stem: mcq.stem,
      choices: mcq.choices,
      correct_key: mcq.correct_key,
      explanation: mcq.explanation,
      difficulty: mcq.difficulty,
      display_order: index,
      created_by: user.id,
    }));

    // Insert using admin client (bypasses RLS)
    const { error: insertError } = await adminClient.from('mcqs').insert(records);

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: `Failed to import MCQs: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: mcqs.length,
        moduleId,
        chapterId 
      }),
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
