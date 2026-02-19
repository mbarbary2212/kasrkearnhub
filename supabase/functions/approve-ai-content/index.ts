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
  | "clinical_case"
  | "mind_map"
  | "worked_case"
  | "guided_explanation";

function ensureArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

// ============================================
// NORMALIZATION FUNCTIONS
// Ensure data formats match database expectations
// ============================================

function normalizeMcqChoices(item: any): any {
  // Convert object format {A: "text", B: "text"} to array format [{key: "A", text: "text"}, ...]
  if (item.choices && !Array.isArray(item.choices) && typeof item.choices === 'object') {
    const keysOrder = ['A', 'B', 'C', 'D', 'E'];
    item.choices = keysOrder
      .filter(k => item.choices[k] !== undefined)
      .map(k => ({ key: k, text: item.choices[k] }));
  }
  
  // Ensure exactly 5 choices
  if (Array.isArray(item.choices)) {
    // Remove duplicates and invalid entries
    const seen = new Set();
    item.choices = item.choices.filter((c: any) => {
      if (!c.key || !c.text || seen.has(c.key)) return false;
      seen.add(c.key);
      return true;
    });

    // Pad to 5 choices if needed
    const existingKeys = item.choices.map((c: any) => c.key);
    const allKeys = ['A', 'B', 'C', 'D', 'E'];
    for (const k of allKeys) {
      if (!existingKeys.includes(k) && item.choices.length < 5) {
        item.choices.push({ key: k, text: `[Option ${k}]` });
      }
    }
    // Sort by key
    item.choices.sort((a: any, b: any) => a.key.localeCompare(b.key));
    // Trim to exactly 5
    item.choices = item.choices.slice(0, 5);
  }

  return item;
}

function normalizeOsceAnswers(item: any): any {
  // Convert string "true"/"false" to boolean
  for (let i = 1; i <= 5; i++) {
    const ansKey = `answer_${i}`;
    if (item[ansKey] === 'true') item[ansKey] = true;
    else if (item[ansKey] === 'false') item[ansKey] = false;
    else if (typeof item[ansKey] !== 'boolean') item[ansKey] = false;
  }
  return item;
}

function normalizeVpStageChoices(stage: any): any {
  // Convert object format to array format for VP stage choices
  if (stage.choices && !Array.isArray(stage.choices) && typeof stage.choices === 'object') {
    const keys = Object.keys(stage.choices).sort();
    stage.choices = keys.map(k => ({ key: k, text: stage.choices[k] }));
  }
  // Ensure teaching_points is an array
  if (!Array.isArray(stage.teaching_points)) {
    stage.teaching_points = stage.teaching_points ? [stage.teaching_points] : [];
  }
  return stage;
}

