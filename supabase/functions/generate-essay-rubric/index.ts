import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAISettings, getAIProvider, callAI, resolveApiKey, logAIUsage } from '../_shared/ai-provider.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const userId = claimsData.claims.sub as string;
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Check role
    const { data: roleData } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const userRole = roleData?.role || 'student';
    const allowedRoles = ['super_admin', 'platform_admin', 'admin', 'teacher', 'department_admin'];
    if (!allowedRoles.includes(userRole)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), { status: 403, headers: corsHeaders });
    }

    // Parse body
    const { question, model_answer, keywords } = await req.json();
    if (!question) {
      return new Response(JSON.stringify({ error: 'Question text is required' }), { status: 400, headers: corsHeaders });
    }

    // AI settings & key resolution
    const settings = await getAISettings(serviceClient);
    const { apiKey, keySource, error: keyError } = await resolveApiKey(serviceClient, userId, userRole, settings);
    if (keyError) {
      return new Response(JSON.stringify({ error: keyError }), { status: 403, headers: corsHeaders });
    }

    const provider = getAIProvider(settings);
    if (apiKey) provider.model = settings.gemini_model;

    const systemPrompt = `You are a medical education rubric designer. Given an essay question, its model answer, and optional keywords, generate a structured marking rubric.

Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
  "rubric_version": 1,
  "expected_points": <integer — number of distinct points the student should cover. If the question explicitly asks for a number (e.g. "List 5 complications"), use that number. Otherwise infer a sensible count, typically 3-6>,
  "required_concepts": [
    {
      "label": "<concise concept name>",
      "description": "<what the student should mention for this point>",
      "is_critical": <boolean — true only for safety-critical or core educational points>,
      "acceptable_phrases": ["<synonym1>", "<synonym2>"]
    }
  ],
  "optional_concepts": [
    {
      "label": "<bonus concept>",
      "description": "<explanation>",
      "acceptable_phrases": []
    }
  ],
  "grading_notes": "<internal notes for grading, not shown to students>",
  "model_structure": ["<expected answer structure, e.g. Definition>", "<Main points>", "<Conclusion>"],
  "rubric_source": "ai",
  "rubric_status": "draft",
  "pass_threshold": <integer 40-80, default 60>
}

Guidelines:
- required_concepts: Key ideas the student MUST mention. Extract from the model answer and keywords. Typically 4-8 items. Each must have a label, description, is_critical flag, and acceptable_phrases array.
- Mark is_critical: true ONLY for safety-critical clinical points or core educational concepts that are absolutely essential. Usually 0-2 items.
- optional_concepts: Bonus points ideas. Typically 1-3 items.
- expected_points: Match the number of required_concepts unless the question explicitly requests a different count.
- acceptable_phrases: Map medical terms to their acceptable synonyms/abbreviations for each concept.
- Questions should be answerable in structured bullet points, not vague open-ended essays.`;

    const userPrompt = `Question: ${question}
${model_answer ? `\nModel Answer: ${model_answer}` : ''}
${keywords?.length ? `\nKeywords: ${keywords.join(', ')}` : ''}

Generate the marking rubric JSON.`;

    const result = await callAI(systemPrompt, userPrompt, provider, apiKey);

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), { status: result.status || 500, headers: corsHeaders });
    }

    // Parse the AI response
    let rubric;
    try {
      let content = result.content!.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      rubric = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: 'AI returned invalid JSON. Please try again.' }), { status: 500, headers: corsHeaders });
    }

    // Validate shape
    if (!Array.isArray(rubric.required_concepts)) {
      return new Response(JSON.stringify({ error: 'Invalid rubric structure from AI' }), { status: 500, headers: corsHeaders });
    }

    // Ensure required fields
    rubric.rubric_version = 1;
    rubric.rubric_source = 'ai';
    rubric.rubric_status = 'draft';
    if (typeof rubric.expected_points !== 'number' || rubric.expected_points < 1) {
      rubric.expected_points = rubric.required_concepts.length;
    }

    // Log usage
    await logAIUsage(serviceClient, userId, 'essay_rubric', provider.name, keySource || 'lovable');

    return new Response(JSON.stringify(rubric), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('generate-essay-rubric error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders });
  }
});
