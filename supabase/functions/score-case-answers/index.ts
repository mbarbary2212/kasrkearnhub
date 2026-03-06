import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // 1. Fetch case data + student answers in parallel
    const [caseResult, answersResult] = await Promise.all([
      supabase
        .from('virtual_patient_cases')
        .select('generated_case_data, active_sections')
        .eq('id', case_id)
        .single(),
      supabase
        .from('case_section_answers')
        .select('*')
        .eq('attempt_id', attempt_id),
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

    // 2. Get AI API key
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Score ALL sections in parallel
    const scoringResults = await Promise.allSettled(
      unscoredAnswers.map(async (answer) => {
        const sectionType = answer.section_type;
        const sectionExpected = generatedData[sectionType];
        if (!sectionExpected) return { id: answer.id, score: 0, maxScore: 0, skipped: true };

        const maxScore = sectionExpected.max_score || answer.max_score || 10;
        const scoringPrompt = buildScoringPrompt(sectionType, answer.student_answer, sectionExpected);

        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.3,
            max_tokens: 500,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: `You are a medical education examiner scoring OSCE-style structured case answers.
You have access to the model answer and rubric for each section.
Return ONLY valid JSON with this shape:
{
  "score": <number 0 to ${maxScore}>,
  "feedback": "<2-4 sentences of constructive feedback>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "gaps": ["<gap 1>", "<gap 2>"]
}`,
              },
              { role: 'user', content: scoringPrompt },
            ],
          }),
        });

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        if (!content) throw new Error('No AI response content');

        const parsed = JSON.parse(content);
        const score = Math.min(Math.max(0, Number(parsed.score) || 0), maxScore);

        // Update DB immediately for this section
        await supabase
          .from('case_section_answers')
          .update({
            score,
            max_score: maxScore,
            ai_feedback: JSON.stringify({
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
      JSON.stringify({ error: err.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildScoringPrompt(
  sectionType: string,
  studentAnswer: any,
  expectedData: any
): string {
  const base = `Section: ${sectionType}\nMax Score: ${expectedData.max_score}\n\nStudent Answer:\n${JSON.stringify(studentAnswer, null, 2)}\n\n`;

  switch (sectionType) {
    case 'history_taking':
      return (
        base +
        `History mode: ${expectedData.mode}\n` +
        `Checklist:\n${JSON.stringify(expectedData.checklist, null, 2)}\n` +
        `Comprehension Questions with correct answers:\n${JSON.stringify(expectedData.comprehension_questions, null, 2)}\n\n` +
        `Score based on: accuracy of comprehension answers compared to correct_answer fields, coverage of checklist items.`
      );

    case 'physical_examination':
      return (
        base +
        `Available regions:\n${JSON.stringify(expectedData.regions, null, 2)}\n\n` +
        `Note: ${expectedData.note || 'N/A'}\n` +
        `Score based on: thoroughness of regions examined. This section max_score is ${expectedData.max_score}.`
      );

    case 'investigations_labs':
      return (
        base +
        `Key tests (should be ordered): ${JSON.stringify(expectedData.key_tests)}\n` +
        `All available tests:\n${JSON.stringify(expectedData.available_tests, null, 2)}\n\n` +
        `Score based on: did the student order the key tests? Penalise slightly for ordering unnecessary tests.`
      );

    case 'investigations_imaging':
      return (
        base +
        `Key investigations: ${JSON.stringify(expectedData.key_investigations)}\n` +
        `All available imaging:\n${JSON.stringify(expectedData.available_imaging, null, 2)}\n\n` +
        `Score based on: did the student select the key imaging studies?`
      );

    case 'diagnosis':
      return (
        base +
        `Diagnosis Rubric:\n${JSON.stringify(expectedData.rubric, null, 2)}\n\n` +
        `Score based on: compare student's possible_diagnosis, differential_diagnosis, and final_diagnosis against the rubric's model_answer and expected values. Award points per rubric item.`
      );

    case 'medical_management':
    case 'surgical_management': {
      const questions = expectedData.questions || [];
      const correctAnswers = questions.map((q: any) => ({
        id: q.id,
        type: q.type,
        correct: q.correct,
        explanation: q.explanation,
        model_answer: q.rubric?.model_answer,
        expected_points: q.rubric?.expected_points,
        points: q.points || q.rubric?.points,
      }));
      return (
        base +
        `Questions with correct answers:\n${JSON.stringify(correctAnswers, null, 2)}\n\n` +
        `Score MCQs: award full points if student selected the correct letter, 0 otherwise.\n` +
        `Score free_text: compare against model_answer and expected_points.`
      );
    }

    case 'monitoring_followup':
    case 'patient_family_advice':
      return (
        base +
        `Question: ${expectedData.question}\n` +
        `Rubric:\n` +
        `  Expected points: ${JSON.stringify(expectedData.rubric?.expected_points)}\n` +
        `  Model answer: ${expectedData.rubric?.model_answer}\n\n` +
        `Score based on: how many expected points the student covered. Award partial credit.`
      );

    case 'conclusion': {
      const tasks = expectedData.tasks || [];
      return (
        base +
        `Conclusion Tasks:\n${JSON.stringify(tasks.map((t: any) => ({
          id: t.id,
          type: t.type,
          label: t.label,
          rubric: t.rubric,
        })), null, 2)}\n\n` +
        `Score each task against its rubric. Sum points across tasks.`
      );
    }

    default:
      return base + `Score this section. Max score: ${expectedData.max_score || 10}`;
  }
}
