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

    const body = await req.json();

    // Determine mode: explicit mode field, or infer from payload
    const mode: 'essay' | 'case_scenario' = body.mode || (body.case_scenario_id ? 'case_scenario' : 'essay');

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

    if (mode === 'case_scenario') {
      return await handleCaseScenario(body, serviceClient, provider, apiKey, userId, keySource, settings);
    } else {
      return await handleEssay(body, serviceClient, provider, apiKey, userId, keySource, settings);
    }
  } catch (err) {
    console.error('grade-short-essay error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders });
  }
});

// ==================== ESSAY MODE (existing) ====================

async function handleEssay(
  body: any,
  serviceClient: any,
  provider: any,
  apiKey: string | null,
  userId: string,
  keySource: string | null,
  settings: any,
) {
  const { essay_id, student_answer } = body;
  if (!essay_id || !student_answer?.trim()) {
    return new Response(JSON.stringify({ error: 'essay_id and student_answer are required' }), { status: 400, headers: corsHeaders });
  }

  const { data: essay, error: essayError } = await serviceClient
    .from('essays')
    .select('question, model_answer, rubric_json, max_points, keywords')
    .eq('id', essay_id)
    .single();

  if (essayError || !essay) {
    return new Response(JSON.stringify({ error: 'Essay not found' }), { status: 404, headers: corsHeaders });
  }

  const rubric = essay.rubric_json as Record<string, unknown> | null;
  const requiredConcepts = Array.isArray(rubric?.required_concepts) ? rubric!.required_concepts : [];
  const expectedPoints = typeof rubric?.expected_points === 'number' ? rubric!.expected_points : requiredConcepts.length;

  const conceptsForPrompt = requiredConcepts.map((c: any) => {
    if (typeof c === 'string') return { label: c, is_critical: false, acceptable_phrases: [] };
    return c;
  });

  const systemPrompt = buildEssaySystemPrompt(expectedPoints);
  const userPrompt = buildEssayUserPrompt(essay, conceptsForPrompt, expectedPoints, student_answer);

  const result = await callAI(systemPrompt, userPrompt, provider, apiKey);
  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error }), { status: result.status || 500, headers: corsHeaders });
  }

  let gradingResult = parseAIResponse(result.content!);
  if (!gradingResult) {
    return new Response(JSON.stringify({ error: 'AI returned invalid grading response. Please try again.' }), { status: 500, headers: corsHeaders });
  }

  normalizeGradingResult(gradingResult, expectedPoints);

  await logAIUsage(serviceClient, userId, 'short_essay_grading', provider.name, keySource || 'lovable');

  return new Response(JSON.stringify(gradingResult), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// ==================== CASE SCENARIO MODE ====================

async function handleCaseScenario(
  body: any,
  serviceClient: any,
  provider: any,
  apiKey: string | null,
  userId: string,
  keySource: string | null,
  settings: any,
) {
  const { case_scenario_id, answers } = body;
  if (!case_scenario_id || !Array.isArray(answers) || answers.length === 0) {
    return new Response(
      JSON.stringify({ error: 'case_scenario_id and answers[] are required' }),
      { status: 400, headers: corsHeaders }
    );
  }

  // Fetch case stem
  const { data: caseData, error: caseErr } = await serviceClient
    .from('case_scenarios')
    .select('stem, difficulty')
    .eq('id', case_scenario_id)
    .single();

  if (caseErr || !caseData) {
    return new Response(JSON.stringify({ error: 'Case scenario not found' }), { status: 404, headers: corsHeaders });
  }

  // Fetch sub-questions with model_answer and rubric_json
  const questionIds = answers.map((a: any) => a.question_id);
  const { data: questions, error: qErr } = await serviceClient
    .from('case_scenario_questions')
    .select('id, question_text, model_answer, rubric_json, max_marks, display_order')
    .in('id', questionIds)
    .order('display_order', { ascending: true });

  if (qErr || !questions || questions.length === 0) {
    return new Response(JSON.stringify({ error: 'Case questions not found' }), { status: 404, headers: corsHeaders });
  }

  // Grade each sub-question independently, in parallel
  const questionResults = await Promise.allSettled(
    questions.map(async (q: any) => {
      const studentAnswer = answers.find((a: any) => a.question_id === q.id)?.answer || '';
      if (!studentAnswer.trim()) {
        return {
          question_id: q.id,
          score: 0,
          max_score: q.max_marks || 10,
          percentage: 0,
          matched_points: [],
          missed_points: [],
          missing_critical_points: [],
          confidence_score: 0,
          feedback: 'No answer provided.',
        };
      }

      const rubric = q.rubric_json as Record<string, unknown> | null;
      const requiredConcepts = Array.isArray(rubric?.required_concepts) ? rubric!.required_concepts : [];
      const expectedPoints = typeof rubric?.expected_points === 'number' ? rubric!.expected_points : requiredConcepts.length || q.max_marks || 10;

      const conceptsForPrompt = requiredConcepts.map((c: any) => {
        if (typeof c === 'string') return { label: c, is_critical: false, acceptable_phrases: [] };
        return c;
      });

      const systemPrompt = buildEssaySystemPrompt(expectedPoints);
      const userPrompt = `CLINICAL SCENARIO (context for the question):
${caseData.stem}

QUESTION: ${q.question_text}

RUBRIC CONCEPTS (${conceptsForPrompt.length} required, expected ${expectedPoints} points):
${JSON.stringify(conceptsForPrompt, null, 2)}

${q.model_answer ? `MODEL ANSWER (for calibration only): ${q.model_answer}` : ''}

STUDENT ANSWER:
${studentAnswer}

Grade the student answer against the rubric.`;

      const result = await callAI(systemPrompt, userPrompt, provider, apiKey);
      if (!result.success) {
        throw new Error(result.error || 'AI call failed');
      }

      let gradingResult = parseAIResponse(result.content!);
      if (!gradingResult) {
        throw new Error('Invalid AI response');
      }

      normalizeGradingResult(gradingResult, expectedPoints);
      gradingResult.question_id = q.id;

      return gradingResult;
    })
  );

  // Aggregate results
  const questionGrades: any[] = [];
  for (const r of questionResults) {
    if (r.status === 'fulfilled') {
      questionGrades.push(r.value);
    } else {
      // Find the question this failure belongs to by index
      const idx = questionResults.indexOf(r);
      const q = questions[idx];
      questionGrades.push({
        question_id: q?.id || 'unknown',
        score: 0,
        max_score: q?.max_marks || 10,
        percentage: 0,
        matched_points: [],
        missed_points: [],
        missing_critical_points: [],
        confidence_score: 0,
        feedback: 'Grading failed for this question.',
      });
    }
  }

  const totalScore = questionGrades.reduce((sum, r) => sum + (r.score || 0), 0);
  const totalMax = questionGrades.reduce((sum, r) => sum + (r.max_score || 0), 0);
  const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  // Generate overall feedback
  let overallFeedback = '';
  if (percentage >= 80) {
    overallFeedback = 'Excellent performance across the case. You demonstrated strong clinical reasoning.';
  } else if (percentage >= 60) {
    overallFeedback = 'Good attempt. Review the missed points to strengthen your understanding of this clinical scenario.';
  } else {
    overallFeedback = 'This case needs more work. Focus on the clinical reasoning pattern and key concepts highlighted in the feedback.';
  }

  await logAIUsage(serviceClient, userId, 'case_scenario_grading', provider.name, keySource || 'lovable');

  return new Response(JSON.stringify({
    total_score: totalScore,
    max_score: totalMax,
    percentage,
    questions: questionGrades,
    overall_feedback: overallFeedback,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// ==================== SHARED HELPERS ====================

function buildEssaySystemPrompt(expectedPoints: number): string {
  return `You are a strict but fair medical examiner.

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
}

function buildEssayUserPrompt(essay: any, conceptsForPrompt: any[], expectedPoints: number, studentAnswer: string): string {
  return `QUESTION: ${essay.question}

RUBRIC CONCEPTS (${conceptsForPrompt.length} required, expected ${expectedPoints} points):
${JSON.stringify(conceptsForPrompt, null, 2)}

${essay.model_answer ? `MODEL ANSWER (for calibration only): ${essay.model_answer}` : ''}

STUDENT ANSWER:
${studentAnswer}

Grade the student answer against the rubric.`;
}

function parseAIResponse(content: string): any | null {
  try {
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function normalizeGradingResult(result: any, expectedPoints: number): void {
  result.score = typeof result.score === 'number' ? result.score : 0;
  result.max_score = typeof result.max_score === 'number' ? result.max_score : expectedPoints;
  result.percentage = typeof result.percentage === 'number' ? result.percentage :
    (result.max_score > 0 ? Math.round((result.score / result.max_score) * 100) : 0);
  result.matched_points = Array.isArray(result.matched_points) ? result.matched_points : [];
  result.missed_points = Array.isArray(result.missed_points) ? result.missed_points : [];
  result.missing_critical_points = Array.isArray(result.missing_critical_points) ? result.missing_critical_points : [];
  result.confidence_score = typeof result.confidence_score === 'number' ? result.confidence_score : 0.5;
  result.feedback = result.feedback || '';
}
