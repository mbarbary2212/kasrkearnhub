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

type ContentType =
  | "mcq"
  | "flashcard"
  | "case_scenario"
  | "essay"
  | "osce"
  | "matching"
  | "virtual_patient"
  | "mind_map"
  | "worked_case";

function ensureArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonResponse(
      { error: "Unauthorized: Auth session missing!", items: [], warnings: [] },
      401
    );
  }

  // user client (anon) to validate JWT
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData?.user;

  if (userError || !user) {
    return jsonResponse(
      {
        error: `Unauthorized: ${userError?.message || "session expired"}`,
        items: [],
        warnings: [],
      },
      401
    );
  }

  // service client for privileged reads/writes
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  // Enforce admin permissions before writing
  const { data: roleData } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!roleData || !["platform_admin", "super_admin", "department_admin", "admin"].includes(roleData.role)) {
    return jsonResponse(
      { error: "Forbidden - admin access required", items: [], warnings: [] },
      403
    );
  }

  let body: { job_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body", items: [], warnings: [] }, 400);
  }

  const jobId = body?.job_id;
  if (!jobId) {
    return jsonResponse({ error: "Missing job_id", items: [], warnings: [] }, 400);
  }

  // Load job (service role)
  const { data: job, error: jobError } = await serviceClient
    .from("ai_generation_jobs")
    .select("id, status, job_type, document_id, input_metadata, output_data")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return jsonResponse({ error: "Job not found", items: [], warnings: [] }, 404);
  }

  const contentType = job.job_type as ContentType;
  const inputMetadata = (job.input_metadata ?? {}) as any;

  const moduleId = inputMetadata.module_id as string | undefined;
  const chapterId = (inputMetadata.chapter_id as string | null | undefined) ?? null;

  if (!moduleId) {
    return jsonResponse(
      { error: "Job input_metadata is missing module_id", items: [], warnings: [] },
      400
    );
  }

  // Validate output payload shape
  const output = (job.output_data ?? {}) as any;
  const items = ensureArray(output.items);

  if (items.length === 0) {
    console.error("approve-ai-content: job output_data.items invalid or empty:", output);
    return jsonResponse(
      { error: "Generation produced an invalid payload. Please retry.", items: [], warnings: [] },
      400
    );
  }

  // If already approved, treat as idempotent read
  if (job.status === "approved") {
    return jsonResponse({
      job_id: jobId,
      content_type: contentType,
      inserted_count: 0,
      items: [],
      warnings: ["Job already approved"],
    });
  }

  // Insert into target tables
  try {
    if (contentType === "mcq") {
      const mcqsToInsert = items.map((item: any, idx: number) => ({
        module_id: moduleId,
        chapter_id: chapterId,
        stem: item.stem,
        choices: item.choices,
        correct_key: item.correct_key,
        difficulty: item.difficulty || "medium",
        explanation: item.explanation || null,
        display_order: idx,
        created_by: user.id,
        is_deleted: false,
      }));

      const { error } = await serviceClient.from("mcqs").insert(mcqsToInsert);
      if (error) throw error;
    } else if (contentType === "flashcard") {
      if (!chapterId) {
        return jsonResponse(
          { error: "Chapter is required for flashcards", items: [], warnings: [] },
          400
        );
      }

      const flashcardsToInsert = items.map((item: any, idx: number) => ({
        module_id: moduleId,
        chapter_id: chapterId,
        resource_type: "flashcard",
        title: (item.front?.substring(0, 50) || "Flashcard") as string,
        content: { front: item.front, back: item.back },
        display_order: idx,
        created_by: user.id,
        is_deleted: false,
      }));

      const { error } = await serviceClient
        .from("study_resources")
        .insert(flashcardsToInsert);
      if (error) throw error;
    } else if (contentType === "case_scenario") {
      const casesToInsert = items.map((item: any, idx: number) => ({
        module_id: moduleId,
        chapter_id: chapterId,
        title: item.title,
        case_history: item.case_history,
        case_questions: item.case_questions,
        model_answer: item.model_answer,
        display_order: idx,
        created_by: user.id,
        is_deleted: false,
      }));

      const { error } = await serviceClient
        .from("case_scenarios")
        .insert(casesToInsert);
      if (error) throw error;
    } else if (contentType === "essay") {
      const essaysToInsert = items.map((item: any, idx: number) => ({
        module_id: moduleId,
        chapter_id: chapterId,
        title: item.title,
        question: item.question,
        model_answer: item.model_answer || null,
        keywords: item.keywords || null,
        display_order: idx,
        created_by: user.id,
        is_deleted: false,
      }));

      const { error } = await serviceClient.from("essays").insert(essaysToInsert);
      if (error) throw error;
    } else if (contentType === "osce") {
      if (!chapterId) {
        return jsonResponse(
          { error: "Chapter is required for OSCE questions", items: [], warnings: [] },
          400
        );
      }

      const osceToInsert = items.map((item: any, idx: number) => ({
        module_id: moduleId,
        chapter_id: chapterId,
        history_text: item.history_text,
        statement_1: item.statement_1,
        answer_1: item.answer_1,
        explanation_1: item.explanation_1 || null,
        statement_2: item.statement_2 || null,
        answer_2: item.answer_2 ?? null,
        explanation_2: item.explanation_2 || null,
        statement_3: item.statement_3 || null,
        answer_3: item.answer_3 ?? null,
        explanation_3: item.explanation_3 || null,
        statement_4: item.statement_4 || null,
        answer_4: item.answer_4 ?? null,
        explanation_4: item.explanation_4 || null,
        statement_5: item.statement_5 || null,
        answer_5: item.answer_5 ?? null,
        explanation_5: item.explanation_5 || null,
        difficulty: item.difficulty || "medium",
        display_order: idx,
        created_by: user.id,
        is_deleted: false,
      }));

      const { error } = await serviceClient
        .from("osce_questions")
        .insert(osceToInsert);
      if (error) throw error;
    } else if (contentType === "matching") {
      const matchingToInsert = items.map((item: any, idx: number) => ({
        module_id: moduleId,
        chapter_id: chapterId,
        instruction: item.instruction,
        column_a_items: item.column_a_items,
        column_b_items: item.column_b_items,
        correct_matches: item.correct_matches,
        explanation: item.explanation || null,
        difficulty: item.difficulty || "medium",
        display_order: idx,
        created_by: user.id,
        is_deleted: false,
      }));

      const { error } = await serviceClient
        .from("matching_questions")
        .insert(matchingToInsert);
      if (error) throw error;
    } else if (contentType === "virtual_patient") {
      // Virtual Patient: Insert case first, then stages
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        
        const { data: vpCase, error: caseError } = await serviceClient
          .from("virtual_patient_cases")
          .insert({
            title: item.title,
            intro_text: item.intro_text,
            module_id: moduleId,
            chapter_id: chapterId,
            level: item.level || "intermediate",
            estimated_minutes: item.estimated_minutes || 15,
            tags: item.tags || [],
            is_published: false,
            is_deleted: false,
            created_by: user.id,
          })
          .select("id")
          .single();

        if (caseError || !vpCase) {
          console.error("Failed to insert VP case:", caseError?.message);
          throw caseError || new Error("Failed to create virtual patient case");
        }

        // Insert stages
        const stages = ensureArray(item.stages);
        if (stages.length > 0) {
          const stagesToInsert = stages.map((stage: any, stageIdx: number) => ({
            case_id: vpCase.id,
            stage_order: stage.stage_order || stageIdx + 1,
            stage_type: stage.stage_type || "mcq",
            prompt: stage.prompt,
            patient_info: stage.patient_info || null,
            choices: stage.choices || [],
            correct_answer: stage.correct_answer,
            explanation: stage.explanation || null,
            teaching_points: stage.teaching_points || [],
            rubric: stage.rubric || null,
          }));

          const { error: stagesError } = await serviceClient
            .from("virtual_patient_stages")
            .insert(stagesToInsert);

          if (stagesError) {
            console.error("Failed to insert VP stages:", stagesError.message);
            throw stagesError;
          }
        }
      }
    } else if (contentType === "mind_map") {
      if (!chapterId) {
        return jsonResponse(
          { error: "Chapter is required for mind maps", items: [], warnings: [] },
          400
        );
      }

      const mindMapsToInsert = items.map((item: any, idx: number) => ({
        module_id: moduleId,
        chapter_id: chapterId,
        resource_type: "mind_map",
        title: item.title,
        content: {
          central_concept: item.central_concept,
          nodes: item.nodes,
        },
        display_order: idx,
        created_by: user.id,
        is_deleted: false,
      }));

      const { error } = await serviceClient
        .from("study_resources")
        .insert(mindMapsToInsert);
      if (error) throw error;
    } else if (contentType === "worked_case") {
      if (!chapterId) {
        return jsonResponse(
          { error: "Chapter is required for worked cases", items: [], warnings: [] },
          400
        );
      }

      const workedCasesToInsert = items.map((item: any, idx: number) => ({
        module_id: moduleId,
        chapter_id: chapterId,
        resource_type: "worked_case",
        title: item.title,
        content: {
          case_summary: item.case_summary,
          steps: item.steps,
          learning_objectives: item.learning_objectives,
        },
        display_order: idx,
        created_by: user.id,
        is_deleted: false,
      }));

      const { error } = await serviceClient
        .from("study_resources")
        .insert(workedCasesToInsert);
      if (error) throw error;
    } else {
      return jsonResponse(
        { error: `Unsupported content type: ${contentType}`, items: [], warnings: [] },
        400
      );
    }

    // Update job status to approved
    const { error: approveError } = await serviceClient
      .from("ai_generation_jobs")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq("id", jobId);

    if (approveError) throw approveError;

    return jsonResponse({
      job_id: jobId,
      content_type: contentType,
      inserted_count: items.length,
      items: [],
      warnings: [],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("approve-ai-content error:", e);
    return jsonResponse({ error: msg, items: [], warnings: [] }, 500);
  }
});
