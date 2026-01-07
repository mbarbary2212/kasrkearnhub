import { createClient } from "npm:@supabase/supabase-js@2";

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

const VALID_CORRECT_KEYS = ['A', 'B', 'C', 'D', 'E'];

function normalizeCorrectKey(key: string | null | undefined): string | null {
  if (key === null || key === undefined) return null;
  const normalized = String(key).trim().toUpperCase();
  // Extract just the letter if it contains extra text like "Answer: B"
  const match = normalized.match(/^([A-E])/);
  return match ? match[1] : normalized;
}

function validateCorrectKey(key: string | null | undefined, rowIndex: number): { valid: boolean; normalized: string | null; error?: string } {
  const normalized = normalizeCorrectKey(key);
  
  if (!normalized) {
    return { valid: false, normalized: null, error: `Row ${rowIndex + 1}: correct_key is missing or empty` };
  }
  
  if (!VALID_CORRECT_KEYS.includes(normalized)) {
    return { 
      valid: false, 
      normalized: null, 
      error: `Row ${rowIndex + 1}: correct_key "${key}" is invalid. Must be A, B, C, D, or E` 
    };
  }
  
  return { valid: true, normalized };
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

    // Verify user has permission to import MCQs.
    // - Module admins / teachers / platform admins can import for the module
    // - Chapter-scoped admins (topic admins assigned to the chapter) can import when chapterId is provided
    const { data: canManageModule, error: modulePermError } = await adminClient.rpc(
      'can_manage_module_content',
      { _user_id: user.id, _module_id: moduleId }
    );

    if (modulePermError) {
      console.error('Module permission check error:', modulePermError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let canManageChapter: boolean | null = null;
    if (chapterId) {
      const { data, error } = await adminClient.rpc('can_manage_chapter_content', {
        _user_id: user.id,
        _chapter_id: chapterId,
      });

      if (error) {
        console.error('Chapter permission check error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to verify permissions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      canManageChapter = data as boolean;
    }

    const canManage = Boolean(canManageModule) || Boolean(canManageChapter);

    console.log('bulk-import-mcqs permission check', {
      user_id: user.id,
      moduleId,
      chapterId: chapterId || null,
      canManageModule: Boolean(canManageModule),
      canManageChapter: canManageChapter === null ? null : Boolean(canManageChapter),
      canManage,
    });

    if (!canManage) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to import MCQs to this module' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and normalize all correct_keys before insertion
    const validationErrors: string[] = [];
    const validatedMcqs: Array<McqFormData & { normalizedCorrectKey: string }> = [];
    
    for (let i = 0; i < mcqs.length; i++) {
      const mcq = mcqs[i];
      const validation = validateCorrectKey(mcq.correct_key, i);
      
      if (!validation.valid) {
        validationErrors.push(validation.error!);
        console.error(`Validation failed for MCQ ${i + 1}:`, {
          original_correct_key: mcq.correct_key,
          stem_preview: mcq.stem?.substring(0, 50),
          error: validation.error
        });
      } else {
        validatedMcqs.push({ ...mcq, normalizedCorrectKey: validation.normalized! });
      }
    }
    
    if (validationErrors.length > 0) {
      console.error('MCQ validation errors:', validationErrors);
      return new Response(
        JSON.stringify({ 
          error: `Invalid MCQ data:\n${validationErrors.slice(0, 5).join('\n')}${validationErrors.length > 5 ? `\n...and ${validationErrors.length - 5} more errors` : ''}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare records for insertion with normalized correct_key
    const records = validatedMcqs.map((mcq, index) => ({
      module_id: moduleId,
      chapter_id: chapterId || null,
      stem: mcq.stem,
      choices: mcq.choices,
      correct_key: mcq.normalizedCorrectKey, // Use normalized value
      explanation: mcq.explanation,
      difficulty: mcq.difficulty,
      display_order: index,
      created_by: user.id,
    }));

    console.log(`Inserting ${records.length} MCQs for module ${moduleId}, chapter ${chapterId}`);

    // Insert using admin client (bypasses RLS)
    const { error: insertError } = await adminClient.from('mcqs').insert(records);

    if (insertError) {
      console.error('Insert error:', insertError);
      // Log the first record for debugging
      if (records.length > 0) {
        console.error('First record that failed:', JSON.stringify(records[0], null, 2));
      }
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
