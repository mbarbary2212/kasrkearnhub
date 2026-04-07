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

    // Parse body
    const { essay_id, student_answer } = await req.json();
    if (!essay_id || !student_answer?.trim()) {
      return new Response(JSON.stringify({ error: 'essay_id and student_answer are required' }), { status: 400, headers: corsHeaders });
    }

    // Fetch essay with rubric and model_answer
    const { data: essay, error: essayError } = await serviceClient
      .from('essays')
      .select('question, model_answer, rubric_json, max_points, keywords')
      .eq('id', essay_id)
      .single();

    if (essayError || !essay) {
      return new Response(JSON.stringify({ error: 'Essay not found' }), { status: 404, headers: corsHeaders });
    }

    // Parse rubric
    const rubric = essay.rubric_json as Record<string, unknown> | null;
    const requiredConcepts = Array.isArray(rubric?.required_concepts) ? rubric!.required_concepts : [];
    const expectedPoints = typeof rubric?.expected_points === 'number' ? rubric!.expected_points : requiredConcepts.length;

    // Build concept list for AI prompt
    const conceptsForPrompt = requiredConcepts.map((c: any) => {
      if (typeof c === 'string') return { label: c, is_critical: false, acceptable_phrases: [] };
      return c;
    });

    // Get user role for AI key resolution
    const { data: roleData } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    const userRole = roleData?.role || 'student';

    // AI settings & key
    const settings = await getAISettings(serviceClient);
    const { apiKey, keySource, error: keyError } = await resolveApiKey(serviceClient, userId, userRole, settings);
    if (keyError) {
      return new Response(JSON.stringify({ error: keyError }), { status: 403, headers: corsHeaders });
    }

    const provider = getAIProvider(settings);
    if (apiKey) provider.model = settings.gemini_model;

    const systemPrompt = `You are a strict but fair medical examiner.

Grade a student's short-answer response using the provided rubric.

RULES:
- Use ONLY the rubric concepts for scoring
- Accept synonyms and clinically equivalent phrasing
- Accept the acceptable_phrases listed for each concept
- Ignore grammar unless meaning is affected
- Do not hallucinate rubric points — only score what is in the rubric
- Do not reward vague statements
- A concept is "matched" if the student clearly addresses it, even in different words
- A concept is "partially matched" if addressed vaguely — give half credit
- A concept is "missed" if not addressed at all

SCORING:
- Each required concept clearly covered = 1 point
- Each required concept partially covered = 0.5 points
- Each required concept absent = 0 points
- Critical concepts (is_critical: true) must be flagged separately if missing

Return ONLY valid JSON (no markdown, no code fences):
{
  "score": <number — total points earned>,
  "max_score": <number — total possible points>,
  "percentage": <integer 0-100>,
  "matched_points": ["<concept labels clearly covered>"],
  "missed_points": ["<concept labels not covered>"],
  "missing_critical_points": ["<critical concept labels that were missed>"],
  "confidence_score": <number 0-1 — how confident you are in the grading>,
  "feedback": "<1-2 sentence constructive feedback>"
}`;

    const userPrompt = `QUESTION: ${essay.question}

RUBRIC CONCEPTS (${conceptsForPrompt.length} required, expected ${expectedPoints} points):
${JSON.stringify(conceptsForPrompt, null, 2)}

${essay.model_answer ? `MODEL ANSWER (for calibration only): ${essay.model_answer}` : ''}

STUDENT ANSWER:
${student_answer}

Grade the student answer against the rubric.`;

    const result = await callAI(systemPrompt, userPrompt, provider, apiKey);

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), { status: result.status || 500, headers: corsHeaders });
    }

    // Parse AI response
    let gradingResult;
    try {
      let content = result.content!.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      gradingResult = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: 'AI returned invalid grading response. Please try again.' }), { status: 500, headers: corsHeaders });
    }

    // Ensure required fields
    gradingResult.score = typeof gradingResult.score === 'number' ? gradingResult.score : 0;
    gradingResult.max_score = typeof gradingResult.max_score === 'number' ? gradingResult.max_score : expectedPoints;
    gradingResult.percentage = typeof gradingResult.percentage === 'number' ? gradingResult.percentage : 
      (gradingResult.max_score > 0 ? Math.round((gradingResult.score / gradingResult.max_score) * 100) : 0);
    gradingResult.matched_points = Array.isArray(gradingResult.matched_points) ? gradingResult.matched_points : [];
    gradingResult.missed_points = Array.isArray(gradingResult.missed_points) ? gradingResult.missed_points : [];
    gradingResult.missing_critical_points = Array.isArray(gradingResult.missing_critical_points) ? gradingResult.missing_critical_points : [];
    gradingResult.confidence_score = typeof gradingResult.confidence_score === 'number' ? gradingResult.confidence_score : 0.5;
    gradingResult.feedback = gradingResult.feedback || '';

    // Log usage
    await logAIUsage(serviceClient, userId, 'short_essay_grading', provider.name, keySource || 'lovable');

    return new Response(JSON.stringify(gradingResult), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('grade-short-essay error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders });
  }
});
