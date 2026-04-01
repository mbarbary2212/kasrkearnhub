import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getAISettings,
  getAIProvider,
  getModelForContentType,
  getContentTypeOverrides,
  callAI,
  resolveApiKey,
  logAIUsage,
  loadAIRules,
} from "../_shared/ai-provider.ts";
import { getBlueprintContext } from "../_shared/blueprint.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // ── Check role ──
    const { data: roleRow } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    const userRole = roleRow?.role || "student";

    const allowedRoles = ["admin", "teacher", "department_admin", "platform_admin", "super_admin"];
    if (!allowedRoles.includes(userRole)) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Parse body ──
    const body = await req.json();
    const caseId = body.case_id as string;
    if (!caseId) {
      return new Response(JSON.stringify({ error: "case_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch case ──
    const { data: vpCase, error: caseError } = await serviceClient
      .from("virtual_patient_cases")
      .select("*")
      .eq("id", caseId)
      .single();

    if (caseError || !vpCase) {
      return new Response(JSON.stringify({ error: "Case not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch context in parallel ──
    const [
      chapterResult,
      referenceDocsResult,
      aiSettingsResult,
      overridesResult,
      rulesResult,
    ] = await Promise.all([
      vpCase.chapter_id
        ? serviceClient.from("module_chapters").select("title, chapter_number, pdf_text").eq("id", vpCase.chapter_id).single()
        : Promise.resolve({ data: null, error: null }),
      // Fetch reference docs for this case and its chapter
      serviceClient
        .from("case_reference_documents")
        .select("title, extracted_text, doc_category")
        .or(
          `case_id.eq.${caseId}${vpCase.chapter_id ? `,chapter_id.eq.${vpCase.chapter_id}` : ""}`
        ),
      getAISettings(serviceClient),
      getContentTypeOverrides(serviceClient),
      loadAIRules(serviceClient, "structured_case", vpCase.module_id, vpCase.chapter_id),
    ]);

    const chapter = chapterResult.data;
    const referenceDocs = referenceDocsResult.data || [];
    const settings = aiSettingsResult;
    const overrides = overridesResult;
    const aiRules = rulesResult;

    // ── Resolve API key ──
    const keyResult = await resolveApiKey(serviceClient, userId, userRole, settings);
    if (keyResult.error) {
      return new Response(JSON.stringify({ error: keyResult.error, errorCode: keyResult.errorCode }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Build AI provider ──
    const model = getModelForContentType(settings, "structured_case", overrides);
    const provider = { ...getAIProvider(settings), model };

    // ── Build the prompt ──
    const activeSections: string[] = vpCase.active_sections || [
      "history_taking", "physical_examination", "investigations_labs",
      "investigations_imaging", "diagnosis", "medical_management",
      "surgical_management", "monitoring_followup", "patient_family_advice", "conclusion",
    ];

    const sectionCounts: Record<string, number> = vpCase.section_question_counts || {};

    // Inject blueprint context if chapter_id available
    let blueprintInstruction = '';
    if (vpCase.chapter_id && typeof vpCase.chapter_id === 'string' && vpCase.chapter_id.trim().length > 0) {
      try {
        const blueprint = await getBlueprintContext(serviceClient, vpCase.chapter_id);
        blueprintInstruction = blueprint.distribution_instruction;
      } catch (e) {
        console.warn("[generate-structured-case] Blueprint context fetch failed:", e);
      }
    }

    const rawSystemPrompt = buildSystemPrompt();
    const systemPrompt = blueprintInstruction
      ? `${blueprintInstruction}\n\n${rawSystemPrompt}`
      : rawSystemPrompt;
    const userPrompt = buildUserPrompt(vpCase, chapter, referenceDocs, activeSections, sectionCounts, aiRules);

    console.log(`[generate-structured-case] Generating for case ${caseId}, provider: ${provider.name}, model: ${provider.model}`);

    // ── Call AI ──
    const result = await callAI(systemPrompt, userPrompt, provider, keyResult.apiKey);

    if (!result.success || !result.content) {
      console.error("[generate-structured-case] AI call failed:", result.error);
      return new Response(JSON.stringify({ error: result.error || "AI generation failed" }), {
        status: result.status || 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Parse JSON from AI response ──
    let generatedData: any;
    try {
      // Strip markdown code fences if present
      let cleaned = result.content.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
      }
      generatedData = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("[generate-structured-case] Failed to parse AI JSON:", parseError);
      console.error("[generate-structured-case] Raw content:", result.content.substring(0, 500));
      return new Response(JSON.stringify({
        error: "AI returned invalid JSON. Please try again.",
        raw_content: result.content.substring(0, 1000),
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Post-generation: normalize physical exam keys ──
    if (generatedData.physical_examination?.findings) {
      const VALID_PE_KEYS = ["general", "head_neck", "vital_signs", "chest", "upper_limbs", "abdomen", "lower_limbs", "extra"];
      const rawFindings = generatedData.physical_examination.findings;
      const normalizedFindings: Record<string, any> = {};
      const remapped: string[] = [];

      function mapPEKey(key: string): string {
        const k = key.toLowerCase();
        if (VALID_PE_KEYS.includes(k)) return k;
        if (k === "general_appearance") return "general";
        if (k === "vitals") return "vital_signs";
        if (k.includes("abdomen") || k.includes("abdominal")) return "abdomen";
        if (k.includes("head") || k.includes("neck") || k.includes("cranial")) return "head_neck";
        if (k.includes("chest") || k.includes("cardio") || k.includes("respiratory") || k.includes("lung")) return "chest";
        if (k.includes("upper") || k.includes("arm") || k.includes("hand")) return "upper_limbs";
        if (k.includes("lower") || k.includes("leg") || k.includes("foot")) return "lower_limbs";
        if (k.includes("vital") || k.includes("bp") || k.includes("pulse")) return "vital_signs";
        return "extra";
      }

      for (const [key, val] of Object.entries(rawFindings)) {
        if (!val || typeof val !== "object") continue;
        const mapped = mapPEKey(key);
        if (key !== mapped) remapped.push(`${key}→${mapped}`);

        const v = val as Record<string, any>;
        const text = v.finding || v.text || "";
        const label = v.label || key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

        if (normalizedFindings[mapped]) {
          normalizedFindings[mapped].text = [normalizedFindings[mapped].text, `**${label}:** ${text}`].filter(Boolean).join("\n\n");
          if (v.ref && !normalizedFindings[mapped].ref) normalizedFindings[mapped].ref = v.ref;
        } else {
          normalizedFindings[mapped] = {
            text,
            ref: v.ref || null,
            ...(mapped === "extra" ? { label } : {}),
            ...(v.vitals ? { vitals: v.vitals } : {}),
          };
        }
      }

      generatedData.physical_examination.findings = normalizedFindings;
      // Remove IMPORTANT_NOTE if AI echoed it
      delete generatedData.physical_examination.IMPORTANT_NOTE;

      if (remapped.length > 0) {
        console.log(`[generate-structured-case] PE keys normalized: ${remapped.join(", ")}`);
      }
    }

    // ── Save generated data to the case ──
    const { error: updateError } = await serviceClient
      .from("virtual_patient_cases")
      .update({
        generated_case_data: generatedData,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", caseId);

    if (updateError) {
      console.error("[generate-structured-case] Failed to save:", updateError);
      return new Response(JSON.stringify({ error: "Failed to save generated case data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Log usage ──
    await logAIUsage(serviceClient, userId, "structured_case", provider.name, keyResult.keySource || "global");

    return new Response(JSON.stringify({
      success: true,
      case_id: caseId,
      generated_data: generatedData,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[generate-structured-case] Unhandled error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ════════════════════════════════════════════════════
// PROMPTS
// ════════════════════════════════════════════════════

function buildSystemPrompt(): string {
  return `You are an expert medical education AI that generates structured OSCE clinical case content for medical students.

OUTPUT RULES:
- Return ONLY valid JSON. No markdown, no code fences, no comments, no extra text.
- All text fields must use plain text (no markdown formatting).
- Include Arabic labels (label_ar) for all checklist items, findings, and prompts.
- For Egyptian Arabic, use colloquial Egyptian dialect (العامية المصرية) for patient-facing text only.
- Clinical/medical terminology in Arabic should use formal Arabic (الفصحى).
- Be medically accurate and evidence-based.
- Difficulty should match the specified level.`;
}

function buildUserPrompt(
  vpCase: any,
  chapter: any,
  referenceDocs: any[],
  activeSections: string[],
  sectionCounts: Record<string, number>,
  aiRules: string,
): string {
  const parts: string[] = [];

  // ── Case metadata ──
  parts.push(`CASE CONFIGURATION:
- Title: ${vpCase.title}
- Chief Complaint: ${vpCase.chief_complaint || vpCase.intro_text}
- Difficulty: ${vpCase.level}
- History Mode: ${vpCase.history_mode || "full_conversation"}
- Patient Language: ${vpCase.patient_language || "en"}
- Delivery Mode: ${vpCase.delivery_mode || "practice"}
- Active Sections: ${activeSections.join(", ")}
${vpCase.additional_instructions ? `\nADDITIONAL INSTRUCTIONS FROM TEACHER:\n${vpCase.additional_instructions}` : ""}`);

  // ── Chapter PDF context (primary RAG source) ──
  if (chapter?.pdf_text) {
    const trimmedPdf = chapter.pdf_text.substring(0, 12000);
    parts.push(`\nPRIMARY SOURCE — Chapter ${chapter.chapter_number}: ${chapter.title}\n${trimmedPdf}`);
  }

  // ── Reference documents (optional supplementary RAG) ──
  const checklistDocs = referenceDocs.filter(d => d.doc_category === "checklist");
  const otherDocs = referenceDocs.filter(d => d.doc_category !== "checklist");

  if (checklistDocs.length > 0) {
    parts.push(`\nSUPPLEMENTARY CHECKLIST DOCUMENTS:
IMPORTANT: Use ONLY the "Professional Attitude" and "History Taking" sections (A-E: Personal History, Chief Complaint, Present History, Past Medical History, Family History) from these checklists as guidance for generating checklist items. IGNORE General Examination, Local Examination, and Discussion sections from the checklist. Do NOT import mark values — the teacher will set their own scoring weights.`);
    for (const doc of checklistDocs) {
      if (doc.extracted_text) {
        parts.push(`\n--- ${doc.title} ---\n${doc.extracted_text.substring(0, 6000)}`);
      }
    }
  }

  if (otherDocs.length > 0) {
    parts.push(`\nSUPPLEMENTARY REFERENCE DOCUMENTS:`);
    for (const doc of otherDocs) {
      if (doc.extracted_text) {
        parts.push(`\n--- ${doc.title} (${doc.doc_category}) ---\n${doc.extracted_text.substring(0, 4000)}`);
      }
    }
  }

  // ── AI rules ──
  if (aiRules) {
    parts.push(`\nAI RULES (follow these instructions):\n${aiRules}`);
  }

  // ── Output schema ──
  parts.push(`\nGENERATE the complete case data as a single JSON object following this EXACT structure:

{
${activeSections.includes("history_taking") ? `  "history_taking": {
    "patient_profile": {
      "name": "string",
      "age": number,
      "gender": "male" | "female",
      "occupation": "string (optional)"
    },
    "system_prompt": "string — the AI patient system prompt for the conversation. Include personality traits, speech patterns, and what information to reveal when asked. ${vpCase.patient_language === "ar_eg" ? "Patient speaks in Egyptian Arabic dialect." : "Patient speaks in English."}",
    "categories": [
      {
        "category_key": "personal_history",
        "label": "Personal History",
        "label_ar": "التاريخ الشخصي",
        "items": [
          { "key": "string", "label": "string", "label_ar": "string", "expected_behaviour": "string" }
        ]
      },
      {
        "category_key": "chief_complaint",
        "label": "Chief Complaint",
        "label_ar": "الشكوى الرئيسية",
        "items": [...]
      },
      {
        "category_key": "present_history",
        "label": "Present History",
        "label_ar": "التاريخ المرضي الحالي",
        "items": [...] — Include onset, duration, character, severity, aggravating/relieving factors, associated symptoms, risk factors, treatments tried
      },
      {
        "category_key": "past_medical_history",
        "label": "Past Medical History",
        "label_ar": "التاريخ المرضي السابق",
        "items": [...]
      },
      {
        "category_key": "family_history",
        "label": "Family History",
        "label_ar": "التاريخ العائلي",
        "items": [...]
      }
    ],
    "max_score": 30
  },` : ""}
${activeSections.includes("physical_examination") ? `  "physical_examination": {
    "findings": {
      "general":     { "text": "string — ALL general appearance findings (observation, posture, mental state) combined in one text block. Use **bold** sub-headings if multiple components.", "ref": "string|null — optional chapter quote" },
      "head_neck":   { "text": "string — ALL head & neck findings (inspection, palpation, ENT, cranial nerves, thyroid) combined in one text block with **bold** sub-headings.", "ref": "string|null" },
      "vital_signs": { "vitals": [{ "name": "HR|BP|Temp|RR|SpO2|CRT", "value": "string", "unit": "°C for Temp, mmHg for BP, bpm for HR, breaths/min for RR, % for SpO2, seconds for CRT — NEVER use Fahrenheit for temperature", "abnormal": true|false }], "text": "string — additional vitals commentary", "ref": "string|null" },
      "chest":       { "text": "string — ALL chest findings (inspection, palpation, percussion, auscultation — cardiac AND respiratory) combined in one text block with **bold** sub-headings.", "ref": "string|null" },
      "upper_limbs": { "text": "string — ALL upper limb findings (inspection, motor, sensory, reflexes, special tests) combined in one text block with **bold** sub-headings.", "ref": "string|null" },
      "abdomen":     { "text": "string — ALL abdominal findings (inspection, palpation, percussion, auscultation, special tests like Murphy's/Rovsing's) combined in one text block with **bold** sub-headings. Example: **Inspection:** Distended with visible scar.\\n**Palpation:** Tender in RIF with guarding.\\n**Auscultation:** Reduced bowel sounds.", "ref": "string|null" },
      "lower_limbs": { "text": "string — ALL lower limb findings (inspection, motor, sensory, reflexes, pulses, special tests) combined in one text block with **bold** sub-headings.", "ref": "string|null" },
      "extra":       { "label": "string — custom label e.g. Wound, DRE, Fundoscopy", "text": "string — special exam findings (omit if not applicable)", "ref": "string|null" }
    },
    "IMPORTANT_NOTE": "Use ONLY these 8 exact keys: general, head_neck, vital_signs, chest, upper_limbs, abdomen, lower_limbs, extra. Do NOT use descriptive keys like wound_assessment or abdomen_palpation. Combine ALL examination components (inspection, palpation, percussion, auscultation, special tests) into a SINGLE 'text' field per region using **bold** markdown sub-headings.",
    "related_topics": [
      { "key": "string", "label": "short label", "title": "topic title", "chapter": "Chapter X — Section Y", "body": "educational explanation", "quote": "quoted text from chapter" }
    ],
    "max_score": 15
  },` : ""}
${activeSections.includes("investigations_labs") ? `  "investigations_labs": {
    "available_labs": [
      { "test_name": "string", "test_name_ar": "string", "result": "string", "unit": "string", "reference_range": "string", "is_abnormal": boolean }
    ],
    "expected_orders": ["string — lab tests the student should order"],
    "max_score": 10
  },` : ""}
${activeSections.includes("investigations_imaging") ? `  "investigations_imaging": {
    "available_imaging": [
      { "modality": "string", "modality_ar": "string", "body_part": "string", "finding": "string", "finding_ar": "string" }
    ],
    "expected_orders": ["string — imaging the student should order"],
    "max_score": 10
  },` : ""}
${activeSections.includes("diagnosis") ? `  "diagnosis": {
    "expected_diagnosis": "string",
    "differential_diagnoses": ["string"],
    "max_score": 10
  },` : ""}
${activeSections.includes("medical_management") ? `  "medical_management": {
    "mcqs": [
      {
        "question": "string",
        "question_ar": "string",
        "options": [
          { "key": "A", "text": "string", "text_ar": "string", "is_correct": boolean, "explanation": "string" }
        ]
      }
    ] — generate ${sectionCounts["medical_management"] || 3} MCQs,
    "max_score": 10
  },` : ""}
${activeSections.includes("surgical_management") ? `  "surgical_management": {
    "mcqs": [...] — generate ${sectionCounts["surgical_management"] || 3} MCQs,
    "free_text_prompt": "string (optional)",
    "free_text_prompt_ar": "string (optional)",
    "expected_answer": "string (optional)",
    "max_score": 10
  },` : ""}
${activeSections.includes("monitoring_followup") ? `  "monitoring_followup": {
    "prompt": "string — ask about monitoring plan and follow-up",
    "prompt_ar": "string",
    "expected_answer": "string",
    "max_score": 5
  },` : ""}
${activeSections.includes("patient_family_advice") ? `  "patient_family_advice": {
    "prompt": "string — ask what the student would advise the patient/family",
    "prompt_ar": "string",
    "expected_answer": "string",
    "max_score": 5
  },` : ""}
${activeSections.includes("conclusion") ? `  "conclusion": {
    "ward_round_prompt": "string — Keep concise: ask student to present a brief structured ward round summary (5-8 sentences max, NOT a full case report)",
    "ward_round_prompt_ar": "string",
    "key_decisions": ["string — max 3-5 bullet points"],
    "max_score": 5
  },` : ""}
  "professional_attitude": {
    "max_score": 10,
    "items": [
      { "key": "introduction", "label": "Introduced themselves to the patient", "label_ar": "قدّم نفسه للمريض", "expected_behaviour": "Student says their name and role before asking any questions" },
      { "key": "clear_language", "label": "Used clear, non-technical language", "label_ar": "استخدم لغة واضحة وبسيطة", "expected_behaviour": "Avoided medical jargon when speaking to the patient" },
      { "key": "active_listening", "label": "Demonstrated active listening", "label_ar": "أظهر الإنصات الفعّال", "expected_behaviour": "Did not interrupt, acknowledged patient responses" },
      { "key": "infection_control", "label": "Performed hand hygiene / PPE", "label_ar": "التزم بضوابط مكافحة العدوى", "expected_behaviour": "Mentioned or performed hand hygiene at start of encounter" },
      { "key": "closure", "label": "Thanked patient and explained next steps", "label_ar": "أنهى المقابلة بشكل مهني", "expected_behaviour": "Ended the encounter professionally" }
    ],
    "scoring_note": "Scored holistically from transcript at submission. Not tied to a specific section."
  }
}

IMPORTANT: Generate clinically accurate, case-specific content. History checklist items should be tailored to the chief complaint (e.g., for thyroid case include thyroid-specific symptoms). Physical exam findings should include both normal and abnormal findings relevant to the case. Lab values should use realistic reference ranges. MCQ distractors should be clinically plausible.`);

  return parts.join("\n\n");
}