// ============================================
// MAIN HANDLER
// ============================================

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
      { error: "Unauthorized: Auth session missing!", step: "auth", items: [], warnings: [] },
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
        step: "auth",
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
      { error: "Forbidden - admin access required", step: "auth", items: [], warnings: [] },
      403
    );
  }

   let body: { job_id?: string; concept_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body", step: "parse", items: [], warnings: [] }, 400);
  }

  const jobId = body?.job_id;
  const manualConceptId = body?.concept_id || null;
  if (!jobId) {
    return jsonResponse({ error: "Missing job_id", step: "validation", items: [], warnings: [] }, 400);
  }

  // Load job (service role)
  const { data: job, error: jobError } = await serviceClient
    .from("ai_generation_jobs")
    .select("id, status, job_type, document_id, input_metadata, output_data, error_message")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return jsonResponse({ error: "Job not found", step: "job_load", items: [], warnings: [] }, 404);
  }

  const contentType = job.job_type as ContentType;
  const inputMetadata = (job.input_metadata ?? {}) as any;
  const output = (job.output_data ?? {}) as any;

  const moduleId = inputMetadata.module_id as string | undefined;
  const chapterId = (inputMetadata.chapter_id as string | null | undefined) ?? null;
  const testMode = inputMetadata.test_mode || output.test_mode || false;

  if (!moduleId) {
    return jsonResponse(
      { error: "Job input_metadata is missing module_id", step: "validation", items: [], warnings: [] },
      400
    );
  }

  // Validate output payload shape
  const items = ensureArray(output.items);

  if (items.length === 0) {
    console.error(`[${jobId}] approve-ai-content: job output_data.items invalid or empty:`, output);
    return jsonResponse(
      { error: "Generation produced an invalid payload (no items). Please retry generation.", step: "validation", items: [], warnings: [] },
      400
    );
  }

  // If already approved, treat as idempotent read
  if (job.status === "approved") {
    console.log(`[${jobId}] Job already approved, returning success`);
    return jsonResponse({
      job_id: jobId,
      content_type: contentType,
      inserted_count: 0,
      items: [],
      warnings: ["Job already approved"],
      test_mode: testMode,
    });
  }

  // TEST MODE: Don't insert into real tables
  if (testMode) {
    console.log(`[${jobId}] TEST MODE - skipping database insertion`);
    
    // Update job status to approved (test)
    await serviceClient
      .from("ai_generation_jobs")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq("id", jobId);

    return jsonResponse({
      job_id: jobId,
      content_type: contentType,
      inserted_count: items.length,
      items: [],
      warnings: ["TEST MODE: Content validated but not saved to curriculum"],
      test_mode: true,
    });
  }

  // Build section lookup map (section_number TEXT → section_id UUID)
  let sectionLookup = new Map<string, string>();
  if (chapterId) {
    const { data: sections } = await serviceClient
      .from("sections")
      .select("id, section_number")
      .eq("chapter_id", chapterId);
    
    sectionLookup = new Map(
      (sections || [])
        .filter((s: any) => s.section_number)
        .map((s: any) => [s.section_number, s.id])
    );
  }

  // Build concept lookup map (concept_key TEXT → concept_id UUID)
  let conceptLookup = new Map<string, string>();
  {
    let conceptQuery = serviceClient
      .from("concepts")
      .select("id, concept_key")
      .eq("module_id", moduleId);
    
    if (chapterId) {
      conceptQuery = conceptQuery.eq("chapter_id", chapterId);
    }
    
    const { data: concepts } = await conceptQuery;
    conceptLookup = new Map(
      (concepts || [])
        .filter((c: any) => c.concept_key)
        .map((c: any) => [c.concept_key, c.id])
    );
  }

  // Helper to map section_number string to section_id UUID
  const getSectionId = (item: any): string | null => {
    if (!item.section_number) return null;
    const sectionNum = String(item.section_number).trim();
    return sectionLookup.get(sectionNum) || null;
  };

  // Helper to map concept_key string to concept_id UUID, falling back to manual selection
  const getConceptId = (item: any): string | null => {
    if (item.concept_key) {
      const key = String(item.concept_key).trim();
      const resolved = conceptLookup.get(key);
      if (resolved) return resolved;
    }
    // Fall back to manually selected concept_id from the request
    return manualConceptId;
  };

  // Insert into target tables
  try {
    console.log(`[${jobId}] Inserting ${items.length} ${contentType} items...`);

    if (contentType === "mcq") {
      const mcqsToInsert = items.map((item: any, idx: number) => {
        // Normalize choices format
        const normalized = normalizeMcqChoices(item);
        
        return {
          module_id: moduleId,
          chapter_id: chapterId,
          section_id: getSectionId(normalized),
          concept_id: getConceptId(normalized),
          stem: normalized.stem,
          choices: normalized.choices,
          correct_key: normalized.correct_key,
          difficulty: normalized.difficulty || "medium",
          explanation: normalized.explanation || null,
          display_order: idx,
          created_by: user.id,
          is_deleted: false,
        };
      });

      console.log(`[${jobId}] MCQ sample choices format:`, JSON.stringify(mcqsToInsert[0]?.choices));

      const { error } = await serviceClient.from("mcqs").insert(mcqsToInsert);
      if (error) {
        console.error(`[${jobId}] MCQ insert error:`, error.message, error.details, error.hint);
        throw new Error(`Failed to insert MCQs: ${error.message}`);
      }
    } else if (contentType === "flashcard") {
      if (!chapterId) {
        return jsonResponse(
          { error: "Chapter is required for flashcards", step: "validation", items: [], warnings: [] },
          400
        );
      }

      const flashcardsToInsert = items.map((item: any, idx: number) => ({
        module_id: moduleId,
        chapter_id: chapterId,
        concept_id: getConceptId(item),
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
      if (error) {
        console.error(`[${jobId}] Flashcard insert error:`, error.message);
        throw new Error(`Failed to insert flashcards: ${error.message}`);
      }
    } else if (contentType === "case_scenario") {
      // Legacy case_scenario type now inserts into virtual_patient_cases
      const casesToInsert = items.map((item: any, idx: number) => ({
        module_id: moduleId,
        chapter_id: chapterId,
        title: item.title,
        intro_text: item.case_history || item.intro_text || "",
        level: "intermediate",
        estimated_minutes: 15,
        tags: [],
        is_published: false,
        is_deleted: false,
        created_by: user.id,
      }));

      const { error } = await serviceClient
        .from("virtual_patient_cases")
        .insert(casesToInsert);
      if (error) {
        console.error(`[${jobId}] Case scenario insert error:`, error.message);
        throw new Error(`Failed to insert case scenarios: ${error.message}`);
      }
    } else if (contentType === "essay") {
      const essaysToInsert = items.map((item: any, idx: number) => ({
        module_id: moduleId,
        chapter_id: chapterId,
        concept_id: getConceptId(item),
        title: item.title,
        question: item.question,
        model_answer: item.model_answer || null,
        keywords: Array.isArray(item.keywords) ? item.keywords : null,
        display_order: idx,
        created_by: user.id,
        is_deleted: false,
      }));

      const { error } = await serviceClient.from("essays").insert(essaysToInsert);
      if (error) {
        console.error(`[${jobId}] Essay insert error:`, error.message);
        throw new Error(`Failed to insert essays: ${error.message}`);
      }
    } else if (contentType === "osce") {
      if (!chapterId) {
        return jsonResponse(
          { error: "Chapter is required for OSCE questions", step: "validation", items: [], warnings: [] },
          400
        );
      }

      const osceToInsert = items.map((item: any, idx: number) => {
        // Normalize boolean answers
        const normalized = normalizeOsceAnswers(item);
        
        return {
          module_id: moduleId,
          chapter_id: chapterId,
          concept_id: getConceptId(normalized),
          history_text: normalized.history_text,
          statement_1: normalized.statement_1,
          answer_1: normalized.answer_1,
          explanation_1: normalized.explanation_1 || null,
          statement_2: normalized.statement_2 || null,
          answer_2: normalized.answer_2 ?? null,
          explanation_2: normalized.explanation_2 || null,
          statement_3: normalized.statement_3 || null,
          answer_3: normalized.answer_3 ?? null,
          explanation_3: normalized.explanation_3 || null,
          statement_4: normalized.statement_4 || null,
          answer_4: normalized.answer_4 ?? null,
          explanation_4: normalized.explanation_4 || null,
          statement_5: normalized.statement_5 || null,
          answer_5: normalized.answer_5 ?? null,
          explanation_5: normalized.explanation_5 || null,
          display_order: idx,
          created_by: user.id,
          is_deleted: false,
        };
      });

      const { error } = await serviceClient
        .from("osce_questions")
        .insert(osceToInsert);
      if (error) {
        console.error(`[${jobId}] OSCE insert error:`, error.message);
        throw new Error(`Failed to insert OSCE questions: ${error.message}`);
      }
    } else if (contentType === "matching") {
      const matchingToInsert = items.map((item: any, idx: number) => ({
        module_id: moduleId,
        chapter_id: chapterId,
        concept_id: getConceptId(item),
        instruction: item.instruction,
        column_a_items: ensureArray(item.column_a_items),
        column_b_items: ensureArray(item.column_b_items),
        correct_matches: item.correct_matches || {},
        explanation: item.explanation || null,
        difficulty: item.difficulty || "medium",
        display_order: idx,
        created_by: user.id,
        is_deleted: false,
      }));

      const { error } = await serviceClient
        .from("matching_questions")
        .insert(matchingToInsert);
      if (error) {
        console.error(`[${jobId}] Matching insert error:`, error.message);
        throw new Error(`Failed to insert matching questions: ${error.message}`);
      }
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
            tags: Array.isArray(item.tags) ? item.tags : [],
            is_published: false,
            is_deleted: false,
            created_by: user.id,
          })
          .select("id")
          .single();

        if (caseError || !vpCase) {
          console.error(`[${jobId}] VP case insert error:`, caseError?.message);
          throw new Error(`Failed to create virtual patient case #${idx + 1}: ${caseError?.message}`);
        }

        // Insert stages
        const stages = ensureArray(item.stages);
        if (stages.length > 0) {
          const stagesToInsert = stages.map((stage: any, stageIdx: number) => {
            // Normalize stage choices
            const normalized = normalizeVpStageChoices(stage);
            
            return {
              case_id: vpCase.id,
              stage_order: normalized.stage_order || stageIdx + 1,
              stage_type: normalized.stage_type || "mcq",
              prompt: normalized.prompt,
              patient_info: normalized.patient_info || null,
              choices: ensureArray(normalized.choices),
              correct_answer: normalized.correct_answer,
              explanation: normalized.explanation || null,
              teaching_points: ensureArray(normalized.teaching_points),
              rubric: normalized.rubric || null,
            };
          });

          const { error: stagesError } = await serviceClient
            .from("virtual_patient_stages")
            .insert(stagesToInsert);

          if (stagesError) {
            console.error(`[${jobId}] VP stages insert error:`, stagesError.message);
            throw new Error(`Failed to insert stages for VP case #${idx + 1}: ${stagesError.message}`);
          }
        }
      }
    } else if (contentType === "clinical_case") {
      // Clinical Case: Insert case first, then stages (uses same tables as virtual_patient)
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        
        const { data: clinicalCase, error: caseError } = await serviceClient
          .from("virtual_patient_cases")
          .insert({
            title: item.title,
            intro_text: item.intro_text,
            module_id: moduleId,
            chapter_id: chapterId,
            level: item.level || "intermediate",
            case_mode: "practice_case",
            estimated_minutes: item.estimated_minutes || 15,
            tags: Array.isArray(item.tags) ? item.tags : [],
            is_published: false,
            is_deleted: false,
            created_by: user.id,
          })
          .select("id")
          .single();

        if (caseError || !clinicalCase) {
          console.error(`[${jobId}] Clinical case insert error:`, caseError?.message);
          throw new Error(`Failed to create clinical case #${idx + 1}: ${caseError?.message}`);
        }

        // Insert stages
        const stages = ensureArray(item.stages);
        if (stages.length > 0) {
          const stagesToInsert = stages.map((stage: any, stageIdx: number) => {
            // Normalize stage choices
            const normalized = normalizeVpStageChoices(stage);
            
            return {
              case_id: clinicalCase.id,
              stage_order: normalized.stage_order || stageIdx + 1,
              stage_type: normalized.stage_type || "mcq",
              prompt: normalized.prompt,
              patient_info: normalized.patient_info || null,
              choices: ensureArray(normalized.choices),
              correct_answer: normalized.correct_answer,
              explanation: normalized.explanation || null,
              teaching_points: ensureArray(normalized.teaching_points),
              rubric: normalized.rubric || null,
            };
          });

          const { error: stagesError } = await serviceClient
            .from("virtual_patient_stages")
            .insert(stagesToInsert);

          if (stagesError) {
            console.error(`[${jobId}] Clinical case stages insert error:`, stagesError.message);
            throw new Error(`Failed to insert stages for clinical case #${idx + 1}: ${stagesError.message}`);
          }
        }
      }
    } else if (contentType === "mind_map") {
      if (!chapterId) {
        return jsonResponse(
          { error: "Chapter is required for mind maps", step: "validation", items: [], warnings: [] },
          400
        );
      }

      const mindMapsToInsert = items.map((item: any, idx: number) => ({
        module_id: moduleId,
        chapter_id: chapterId,
        concept_id: getConceptId(item),
        resource_type: "mind_map",
        title: item.title,
        content: {
          central_concept: item.central_concept,
          nodes: ensureArray(item.nodes),
        },
        display_order: idx,
        created_by: user.id,
        is_deleted: false,
      }));

      const { error } = await serviceClient
        .from("study_resources")
        .insert(mindMapsToInsert);
      if (error) {
        console.error(`[${jobId}] Mind map insert error:`, error.message);
        throw new Error(`Failed to insert mind maps: ${error.message}`);
      }
    } else if (contentType === "worked_case") {
      if (!chapterId) {
        return jsonResponse(
          { error: "Chapter is required for worked cases", step: "validation", items: [], warnings: [] },
          400
        );
      }

      const workedCasesToInsert = items.map((item: any, idx: number) => ({
        module_id: moduleId,
        chapter_id: chapterId,
        concept_id: getConceptId(item),
        resource_type: "worked_case",
        title: item.title,
        content: {
          case_summary: item.case_summary,
          steps: ensureArray(item.steps),
          learning_objectives: ensureArray(item.learning_objectives),
        },
        display_order: idx,
        created_by: user.id,
        is_deleted: false,
      }));

      const { error } = await serviceClient
        .from("study_resources")
        .insert(workedCasesToInsert);
      if (error) {
        console.error(`[${jobId}] Worked case insert error:`, error.message);
        throw new Error(`Failed to insert worked cases: ${error.message}`);
      }
    } else if (contentType === "guided_explanation") {
      if (!chapterId) {
        return jsonResponse(
          { error: "Chapter is required for guided explanations", step: "validation", items: [], warnings: [] },
          400
        );
      }

      const guidedExplanationsToInsert = items.map((item: any, idx: number) => ({
        module_id: moduleId,
        chapter_id: chapterId,
        concept_id: getConceptId(item),
        resource_type: "guided_explanation",
        title: item.topic,
        content: {
          topic: item.topic,
          introduction: item.introduction,
          guided_questions: ensureArray(item.guided_questions),
          summary: item.summary,
          key_takeaways: ensureArray(item.key_takeaways),
        },
        display_order: idx,
        created_by: user.id,
        is_deleted: false,
      }));

      const { error } = await serviceClient
        .from("study_resources")
        .insert(guidedExplanationsToInsert);
      if (error) {
        console.error(`[${jobId}] Guided explanation insert error:`, error.message);
        throw new Error(`Failed to insert guided explanations: ${error.message}`);
      }
    } else {
      return jsonResponse(
        { error: `Unsupported content type: ${contentType}`, step: "insert", items: [], warnings: [] },
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

    if (approveError) {
      console.error(`[${jobId}] Failed to update job status:`, approveError.message);
      // Content was inserted, but status update failed - not critical
    }

    console.log(`[${jobId}] Successfully inserted ${items.length} ${contentType} items`);

    return jsonResponse({
      job_id: jobId,
      content_type: contentType,
      inserted_count: items.length,
      items: [],
      warnings: [],
      test_mode: false,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error(`[${jobId}] approve-ai-content error:`, e);
    
    // Update job with error
    await serviceClient
      .from("ai_generation_jobs")
      .update({
        status: "failed",
        error_message: `[approval] ${msg}`,
      })
      .eq("id", jobId);

    return jsonResponse({ 
      error: msg, 
      step: "insert", 
      job_id: jobId,
      items: [], 
      warnings: [] 
    }, 500);
  }
});
