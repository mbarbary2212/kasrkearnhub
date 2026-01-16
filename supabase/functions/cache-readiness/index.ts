import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Readiness calculation constants (matching lib/readinessCalculator.ts)
const READINESS_WEIGHTS = {
  coverage: 0.40,
  performance: 0.30,
  improvement: 0.20,
  consistency: 0.10,
};

const READINESS_CAPS = {
  lowCoverage: { threshold: 40, maxReadiness: 50 },
  lowPerformance: { threshold: 50, maxReadiness: 65 },
  decliningImprovement: { threshold: 40, maxReadiness: 75 },
};

const PERFORMANCE_WEIGHTS = {
  mcq: 0.50,
  osce: 0.30,
  conceptCheck: 0.20,
};

const MIN_ATTEMPTS_FOR_IMPROVEMENT = {
  mcq: 5,
  osce: 2,
};

interface ReadinessComponents {
  coverage: number;
  performance: number;
  improvement: number;
  consistency: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, moduleId, forceRecalculate } = await req.json();

    if (!userId || !moduleId) {
      return new Response(
        JSON.stringify({ error: 'userId and moduleId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[cache-readiness] Calculating readiness for user=${userId}, module=${moduleId}`);

    // Check if we have a recent cache (less than 5 minutes old)
    if (!forceRecalculate) {
      const { data: existingCache } = await supabase
        .from('student_readiness_cache')
        .select('*')
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .single();

      if (existingCache) {
        const cacheAge = Date.now() - new Date(existingCache.last_calculated_at).getTime();
        const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

        if (cacheAge < CACHE_TTL) {
          console.log(`[cache-readiness] Using cached result (age: ${Math.round(cacheAge / 1000)}s)`);
          return new Response(
            JSON.stringify({ cached: true, data: existingCache }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Fetch all necessary data for calculation
    const [
      chaptersRes,
      userProgressRes,
      mcqsRes,
      essaysRes,
      caseScenariosRes,
      questionAttemptsRes,
    ] = await Promise.all([
      supabase.from('module_chapters').select('id').eq('module_id', moduleId),
      supabase.from('user_progress').select('content_id, completed, completed_at').eq('user_id', userId),
      supabase.from('mcqs').select('id').eq('module_id', moduleId).eq('is_deleted', false),
      supabase.from('essays').select('id').eq('module_id', moduleId).eq('is_deleted', false),
      supabase.from('case_scenarios').select('id').eq('module_id', moduleId).eq('is_deleted', false),
      supabase.from('question_attempts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);

    const chapters = chaptersRes.data || [];
    const userProgress = userProgressRes.data || [];
    const mcqs = mcqsRes.data || [];
    const essays = essaysRes.data || [];
    const caseScenarios = caseScenariosRes.data || [];
    const questionAttempts = questionAttemptsRes.data || [];

    // Calculate content IDs for this module
    const contentIds = new Set([
      ...mcqs.map(m => m.id),
      ...essays.map(e => e.id),
      ...caseScenarios.map(c => c.id),
    ]);

    // Calculate coverage
    const completedIds = new Set(
      userProgress.filter(p => p.completed).map(p => p.content_id)
    );
    const totalItems = contentIds.size;
    const completedItems = [...contentIds].filter(id => completedIds.has(id)).length;
    const coveragePercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // Calculate consistency
    const moduleProgress = userProgress.filter(p => 
      p.completed_at && contentIds.has(p.content_id)
    );
    const consistencyScore = calculateConsistencyScore(moduleProgress);

    // Calculate performance
    const mcqAttempts = questionAttempts.filter(a => a.question_type === 'mcq');
    const osceAttempts = questionAttempts.filter(a => a.question_type === 'osce');
    const conceptCheckAttempts = questionAttempts.filter(a => a.question_type === 'guided_explanation');

    const mcqAccuracy = mcqAttempts.length > 0 
      ? (mcqAttempts.filter(a => a.is_correct).length / mcqAttempts.length) * 100 
      : 0;

    const osceScores = osceAttempts
      .map(a => (a.selected_answer as { score?: number } | null)?.score ?? 0)
      .filter(s => s > 0);
    const osceAvgScore = osceScores.length > 0
      ? osceScores.reduce((sum, s) => sum + s, 0) / osceScores.length
      : 0;

    const conceptCheckPassRate = conceptCheckAttempts.length > 0
      ? (conceptCheckAttempts.filter(a => a.is_correct).length / conceptCheckAttempts.length) * 100
      : 0;

    const performanceScore = calculatePerformance({
      mcq: { accuracy: mcqAccuracy, attempts: mcqAttempts.length },
      osce: { avgScore: osceAvgScore, attempts: osceAttempts.length },
      conceptCheck: { passRate: conceptCheckPassRate, total: conceptCheckAttempts.length },
    });

    // Calculate improvement
    const RECENT_MCQ = 10;
    const RECENT_OSCE = 5;

    const recentMcq = mcqAttempts.slice(0, RECENT_MCQ);
    const priorMcq = mcqAttempts.slice(RECENT_MCQ, RECENT_MCQ * 2);
    const recentOsce = osceAttempts.slice(0, RECENT_OSCE)
      .map(a => (a.selected_answer as { score?: number } | null)?.score ?? 0)
      .filter(s => s > 0);
    const priorOsce = osceAttempts.slice(RECENT_OSCE, RECENT_OSCE * 2)
      .map(a => (a.selected_answer as { score?: number } | null)?.score ?? 0)
      .filter(s => s > 0);

    const improvementScore = calculateImprovement(recentMcq, priorMcq, recentOsce, priorOsce);

    // Calculate final readiness with caps
    const components: ReadinessComponents = {
      coverage: coveragePercent,
      performance: performanceScore,
      improvement: improvementScore,
      consistency: consistencyScore,
    };

    const { examReadiness, capType, rawScore } = calculateReadiness(components);

    // Upsert cache
    const { data: cacheData, error: upsertError } = await supabase
      .from('student_readiness_cache')
      .upsert({
        user_id: userId,
        module_id: moduleId,
        coverage_score: coveragePercent,
        performance_score: performanceScore,
        improvement_score: improvementScore,
        consistency_score: consistencyScore,
        exam_readiness: examReadiness,
        cap_type: capType,
        raw_score: rawScore,
        last_calculated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,module_id',
      })
      .select()
      .single();

    if (upsertError) {
      console.error('[cache-readiness] Error upserting cache:', upsertError);
      throw upsertError;
    }

    console.log(`[cache-readiness] Successfully cached readiness: ${examReadiness}%`);

    return new Response(
      JSON.stringify({ cached: false, data: cacheData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[cache-readiness] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper functions (matching lib/readinessCalculator.ts logic)

function calculateConsistencyScore(progress: { completed_at: string | null }[]): number {
  if (progress.length === 0) return 0;

  const now = new Date();
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentDates = new Set(
    progress
      .filter(p => p.completed_at && new Date(p.completed_at) >= fourteenDaysAgo)
      .map(p => new Date(p.completed_at!).toDateString())
  );

  const veryRecentDates = new Set(
    progress
      .filter(p => p.completed_at && new Date(p.completed_at) >= sevenDaysAgo)
      .map(p => new Date(p.completed_at!).toDateString())
  );

  const fourteenDayScore = Math.min(50, (recentDates.size / 14) * 100);
  const sevenDayScore = Math.min(50, (veryRecentDates.size / 7) * 100);

  return Math.round(fourteenDayScore + sevenDayScore);
}

function calculatePerformance(input: {
  mcq: { accuracy: number; attempts: number };
  osce: { avgScore: number; attempts: number };
  conceptCheck: { passRate: number; total: number };
}): number {
  const { mcq, osce, conceptCheck } = input;
  
  const hasMcq = mcq.attempts > 0;
  const hasOsce = osce.attempts > 0;
  const hasConceptCheck = conceptCheck.total > 0;
  
  if (!hasMcq && !hasOsce && !hasConceptCheck) return 0;
  
  let totalWeight = 0;
  if (hasMcq) totalWeight += PERFORMANCE_WEIGHTS.mcq;
  if (hasOsce) totalWeight += PERFORMANCE_WEIGHTS.osce;
  if (hasConceptCheck) totalWeight += PERFORMANCE_WEIGHTS.conceptCheck;
  
  let weightedScore = 0;
  
  if (hasMcq) {
    weightedScore += mcq.accuracy * (PERFORMANCE_WEIGHTS.mcq / totalWeight);
  }
  if (hasOsce) {
    const oscePercent = (osce.avgScore / 5) * 100;
    weightedScore += oscePercent * (PERFORMANCE_WEIGHTS.osce / totalWeight);
  }
  if (hasConceptCheck) {
    weightedScore += conceptCheck.passRate * (PERFORMANCE_WEIGHTS.conceptCheck / totalWeight);
  }
  
  return Math.round(weightedScore);
}

function calculateImprovement(
  recentMcq: { is_correct: boolean }[],
  priorMcq: { is_correct: boolean }[],
  recentOsce: number[],
  priorOsce: number[]
): number {
  const hasMcqData = recentMcq.length >= MIN_ATTEMPTS_FOR_IMPROVEMENT.mcq && 
                     priorMcq.length >= MIN_ATTEMPTS_FOR_IMPROVEMENT.mcq;
  const hasOsceData = recentOsce.length >= MIN_ATTEMPTS_FOR_IMPROVEMENT.osce && 
                      priorOsce.length >= MIN_ATTEMPTS_FOR_IMPROVEMENT.osce;
  
  if (!hasMcqData && !hasOsceData) return 50;
  
  let totalChange = 0;
  let totalWeight = 0;
  
  if (hasMcqData) {
    const recentAcc = (recentMcq.filter(a => a.is_correct).length / recentMcq.length) * 100;
    const priorAcc = (priorMcq.filter(a => a.is_correct).length / priorMcq.length) * 100;
    totalChange += (recentAcc - priorAcc) * 0.6;
    totalWeight += 0.6;
  }
  
  if (hasOsceData) {
    const recentAvg = recentOsce.reduce((s, v) => s + v, 0) / recentOsce.length;
    const priorAvg = priorOsce.reduce((s, v) => s + v, 0) / priorOsce.length;
    totalChange += (recentAvg - priorAvg) * 20 * 0.4;
    totalWeight += 0.4;
  }
  
  if (totalWeight > 0 && totalWeight < 1) {
    totalChange = totalChange / totalWeight;
  }
  
  return Math.round(Math.max(0, Math.min(100, 50 + (totalChange * 2.5))));
}

function calculateReadiness(components: ReadinessComponents): { 
  examReadiness: number; 
  capType: string | null; 
  rawScore: number;
} {
  const { coverage, performance, improvement, consistency } = components;
  
  const rawScore = 
    coverage * READINESS_WEIGHTS.coverage +
    performance * READINESS_WEIGHTS.performance +
    improvement * READINESS_WEIGHTS.improvement +
    consistency * READINESS_WEIGHTS.consistency;
  
  let finalScore = rawScore;
  let capType: string | null = null;
  
  if (coverage < READINESS_CAPS.lowCoverage.threshold) {
    const maxScore = READINESS_CAPS.lowCoverage.maxReadiness;
    if (finalScore > maxScore) {
      finalScore = maxScore;
      capType = 'coverage';
    }
  }
  
  if (performance < READINESS_CAPS.lowPerformance.threshold && 
      (capType === null || READINESS_CAPS.lowPerformance.maxReadiness < finalScore)) {
    const maxScore = READINESS_CAPS.lowPerformance.maxReadiness;
    if (rawScore > maxScore && (finalScore > maxScore || capType === null)) {
      finalScore = maxScore;
      capType = 'performance';
    }
  }
  
  if (improvement < READINESS_CAPS.decliningImprovement.threshold && 
      improvement !== 50 &&
      (capType === null || READINESS_CAPS.decliningImprovement.maxReadiness < finalScore)) {
    const maxScore = READINESS_CAPS.decliningImprovement.maxReadiness;
    if (rawScore > maxScore && (finalScore > maxScore || capType === null)) {
      finalScore = maxScore;
      capType = 'improvement';
    }
  }
  
  return {
    examReadiness: Math.round(finalScore),
    capType,
    rawScore: Math.round(rawScore),
  };
}
