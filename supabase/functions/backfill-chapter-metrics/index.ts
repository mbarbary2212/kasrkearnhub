import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    console.log('[backfill] Starting backfill of student_chapter_metrics...');

    // 1. Get all distinct (user_id, chapter_id, module_id) combos from question_attempts
    const { data: pairs, error: pairsErr } = await supabase
      .from('question_attempts')
      .select('user_id, chapter_id, module_id')
      .not('chapter_id', 'is', null)
      .not('module_id', 'is', null);

    if (pairsErr) throw pairsErr;

    // Deduplicate to unique (user_id, chapter_id) pairs, keeping one module_id
    const pairMap = new Map<string, { user_id: string; chapter_id: string; module_id: string }>();
    for (const row of pairs || []) {
      const key = `${row.user_id}|${row.chapter_id}`;
      if (!pairMap.has(key)) {
        pairMap.set(key, { user_id: row.user_id, chapter_id: row.chapter_id, module_id: row.module_id });
      }
    }

    const uniquePairs = Array.from(pairMap.values());
    console.log(`[backfill] Found ${uniquePairs.length} unique (user, chapter) pairs`);

    let successCount = 0;
    let failCount = 0;
    const failures: string[] = [];

    // 2. Process each pair — call existing RPC which handles readiness + review scheduling
    for (const pair of uniquePairs) {
      try {
        // Fetch MCQ attempts for this user+chapter
        const { data: mcqAttempts } = await supabase
          .from('question_attempts')
          .select('is_correct, confidence_level, created_at')
          .eq('user_id', pair.user_id)
          .eq('chapter_id', pair.chapter_id)
          .eq('question_type', 'mcq')
          .order('created_at', { ascending: false });

        const allMcq = mcqAttempts || [];
        const mcqTotal = allMcq.length;
        const mcqCorrect = allMcq.filter(a => a.is_correct).length;
        const mcqWrong = mcqTotal - mcqCorrect;
        const mcqAccuracy = mcqTotal > 0 ? Math.round((mcqCorrect / mcqTotal) * 100) : 0;

        // Recent accuracy: last 20
        const recent20 = allMcq.slice(0, 20);
        const recentCorrect = recent20.filter(a => a.is_correct).length;
        const recentAccuracy = recent20.length > 0 ? Math.round((recentCorrect / recent20.length) * 100) : 0;

        // Last activity timestamp
        const lastActivity = allMcq.length > 0 ? allMcq[0].created_at : new Date().toISOString();

        // Call the existing RPC — it computes readiness_score, review_strength, next_review_at internally
        const { error: rpcErr } = await supabase.rpc('upsert_student_chapter_metrics', {
          p_student_id: pair.user_id,
          p_module_id: pair.module_id,
          p_chapter_id: pair.chapter_id,
          p_mcq_attempts: mcqTotal,
          p_mcq_correct: mcqCorrect,
          p_mcq_wrong: mcqWrong,
          p_mcq_accuracy: mcqAccuracy,
          p_recent_mcq_accuracy: recentAccuracy,
          p_last_mcq_attempt_at: lastActivity,
          p_last_activity_at: lastActivity,
        });

        if (rpcErr) {
          console.error(`[backfill] RPC error for ${pair.user_id}/${pair.chapter_id}:`, rpcErr.message);
          failures.push(`${pair.user_id}/${pair.chapter_id}: ${rpcErr.message}`);
          failCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[backfill] Error for ${pair.user_id}/${pair.chapter_id}:`, msg);
        failures.push(`${pair.user_id}/${pair.chapter_id}: ${msg}`);
        failCount++;
      }
    }

    // 3. Read back results for summary
    const { data: metrics } = await supabase
      .from('student_chapter_metrics')
      .select('student_id, chapter_id, mcq_attempts, recent_mcq_accuracy, readiness_score, next_review_at, overconfident_error_rate');

    const allRows = metrics || [];
    const uniqueStudents = new Set(allRows.map(r => r.student_id));
    const avgChaptersPerStudent = uniqueStudents.size > 0
      ? (allRows.length / uniqueStudents.size).toFixed(1)
      : '0';

    // Check field population
    const fieldCoverage = {
      mcq_attempts: allRows.filter(r => r.mcq_attempts != null && r.mcq_attempts > 0).length,
      recent_mcq_accuracy: allRows.filter(r => r.recent_mcq_accuracy != null).length,
      readiness_score: allRows.filter(r => r.readiness_score != null && r.readiness_score > 0).length,
      next_review_at: allRows.filter(r => r.next_review_at != null).length,
      overconfident_error_rate: allRows.filter(r => r.overconfident_error_rate != null).length,
    };

    const summary = {
      total_pairs_found: uniquePairs.length,
      rows_created: successCount,
      failures: failCount,
      failure_details: failures.slice(0, 10),
      total_rows_in_table: allRows.length,
      unique_students: uniqueStudents.size,
      avg_chapters_per_student: avgChaptersPerStudent,
      field_coverage: fieldCoverage,
    };

    console.log('[backfill] Complete:', JSON.stringify(summary, null, 2));

    return new Response(JSON.stringify(summary, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[backfill] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
