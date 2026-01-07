import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Psychometric thresholds
const FACILITY_TOO_EASY = 0.85;
const FACILITY_TOO_HARD = 0.20;
const DISCRIMINATION_POOR = 0.20;
const MIN_ATTEMPTS_FOR_ANALYSIS = 10;

interface McqChoice {
  key: string;
  text: string;
}

interface DistractorAnalysis {
  [key: string]: number;
}

interface FlagResult {
  reasons: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

function calculateFlags(
  facilityIndex: number | null,
  discriminationIndex: number | null,
  distractorAnalysis: DistractorAnalysis,
  correctKey: string,
  totalAttempts: number
): FlagResult {
  const reasons: string[] = [];
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

  if (totalAttempts < MIN_ATTEMPTS_FOR_ANALYSIS) {
    return { reasons: [], severity: 'low' };
  }

  // Check facility index
  if (facilityIndex !== null) {
    if (facilityIndex === 0) {
      reasons.push(`No correct answers (0% correct) - verify answer key`);
      severity = 'critical';
    } else if (facilityIndex < FACILITY_TOO_HARD) {
      reasons.push(`Too difficult (${Math.round(facilityIndex * 100)}% correct)`);
      if (severity !== 'critical') severity = 'high';
    } else if (facilityIndex > FACILITY_TOO_EASY) {
      reasons.push(`Too easy (${Math.round(facilityIndex * 100)}% correct)`);
      if (severity === 'low') severity = 'medium';
    }
  }

  // Check discrimination index
  if (discriminationIndex !== null) {
    if (discriminationIndex < 0) {
      reasons.push(`Negative discrimination (D=${discriminationIndex.toFixed(2)}) - low performers do better`);
      if (severity !== 'critical') severity = 'high';
    } else if (discriminationIndex < DISCRIMINATION_POOR) {
      reasons.push(`Poor discrimination (D=${discriminationIndex.toFixed(2)})`);
      if (severity === 'low') severity = 'medium';
    }
  }

  // Check distractor effectiveness
  const optionKeys = Object.keys(distractorAnalysis);
  const correctCount = distractorAnalysis[correctKey] || 0;
  
  for (const key of optionKeys) {
    if (key === correctKey) continue;
    
    const count = distractorAnalysis[key];
    if (count === 0) {
      reasons.push(`Option ${key} never selected (ineffective distractor)`);
      if (severity === 'low') severity = 'low';
    } else if (count > correctCount && totalAttempts >= MIN_ATTEMPTS_FOR_ANALYSIS) {
      reasons.push(`Option ${key} selected more than correct answer (${count} vs ${correctCount})`);
      if (severity !== 'critical') severity = 'high';
    }
  }

  return { reasons, severity: reasons.length > 0 ? severity : 'low' };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { module_id, mcq_id } = await req.json();

    // Build query for MCQs to analyze
    let mcqQuery = supabase
      .from("mcqs")
      .select("id, module_id, chapter_id, correct_key, choices")
      .eq("is_deleted", false);

    if (mcq_id) {
      mcqQuery = mcqQuery.eq("id", mcq_id);
    } else if (module_id) {
      mcqQuery = mcqQuery.eq("module_id", module_id);
    }

    const { data: mcqs, error: mcqError } = await mcqQuery;
    if (mcqError) throw mcqError;

    if (!mcqs || mcqs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No MCQs to analyze", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const mcq of mcqs) {
      // Fetch all attempts for this MCQ
      const { data: attempts, error: attemptsError } = await supabase
        .from("question_attempts")
        .select("selected_answer, is_correct, time_spent_seconds, user_id")
        .eq("question_id", mcq.id)
        .eq("question_type", "mcq");

      if (attemptsError) {
        console.error(`Error fetching attempts for MCQ ${mcq.id}:`, attemptsError);
        continue;
      }

      const totalAttempts = attempts?.length || 0;
      const correctCount = attempts?.filter(a => a.is_correct).length || 0;
      
      // Calculate facility index
      const facilityIndex = totalAttempts > 0 ? correctCount / totalAttempts : null;

      // Calculate distractor analysis
      const distractorAnalysis: DistractorAnalysis = {};
      const choices = mcq.choices as McqChoice[];
      
      // Initialize all options to 0
      for (const choice of choices) {
        distractorAnalysis[choice.key] = 0;
      }
      
      // Count selections
      for (const attempt of attempts || []) {
        if (attempt.selected_answer && distractorAnalysis.hasOwnProperty(attempt.selected_answer)) {
          distractorAnalysis[attempt.selected_answer]++;
        }
      }

      // Calculate time metrics
      const times = (attempts || [])
        .map(a => a.time_spent_seconds)
        .filter(t => t !== null && t > 0) as number[];
      
      const avgTime = times.length > 0 
        ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) 
        : null;
      const minTime = times.length > 0 ? Math.min(...times) : null;
      const maxTime = times.length > 0 ? Math.max(...times) : null;

      // Calculate discrimination index (simplified)
      // Get unique users and their overall performance
      let discriminationIndex: number | null = null;
      
      if (totalAttempts >= MIN_ATTEMPTS_FOR_ANALYSIS) {
        // Get all users who attempted this MCQ
        const userIds = [...new Set(attempts?.map(a => a.user_id) || [])];
        
        if (userIds.length >= 10) {
          // Get each user's overall performance on all MCQs in this module
          const { data: allModuleAttempts } = await supabase
            .from("question_attempts")
            .select("user_id, is_correct")
            .eq("question_type", "mcq")
            .in("user_id", userIds);

          if (allModuleAttempts && allModuleAttempts.length > 0) {
            // Calculate overall score per user
            const userScores: { [userId: string]: { correct: number; total: number } } = {};
            
            for (const attempt of allModuleAttempts) {
              if (!userScores[attempt.user_id]) {
                userScores[attempt.user_id] = { correct: 0, total: 0 };
              }
              userScores[attempt.user_id].total++;
              if (attempt.is_correct) {
                userScores[attempt.user_id].correct++;
              }
            }

            // Sort users by performance
            const sortedUsers = Object.entries(userScores)
              .map(([userId, scores]) => ({
                userId,
                percentage: scores.correct / scores.total
              }))
              .sort((a, b) => b.percentage - a.percentage);

            // Get top 27% and bottom 27%
            const groupSize = Math.max(1, Math.floor(sortedUsers.length * 0.27));
            const topGroup = sortedUsers.slice(0, groupSize).map(u => u.userId);
            const bottomGroup = sortedUsers.slice(-groupSize).map(u => u.userId);

            // Calculate correct rate for this MCQ in each group
            const topAttempts = attempts?.filter(a => topGroup.includes(a.user_id)) || [];
            const bottomAttempts = attempts?.filter(a => bottomGroup.includes(a.user_id)) || [];

            const topCorrectRate = topAttempts.length > 0
              ? topAttempts.filter(a => a.is_correct).length / topAttempts.length
              : 0;
            const bottomCorrectRate = bottomAttempts.length > 0
              ? bottomAttempts.filter(a => a.is_correct).length / bottomAttempts.length
              : 0;

            discriminationIndex = Number((topCorrectRate - bottomCorrectRate).toFixed(3));
          }
        }
      }

      // Calculate flags
      const { reasons, severity } = calculateFlags(
        facilityIndex,
        discriminationIndex,
        distractorAnalysis,
        mcq.correct_key,
        totalAttempts
      );

      // Upsert analytics record
      const analyticsData = {
        mcq_id: mcq.id,
        module_id: mcq.module_id,
        chapter_id: mcq.chapter_id,
        total_attempts: totalAttempts,
        correct_count: correctCount,
        facility_index: facilityIndex,
        discrimination_index: discriminationIndex,
        distractor_analysis: distractorAnalysis,
        avg_time_seconds: avgTime,
        min_time_seconds: minTime,
        max_time_seconds: maxTime,
        is_flagged: reasons.length > 0,
        flag_reasons: reasons,
        flag_severity: reasons.length > 0 ? severity : null,
        last_calculated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from("mcq_analytics")
        .upsert(analyticsData, { onConflict: "mcq_id" });

      if (upsertError) {
        console.error(`Error upserting analytics for MCQ ${mcq.id}:`, upsertError);
        results.push({ mcq_id: mcq.id, success: false, error: upsertError.message });
      } else {
        results.push({ 
          mcq_id: mcq.id, 
          success: true, 
          facility_index: facilityIndex,
          discrimination_index: discriminationIndex,
          is_flagged: reasons.length > 0,
          flag_reasons: reasons
        });
      }
    }

    const processed = results.filter(r => r.success).length;
    const flagged = results.filter(r => r.is_flagged).length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed,
        flagged,
        total: mcqs.length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error calculating MCQ analytics:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
