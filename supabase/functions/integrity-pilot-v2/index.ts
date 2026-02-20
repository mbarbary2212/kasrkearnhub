import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Location {
  id: string;
  preview: string;
  module_id: string | null;
  module_title: string | null;
  chapter_id: string | null;
  chapter_title: string | null;
  topic_id: string | null;
  topic_title: string | null;
}

interface Issue {
  type: string;
  severity: "critical" | "warning" | "info";
  count: number;
  description: string;
  locations: Location[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const adminRoles = ["super_admin", "platform_admin", "admin", "department_admin", "topic_admin"];
    if (!roleData || !adminRoles.includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isSuperAdmin = roleData.role === "super_admin" || roleData.role === "platform_admin";

    // Get scoped module IDs for non-super admins
    let scopedModuleIds: string[] = [];
    let scopedChapterIds: string[] = [];

    if (!isSuperAdmin) {
      // Get modules admin has access to
      const { data: moduleAdmins } = await supabase
        .from("module_admins")
        .select("module_id")
        .eq("user_id", user.id);

      scopedModuleIds = moduleAdmins?.map((m) => m.module_id) || [];

      // Get chapters admin has access to via topic_admins
      const { data: topicAdmins } = await supabase
        .from("topic_admins")
        .select("chapter_id")
        .eq("user_id", user.id)
        .not("chapter_id", "is", null);

      scopedChapterIds = topicAdmins?.map((t) => t.chapter_id).filter(Boolean) as string[] || [];
    }

    // Fetch lookup data for modules and chapters
    const { data: modules } = await supabase
      .from("modules")
      .select("id, title");

    const { data: chapters } = await supabase
      .from("module_chapters")
      .select("id, title, module_id");

    const { data: topics } = await supabase
      .from("topics")
      .select("id, title");

    const moduleMap = new Map(modules?.map((m) => [m.id, m.title]) || []);
    const chapterMap = new Map(chapters?.map((c) => [c.id, { title: c.title, module_id: c.module_id }]) || []);
    const topicMap = new Map(topics?.map((t) => [t.id, t.title]) || []);

    // Parse request body for check type
    const body = await req.json().catch(() => ({}));
    const checkType = body.checkType as string | undefined;

    const issues: Issue[] = [];

    // Helper to check if item is in scope
    const isInScope = (moduleId: string | null, chapterId: string | null): boolean => {
      if (isSuperAdmin) return true;
      if (moduleId && scopedModuleIds.includes(moduleId)) return true;
      if (chapterId && scopedChapterIds.includes(chapterId)) return true;
      return false;
    };

    // Helper to build location
    const buildLocation = (
      id: string,
      preview: string,
      moduleId: string | null,
      chapterId: string | null,
      topicId: string | null
    ): Location => {
      const chapterData = chapterId ? chapterMap.get(chapterId) : null;
      return {
        id,
        preview: preview.substring(0, 100) + (preview.length > 100 ? "..." : ""),
        module_id: moduleId,
        module_title: moduleId ? moduleMap.get(moduleId) || null : null,
        chapter_id: chapterId,
        chapter_title: chapterData?.title || null,
        topic_id: topicId,
        topic_title: topicId ? topicMap.get(topicId) || null : null,
      };
    };

    // ========== OSCE CHECK ==========
    if (!checkType || checkType === "osce") {
      const { data: osceQuestions } = await supabase
        .from("osce_questions")
        .select("id, history_text, statement_1, statement_2, statement_3, statement_4, statement_5, answer_1, answer_2, answer_3, answer_4, answer_5, module_id, chapter_id")
        .eq("is_deleted", false);

      const osceIssues: Location[] = [];

      for (const osce of osceQuestions || []) {
        if (!isInScope(osce.module_id, osce.chapter_id)) continue;

        const problems: string[] = [];

        // Check for empty history_text
        if (!osce.history_text?.trim()) {
          problems.push("missing history");
        }

        // Check if all statements are empty (at least statement_1 should have content)
        const statements = [osce.statement_1, osce.statement_2, osce.statement_3, osce.statement_4, osce.statement_5];
        const hasAnyStatement = statements.some((s) => s?.trim());

        if (!hasAnyStatement) {
          problems.push("no statements");
        }

        // Check that non-empty statements have valid answers
        for (let i = 0; i < 5; i++) {
          const stmt = statements[i];
          const answer = [osce.answer_1, osce.answer_2, osce.answer_3, osce.answer_4, osce.answer_5][i];
          if (stmt?.trim() && answer === null) {
            problems.push(`statement ${i + 1} missing answer`);
          }
        }

        if (problems.length > 0) {
          osceIssues.push(
            buildLocation(
              osce.id,
              `[${problems.join(", ")}] ${osce.history_text?.substring(0, 50) || "(no history)"}`,
              osce.module_id,
              osce.chapter_id,
              null
            )
          );
        }
      }

      if (osceIssues.length > 0) {
        issues.push({
          type: "osce_integrity",
          severity: "critical",
          count: osceIssues.length,
          description: `${osceIssues.length} OSCE question(s) have missing or invalid fields`,
          locations: osceIssues.slice(0, 50),
        });
      }
    }

    // ========== FLASHCARDS CHECK ==========
    if (!checkType || checkType === "flashcards") {
      const { data: flashcards } = await supabase
        .from("flashcards")
        .select("id, front, back, module_id, chapter_id")
        .eq("is_deleted", false);

      const flashcardIssues: Location[] = [];

      for (const fc of flashcards || []) {
        if (!isInScope(fc.module_id, fc.chapter_id)) continue;

        const problems: string[] = [];

        if (!fc.front?.trim()) problems.push("empty front");
        if (!fc.back?.trim()) problems.push("empty back");
        if (!fc.chapter_id) problems.push("missing chapter");

        if (problems.length > 0) {
          flashcardIssues.push(
            buildLocation(
              fc.id,
              `[${problems.join(", ")}] ${fc.front?.substring(0, 50) || "(no front)"}`,
              fc.module_id,
              fc.chapter_id,
              null
            )
          );
        }
      }

      if (flashcardIssues.length > 0) {
        issues.push({
          type: "flashcard_integrity",
          severity: flashcardIssues.some((l) => l.preview.includes("empty")) ? "critical" : "warning",
          count: flashcardIssues.length,
          description: `${flashcardIssues.length} flashcard(s) have missing or invalid fields`,
          locations: flashcardIssues.slice(0, 50),
        });
      }
    }

    // ========== CLINICAL CASES CHECK ==========
    if (!checkType || checkType === "clinical_cases") {
      const { data: clinicalCases } = await supabase
        .from("virtual_patient_cases")
        .select("id, title, intro_text, module_id, chapter_id, topic_id")
        .eq("is_deleted", false);

      const clinicalIssues: Location[] = [];

      for (const cc of clinicalCases || []) {
        if (!isInScope(cc.module_id, cc.chapter_id)) continue;

        const problems: string[] = [];

        if (!cc.title?.trim()) problems.push("empty title");
        if (!cc.intro_text?.trim()) problems.push("empty intro");
        if (!cc.module_id && !cc.chapter_id && !cc.topic_id) problems.push("no location refs");

        if (problems.length > 0) {
          clinicalIssues.push(
            buildLocation(
              cc.id,
              `[${problems.join(", ")}] ${cc.title?.substring(0, 50) || "(no title)"}`,
              cc.module_id,
              cc.chapter_id,
              cc.topic_id
            )
          );
        }
      }

      if (clinicalIssues.length > 0) {
        issues.push({
          type: "clinical_case_integrity",
          severity: clinicalIssues.some((l) => l.preview.includes("empty")) ? "critical" : "warning",
          count: clinicalIssues.length,
          description: `${clinicalIssues.length} clinical case(s) have missing or invalid fields`,
          locations: clinicalIssues.slice(0, 50),
        });
      }
    }

    // ========== LECTURES CHECK ==========
    if (!checkType || checkType === "lectures") {
      const { data: lectures } = await supabase
        .from("lectures")
        .select("id, title, video_url, module_id, chapter_id, topic_id")
        .eq("is_deleted", false);

      const lectureIssues: Location[] = [];

      for (const lec of lectures || []) {
        if (!isInScope(lec.module_id, lec.chapter_id)) continue;

        const problems: string[] = [];

        if (!lec.title?.trim()) problems.push("empty title");
        if (!lec.video_url?.trim()) problems.push("no video URL");
        if (!lec.module_id && !lec.chapter_id) problems.push("no module/chapter");

        if (problems.length > 0) {
          lectureIssues.push(
            buildLocation(
              lec.id,
              `[${problems.join(", ")}] ${lec.title?.substring(0, 50) || "(no title)"}`,
              lec.module_id,
              lec.chapter_id,
              lec.topic_id
            )
          );
        }
      }

      if (lectureIssues.length > 0) {
        issues.push({
          type: "lecture_integrity",
          severity: lectureIssues.some((l) => l.preview.includes("empty title")) ? "critical" : "warning",
          count: lectureIssues.length,
          description: `${lectureIssues.length} lecture(s) have missing or invalid fields`,
          locations: lectureIssues.slice(0, 50),
        });
      }
    }

    // ========== MATCHING QUESTIONS CHECK ==========
    if (!checkType || checkType === "matching") {
      const { data: matchingQuestions } = await supabase
        .from("matching_questions")
        .select("id, instruction, column_a_items, column_b_items, correct_matches, module_id, chapter_id, topic_id")
        .eq("is_deleted", false);

      const matchingIssues: Location[] = [];

      for (const mq of matchingQuestions || []) {
        if (!isInScope(mq.module_id, mq.chapter_id)) continue;

        const problems: string[] = [];

        if (!mq.instruction?.trim()) problems.push("empty instruction");
        
        const colA = mq.column_a_items as unknown[];
        const colB = mq.column_b_items as unknown[];
        const matches = mq.correct_matches as unknown[];
        
        if (!colA || !Array.isArray(colA) || colA.length === 0) problems.push("empty column A");
        if (!colB || !Array.isArray(colB) || colB.length === 0) problems.push("empty column B");
        if (!matches || !Array.isArray(matches) || matches.length === 0) problems.push("no matches");
        if (!mq.chapter_id) problems.push("no chapter");

        if (problems.length > 0) {
          matchingIssues.push(
            buildLocation(
              mq.id,
              `[${problems.join(", ")}] ${mq.instruction?.substring(0, 50) || "(no instruction)"}`,
              mq.module_id,
              mq.chapter_id,
              mq.topic_id
            )
          );
        }
      }

      if (matchingIssues.length > 0) {
        issues.push({
          type: "matching_integrity",
          severity: matchingIssues.some((l) => l.preview.includes("empty")) ? "critical" : "warning",
          count: matchingIssues.length,
          description: `${matchingIssues.length} matching question(s) have missing or invalid fields`,
          locations: matchingIssues.slice(0, 50),
        });
      }
    }

    // ========== MCQ SETS CHECK ==========
    if (!checkType || checkType === "mcq_sets") {
      const { data: mcqSets } = await supabase
        .from("mcq_sets")
        .select("id, title, description, module_id, chapter_id, topic_id")
        .eq("is_deleted", false);

      const mcqSetIssues: Location[] = [];

      for (const ms of mcqSets || []) {
        if (!isInScope(ms.module_id, ms.chapter_id)) continue;

        const problems: string[] = [];

        if (!ms.title?.trim()) problems.push("empty title");
        if (!ms.chapter_id && !ms.module_id) problems.push("no location");

        if (problems.length > 0) {
          mcqSetIssues.push(
            buildLocation(
              ms.id,
              `[${problems.join(", ")}] ${ms.title?.substring(0, 50) || "(no title)"}`,
              ms.module_id,
              ms.chapter_id,
              ms.topic_id
            )
          );
        }
      }

      if (mcqSetIssues.length > 0) {
        issues.push({
          type: "mcq_set_integrity",
          severity: mcqSetIssues.some((l) => l.preview.includes("empty title")) ? "critical" : "warning",
          count: mcqSetIssues.length,
          description: `${mcqSetIssues.length} MCQ set(s) have missing or invalid fields`,
          locations: mcqSetIssues.slice(0, 50),
        });
      }
    }

    // ========== GUIDED EXPLANATION CHECK ==========
    if (!checkType || checkType === "guided_explanation") {
      const { data: resources } = await supabase
        .from("study_resources")
        .select("id, title, module_id, chapter_id, content")
        .eq("resource_type", "guided_explanation")
        .eq("is_deleted", false);

      const guidedIssues: Location[] = [];

      for (const r of resources || []) {
        if (!isInScope(r.module_id, r.chapter_id)) continue;

        const content = r.content as any;
        const problems: string[] = [];

        if (!r.title?.trim()) problems.push("empty title");
        if (!content?.topic?.trim()) problems.push("no topic");
        if (!content?.introduction?.trim()) problems.push("no introduction");
        if (!content?.guided_questions || content.guided_questions.length < 3) {
          problems.push("fewer than 3 questions");
        }

        if (problems.length > 0) {
          guidedIssues.push(
            buildLocation(
              r.id,
              `[${problems.join(", ")}] ${r.title?.substring(0, 50) || "(untitled)"}`,
              r.module_id,
              r.chapter_id,
              null
            )
          );
        }
      }

      if (guidedIssues.length > 0) {
        issues.push({
          type: "guided_explanation_integrity",
          severity: "warning",
          count: guidedIssues.length,
          description: `${guidedIssues.length} guided explanation(s) have missing topic/intro or fewer than 3 questions.`,
          locations: guidedIssues.slice(0, 50),
        });
      }
    }

    // ========== MIND MAP CHECK ==========
    if (!checkType || checkType === "mind_map") {
      const { data: resources } = await supabase
        .from("study_resources")
        .select("id, title, module_id, chapter_id, content")
        .eq("resource_type", "mind_map")
        .eq("is_deleted", false);

      const mindMapIssues: Location[] = [];

      for (const r of resources || []) {
        if (!isInScope(r.module_id, r.chapter_id)) continue;

        const content = r.content as any;
        const problems: string[] = [];

        if (!r.title?.trim()) problems.push("empty title");

        const hasImageUrl = content?.imageUrl?.trim();
        const hasNodes = content?.nodes && Array.isArray(content.nodes) && content.nodes.length > 0;
        const hasCentralConcept = content?.central_concept?.trim();

        // Must have either an image OR structured nodes with central concept
        if (!hasImageUrl && (!hasNodes || !hasCentralConcept)) {
          problems.push("no image and no structured nodes/central concept");
        }

        if (problems.length > 0) {
          mindMapIssues.push(
            buildLocation(
              r.id,
              `[${problems.join(", ")}] ${r.title?.substring(0, 50) || "(untitled)"}`,
              r.module_id,
              r.chapter_id,
              null
            )
          );
        }
      }

      if (mindMapIssues.length > 0) {
        issues.push({
          type: "mind_map_integrity",
          severity: "warning",
          count: mindMapIssues.length,
          description: `${mindMapIssues.length} mind map(s) have no image and no structured nodes, or missing central concept.`,
          locations: mindMapIssues.slice(0, 50),
        });
      }
    }

    return new Response(
      JSON.stringify({
        issues,
        checkedAt: new Date().toISOString(),
        scope: isSuperAdmin ? "all" : "scoped",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    console.error("Integrity pilot v2 error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
