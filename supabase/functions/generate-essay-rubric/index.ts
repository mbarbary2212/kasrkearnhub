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
  "required_concepts": ["concept 1", "concept 2"],
  "optional_concepts": ["bonus concept 1"],
  "critical_omissions": ["critical item if missing = auto fail"],
  "pass_threshold": 60,
  "acceptable_phrases": { "term": ["synonym1", "synonym2"] }
}

Guidelines:
- required_concepts: Key ideas the student MUST mention. Extract from the model answer and keywords. Typically 4-8 items.
- optional_concepts: Bonus points ideas. Typically 1-3 items.
- critical_omissions: Items so important that missing them means automatic failure. Typically 0-2 items. Only include truly critical safety/clinical items.
- pass_threshold: Percentage of required_concepts needed to pass (integer 40-80, default 60).
- acceptable_phrases: Map of medical terms to their acceptable synonyms/abbreviations.`;

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
      // Strip markdown code fences if present
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

    // Log usage
    await logAIUsage(serviceClient, userId, 'essay_rubric', provider.name, keySource || 'lovable');

    return new Response(JSON.stringify(rubric), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('generate-essay-rubric error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders });
  }
});
