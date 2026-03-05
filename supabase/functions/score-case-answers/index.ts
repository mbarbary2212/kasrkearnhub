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

    // 1. Fetch case data
    const { data: caseRow, error: caseErr } = await supabase
      .from('virtual_patient_cases')
      .select('generated_case_data, active_sections')
      .eq('id', case_id)
      .single();

    if (caseErr || !caseRow) {
      return new Response(
        JSON.stringify({ error: 'Case not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const generatedData = caseRow.generated_case_data as Record<string, any> | null;
    if (!generatedData) {
      return new Response(
        JSON.stringify({ error: 'Case has no generated data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch student answers
    const { data: sectionAnswers, error: answersErr } = await supabase
      .from('case_section_answers')
      .select('*')
      .eq('attempt_id', attempt_id);

    if (answersErr) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch answers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get AI API key
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Score each section
    let totalScore = 0;
    let totalMaxScore = 0;

    for (const answer of (sectionAnswers || [])) {
      const sectionType = answer.section_type;
      const sectionExpected = generatedData[sectionType];
      if (!sectionExpected || answer.is_scored) continue;

      const maxScore = sectionExpected.max_score || answer.max_score || 10;
      totalMaxScore += maxScore;

      const scoringPrompt = buildScoringPrompt(sectionType, answer.student_answer, sectionExpected);

      try {
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.3,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: `You are a medical education examiner scoring OSCE-style structured case answers.
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
        if (!content) continue;

        const parsed = JSON.parse(content);
        const score = Math.min(Math.max(0, Number(parsed.score) || 0), maxScore);
        totalScore += score;

        // Update section answer with score
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
      } catch (scoreErr) {
        console.error(`Failed to score section ${sectionType}:`, scoreErr);
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

    return new Response(
      JSON.stringify({
        success: true,
        total_score: totalScore,
        total_max_score: totalMaxScore,
        overall_percent: overallPercent,
        sections_scored: (sectionAnswers || []).length,
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
  const base = `Section: ${sectionType}\n\nStudent Answer:\n${JSON.stringify(studentAnswer, null, 2)}\n\n`;

  switch (sectionType) {
    case 'history_taking':
      return (
        base +
        `Expected checklist categories:\n${JSON.stringify(expectedData.categories, null, 2)}\n\n` +
        `Score based on: coverage of checklist items, quality of questions, systematic approach.` +
        ` Max score: ${expectedData.max_score}`
      );

    case 'physical_examination':
      return (
        base +
        `Expected findings:\n${JSON.stringify(expectedData.findings, null, 2)}\n\n` +
        `Score based on: regions examined, identification of abnormal findings.` +
        ` Max score: ${expectedData.max_score}`
      );

    case 'investigations_labs':
      return (
        base +
        `Expected orders: ${JSON.stringify(expectedData.expected_orders)}\n` +
        `Available labs: ${expectedData.available_labs?.length || 0}\n\n` +
        `Score based on: appropriateness of tests ordered, avoiding unnecessary tests.` +
        ` Max score: ${expectedData.max_score}`
      );

    case 'investigations_imaging':
      return (
        base +
        `Expected orders: ${JSON.stringify(expectedData.expected_orders)}\n\n` +
        `Score based on: correct imaging modality selection.` +
        ` Max score: ${expectedData.max_score}`
      );

    case 'diagnosis':
      return (
        base +
        `Expected diagnosis: ${expectedData.expected_diagnosis}\n` +
        `Acceptable differentials: ${JSON.stringify(expectedData.differential_diagnoses)}\n\n` +
        `Score based on: accuracy of primary diagnosis, quality of differentials.` +
        ` Max score: ${expectedData.max_score}`
      );

    case 'medical_management':
    case 'surgical_management':
      return (
        base +
        `MCQ correct answers: ${JSON.stringify(expectedData.mcqs?.map((m: any) => m.options.find((o: any) => o.is_correct)?.key))}\n` +
        `Expected answer: ${expectedData.expected_answer || 'N/A'}\n\n` +
        `Score based on: MCQ accuracy, free text quality if applicable.` +
        ` Max score: ${expectedData.max_score}`
      );

    case 'monitoring_followup':
    case 'patient_family_advice':
      return (
        base +
        `Expected answer:\n${expectedData.expected_answer}\n\n` +
        `Score based on: completeness, clinical accuracy, communication quality.` +
        ` Max score: ${expectedData.max_score}`
      );

    case 'conclusion':
      return (
        base +
        `Expected key decisions: ${JSON.stringify(expectedData.key_decisions)}\n\n` +
        `Score based on: summarization quality, addressing key decisions.` +
        ` Max score: ${expectedData.max_score}`
      );

    default:
      return base + `Score this section. Max score: ${expectedData.max_score || 10}`;
  }
}
