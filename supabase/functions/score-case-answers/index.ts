import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAISettings, getInteractiveCaseMarkingProvider, callAI } from '../_shared/ai-provider.ts';
import { buildScoringPrompt } from './prompts.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { attempt_id, case_id } = await req.json();
    if (!attempt_id || !case_id) {
      return new Response(
        JSON.stringify({ error: 'attempt_id and case_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Validate caller
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims, error: authErr } = await anonClient.auth.getUser();
      if (authErr || !claims?.user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 1. Fetch case data, student answers, and AI settings in parallel
    const [caseResult, answersResult, aiSettings] = await Promise.all([
      supabase
        .from('virtual_patient_cases')
        .select('generated_case_data, active_sections')
        .eq('id', case_id)
        .single(),
      supabase
        .from('case_section_answers')
        .select('*')
        .eq('attempt_id', attempt_id),
      getAISettings(supabase),
    ]);

    if (caseResult.error || !caseResult.data) {
      return new Response(
        JSON.stringify({ error: 'Case not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const generatedData = caseResult.data.generated_case_data as Record<string, any> | null;
    if (!generatedData) {
      return new Response(
        JSON.stringify({ error: 'Case has no generated data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (answersResult.error) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch answers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sectionAnswers = answersResult.data || [];
    const unscoredAnswers = sectionAnswers.filter(a => !a.is_scored);

    if (unscoredAnswers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'All sections already scored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get AI provider (uses Interactive Case Marking-specific override, falls back to global)
    const provider = await getInteractiveCaseMarkingProvider(supabase, aiSettings);
    console.log(`[score-case-answers] Using provider: ${provider.name} / model: ${provider.model}`);

    // 3. Score ALL sections in parallel
    const scoringResults = await Promise.allSettled(
      unscoredAnswers.map(async (answer) => {
        const sectionType = answer.section_type;
        const sectionExpected = generatedData[sectionType];
        if (!sectionExpected) return { id: answer.id, score: 0, maxScore: 0, skipped: true };

        const maxScore = sectionExpected.max_score || answer.max_score || 10;
        const userPrompt = buildScoringPrompt(sectionType, answer.student_answer, sectionExpected);

        const systemPrompt = `You are a medical education examiner scoring OSCE-style structured case answers.
You have access to the model answer and rubric for each section.
Return ONLY valid JSON with this shape:
{
  "score": <number 0 to ${maxScore}>,
  "justification": "<1-2 sentences explaining WHY this score was given, referencing specific items covered or missed>",
  "feedback": "<2-4 sentences of constructive feedback>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "gaps": ["<gap 1>", "<gap 2>"]
}`;

        const result = await callAI(systemPrompt, userPrompt, provider);

        if (!result.success || !result.content) {
          throw new Error(result.error || 'No AI response content');
        }

        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = result.content.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1].trim();

        const parsed = JSON.parse(jsonStr);
        const score = Math.min(Math.max(0, Number(parsed.score) || 0), maxScore);

        // Update DB immediately for this section
        await supabase
          .from('case_section_answers')
          .update({
            score,
            max_score: maxScore,
            ai_feedback: JSON.stringify({
              justification: parsed.justification || '',
              feedback: parsed.feedback,
              strengths: parsed.strengths || [],
              gaps: parsed.gaps || [],
            }),
            is_scored: true,
          })
          .eq('id', answer.id);

        return { id: answer.id, score, maxScore, skipped: false };
      })
    );

    // 4. Calculate totals from ALL section answers (scored + newly scored)
    let totalScore = 0;
    let totalMaxScore = 0;

    // Already-scored sections
    for (const a of sectionAnswers.filter(a => a.is_scored)) {
      totalScore += a.score || 0;
      totalMaxScore += a.max_score || 0;
    }

    // Newly scored sections
    for (const result of scoringResults) {
      if (result.status === 'fulfilled' && !result.value.skipped) {
        totalScore += result.value.score;
        totalMaxScore += result.value.maxScore;
      }
    }

    // 5. Update attempt with overall score
    const overallPercent = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

    await supabase
      .from('virtual_patient_attempts')
      .update({
        score: overallPercent,
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', attempt_id);

    const failedCount = scoringResults.filter(r => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({
        success: true,
        total_score: totalScore,
        total_max_score: totalMaxScore,
        overall_percent: overallPercent,
        sections_scored: scoringResults.filter(r => r.status === 'fulfilled' && !r.value.skipped).length,
        sections_failed: failedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('score-case-answers error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
