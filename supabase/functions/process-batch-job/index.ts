// ============================================
// Process Batch Job - Resumable Batch Worker
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface BatchJob {
  id: string;
  document_id: string | null;
  admin_id: string;
  module_id: string;
  chapter_id: string | null;
  content_types: string[];
  quantities: Record<string, number>;
  per_section: boolean;
  current_step: number;
  total_steps: number;
  status: string;
  auto_approve: boolean;
  job_ids: string[];
  duplicate_stats: Record<string, { total: number; unique: number; duplicates: number }>;
  error_message: string | null;
  additional_instructions: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

serve(async (req) => {
  // 1. CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 2. JWT VALIDATION (not blind service-role execution)
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized: Auth session missing" }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return jsonResponse({ error: "Unauthorized: Invalid token" }, 401);
  }

  const userId = userData.user.id;
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  // 3. ROLE CHECK - Admin access required
  const { data: roleData } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  const allowedRoles = ["platform_admin", "super_admin", "department_admin", "admin"];
  const isAdmin = roleData && allowedRoles.includes(roleData.role);
  const isSuperAdmin = roleData && ["super_admin", "platform_admin"].includes(roleData.role);

  if (!isAdmin) {
    return jsonResponse({ error: "Forbidden: Admin access required" }, 403);
  }

  // 4. PARSE REQUEST
  let body: { batch_id: string; action?: "start" | "pause" | "resume" | "cancel" };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { batch_id, action = "start" } = body;

  if (!batch_id) {
    return jsonResponse({ error: "Missing batch_id" }, 400);
  }

  // 5. LOAD BATCH JOB
  const { data: batchJob, error: batchError } = await serviceClient
    .from("ai_batch_jobs")
    .select("*")
    .eq("id", batch_id)
    .single();

  if (batchError || !batchJob) {
    return jsonResponse({ error: "Batch job not found" }, 404);
  }

  const job = batchJob as BatchJob;

  // 6. OWNERSHIP CHECK (unless super admin)
  if (!isSuperAdmin && job.admin_id !== userId) {
    return jsonResponse({ error: "Forbidden: Not your batch job" }, 403);
  }

  // 7. HANDLE ACTIONS
  if (action === "cancel") {
    await serviceClient
      .from("ai_batch_jobs")
      .update({ status: "cancelled" })
      .eq("id", batch_id);
    return jsonResponse({ success: true, status: "cancelled" });
  }

  if (action === "pause") {
    await serviceClient
      .from("ai_batch_jobs")
      .update({ status: "paused" })
      .eq("id", batch_id);
    return jsonResponse({ success: true, status: "paused" });
  }

  // Check if already completed/cancelled
  if (job.status === "completed") {
    return jsonResponse({ 
      success: true, 
      status: "completed", 
      message: "Batch job already completed",
      job_ids: job.job_ids,
    });
  }

  if (job.status === "cancelled") {
    return jsonResponse({ 
      success: false, 
      error: "Batch job was cancelled",
      status: "cancelled",
    });
  }

  // 8. UPDATE STATUS TO PROCESSING
  const now = new Date().toISOString();
  await serviceClient
    .from("ai_batch_jobs")
    .update({ 
      status: "processing", 
      started_at: job.started_at || now,
      error_message: null,
    })
    .eq("id", batch_id);

  // 9. RESUMABLE PROCESSING
  const contentTypes = job.content_types || [];
  const quantities = job.quantities || {};
  let currentStep = job.current_step || 0;
  const jobIds = [...(job.job_ids || [])];
  const duplicateStats = { ...(job.duplicate_stats || {}) };
  let hasSuccesses = false;
  let lastError: string | null = null;

  try {
    // Process each remaining content type (resume capability)
    for (let i = currentStep; i < contentTypes.length; i++) {
      const contentType = contentTypes[i];
      const quantity = quantities[contentType] || 5;

      console.log(`[${batch_id}] Processing step ${i + 1}/${contentTypes.length}: ${contentType} (qty: ${quantity})`);

      // Update current step BEFORE processing (for resume on failure)
      await serviceClient
        .from("ai_batch_jobs")
        .update({ current_step: i })
        .eq("id", batch_id);

      // Check if paused mid-processing
      const { data: statusCheck } = await serviceClient
        .from("ai_batch_jobs")
        .select("status")
        .eq("id", batch_id)
        .single();

      if (statusCheck?.status === "paused" || statusCheck?.status === "cancelled") {
        console.log(`[${batch_id}] Job ${statusCheck.status} at step ${i}`);
        return jsonResponse({ 
          success: true, 
          status: statusCheck.status,
          current_step: i,
          total_steps: contentTypes.length,
        });
      }

      // Call generate-content-from-pdf for this content type
      const generateResponse = await fetch(`${supabaseUrl}/functions/v1/generate-content-from-pdf`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_id: job.document_id,
          content_type: contentType,
          module_id: job.module_id,
          chapter_id: job.chapter_id,
          quantity,
          additional_instructions: job.additional_instructions,
        }),
      });

      const generateResult = await generateResponse.json();

      if (!generateResponse.ok) {
        const errorMsg = generateResult.error || `Generation failed with status ${generateResponse.status}`;
        console.error(`[${batch_id}] Generation failed for ${contentType}:`, errorMsg);
        lastError = errorMsg;
        
        // Record partial failure but continue
        duplicateStats[contentType] = {
          total: 0,
          unique: 0,
          duplicates: 0,
        };
        continue;
      }

      if (generateResult.job_id) {
        jobIds.push(generateResult.job_id);
        hasSuccesses = true;

        // Record duplicate stats if available
        duplicateStats[contentType] = {
          total: generateResult.items?.length || 0,
          unique: generateResult.items?.length || 0,
          duplicates: 0,
        };

        // Auto-approve if enabled
        if (job.auto_approve && generateResult.job_id) {
          console.log(`[${batch_id}] Auto-approving job ${generateResult.job_id}`);
          
          const approveResponse = await fetch(`${supabaseUrl}/functions/v1/approve-ai-content`, {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ job_id: generateResult.job_id }),
          });

          if (!approveResponse.ok) {
            const approveError = await approveResponse.json();
            console.error(`[${batch_id}] Auto-approve failed:`, approveError.error);
          }
        }
      }

      // Save progress after each step
      await serviceClient
        .from("ai_batch_jobs")
        .update({
          current_step: i + 1,
          job_ids: jobIds,
          duplicate_stats: duplicateStats,
        })
        .eq("id", batch_id);
    }

    // 10. MARK COMPLETED OR FAILED
    if (hasSuccesses) {
      await serviceClient
        .from("ai_batch_jobs")
        .update({
          status: "completed",
          current_step: contentTypes.length,
          completed_at: new Date().toISOString(),
          job_ids: jobIds,
          duplicate_stats: duplicateStats,
        })
        .eq("id", batch_id);

      console.log(`[${batch_id}] Batch job completed. Jobs created: ${jobIds.length}`);

      return jsonResponse({
        success: true,
        status: "completed",
        job_ids: jobIds,
        duplicate_stats: duplicateStats,
      });
    } else {
      // All generations failed - mark as failed with error message
      const errorMessage = lastError || "All content generation attempts failed. Check AI settings configuration.";
      
      await serviceClient
        .from("ai_batch_jobs")
        .update({
          status: "failed",
          current_step: contentTypes.length,
          error_message: errorMessage,
          job_ids: jobIds,
          duplicate_stats: duplicateStats,
        })
        .eq("id", batch_id);

      console.error(`[${batch_id}] Batch job failed - no content generated. Error: ${errorMessage}`);

      return jsonResponse({
        success: false,
        status: "failed",
        error: errorMessage,
        job_ids: jobIds,
        duplicate_stats: duplicateStats,
      }, 500);
    }

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[${batch_id}] Batch job error:`, error);

    // Mark failed but preserve current_step for resume
    await serviceClient
      .from("ai_batch_jobs")
      .update({
        status: "failed",
        error_message: msg,
      })
      .eq("id", batch_id);

    return jsonResponse({
      error: msg,
      status: "failed",
      current_step: currentStep,
      total_steps: contentTypes.length,
      job_ids: jobIds,
    }, 500);
  }
});
