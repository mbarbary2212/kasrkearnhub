import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAISettings, resolveApiKey } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Markmap validation ──────────────────────────────────────────────

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateMarkmapMarkdown(md: string): ValidationResult {
  const errors: string[] = [];

  if (md.includes("```")) {
    errors.push("Output contains fenced code blocks (```) — must be pure Markmap Markdown");
  }

  if (!md.startsWith("---")) {
    errors.push("Missing Markmap frontmatter (must start with ---)");
  } else {
    const fmEnd = md.indexOf("---", 3);
    if (fmEnd === -1) {
      errors.push("Frontmatter not closed (missing second ---)");
    } else {
      const fm = md.slice(3, fmEnd);
      if (!fm.includes("markmap")) errors.push("Frontmatter missing 'markmap' key");
      if (!fm.includes("colorFreezeLevel")) errors.push("Frontmatter missing 'colorFreezeLevel' key");
      if (!fm.includes("initialExpandLevel")) errors.push("Frontmatter missing 'initialExpandLevel' key");
    }
  }

  const rootHeadings = md.match(/^# [^\n]+/gm);
  if (!rootHeadings || rootHeadings.length === 0) {
    errors.push("No root heading (# Title) found");
  } else if (rootHeadings.length > 1) {
    errors.push(`Multiple root headings found (${rootHeadings.length}), expected exactly 1`);
  }

  const subHeadings = md.match(/^## [^\n]+/gm);
  if (!subHeadings || subHeadings.length === 0) {
    errors.push("No secondary headings (##) found — map is flat/useless");
  }

  const afterFm = md.indexOf("---", 3);
  if (afterFm > -1) {
    const body = md.slice(afterFm + 3).trim();
    const firstLine = body.split("\n")[0];
    if (firstLine && !firstLine.startsWith("#")) {
      errors.push("Content after frontmatter should start with a heading, found prose text");
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function jsonResp(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(error: string, detail: string, status = 400) {
  console.error(`[generate-mind-map] ${error}: ${detail}`);
  return jsonResp({ error, detail }, status);
}

// ─── Result item type ────────────────────────────────────────────────

interface ResultItem {
  type: string;
  title: string;
  success: boolean;
  status: "generated" | "failed" | "skipped";
  mapId?: string;
  errors?: string[];
}

function normalizeGeminiModel(model?: string | null): string | null {
  if (!model) return null;

  let normalized = model.trim();
  if (!normalized) return null;

  if (normalized.startsWith("models/")) normalized = normalized.slice("models/".length);
  if (normalized.startsWith("google/")) normalized = normalized.slice("google/".length);

  const legacyMap: Record<string, string> = {
    "gemini-2.5-flash-preview-05-20": "gemini-2.5-flash",
    "gemini-2.5-pro-preview-05-06": "gemini-2.5-pro",
    "gemini-2.5-flash-lite-preview-06-17": "gemini-2.5-flash-lite",
  };

  return legacyMap[normalized] || normalized;
}

function buildGeminiModelCandidates(configuredModel?: string | null): string[] {
  const candidates = new Set<string>();
  const normalized = normalizeGeminiModel(configuredModel);
  if (normalized) candidates.add(normalized);

  // Stable direct-Gemini fallbacks for PDF generateContent
  candidates.add("gemini-2.5-flash");
  candidates.add("gemini-2.5-pro");
  candidates.add("gemini-2.5-flash-lite");

  return Array.from(candidates);
}

// ─── Direct PDF-to-Gemini call ───────────────────────────────────────

async function callGeminiWithPdf(
  pdfBytes: Uint8Array,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  modelCandidates: string[] = ["gemini-2.5-flash"],
  extraGenConfig?: Record<string, unknown>,
): Promise<{ success: boolean; content?: string; error?: string; modelUsed?: string }> {
  // Base64-encode the PDF for JSON transport
  let base64 = "";
  const CHUNK = 8192;
  for (let i = 0; i < pdfBytes.length; i += CHUNK) {
    base64 += String.fromCharCode(...pdfBytes.subarray(i, i + CHUNK));
  }
  base64 = btoa(base64);

  const body = {
    contents: [
      {
        parts: [
          { inlineData: { mimeType: "application/pdf", data: base64 } },
          { text: userPrompt },
        ],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 65536,
      ...(extraGenConfig || {}),
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  const modelsToTry = modelCandidates.length > 0 ? modelCandidates : ["gemini-2.5-flash"];
  let lastError = "Unknown Gemini API error";

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const json = await resp.json();

        if (!resp.ok) {
          const errMsg = json?.error?.message || JSON.stringify(json).slice(0, 300);
          lastError = `Gemini API error (${resp.status}): ${errMsg}`;

          if (resp.status === 404 && attempt === 0) {
            console.warn(`[callGeminiWithPdf] Model not found, trying next fallback model: ${model}`);
            break;
          }

          if ((resp.status === 429 || resp.status === 503) && attempt < MAX_RETRIES) {
            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
            console.warn(`[callGeminiWithPdf] ${resp.status}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }

          return { success: false, error: lastError };
        }

        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          const finishReason = json?.candidates?.[0]?.finishReason;
          return { success: false, error: `Gemini returned no content (finishReason: ${finishReason || "unknown"})` };
        }

        // Return raw text — let callers handle format-specific cleanup
        return { success: true, content: text.trim(), modelUsed: model };
      } catch (err) {
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`[callGeminiWithPdf] Network error, retrying in ${delay}ms:`, err);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        lastError = `Network error: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  }

  return { success: false, error: lastError };
}

// ─── Section maps response parser ────────────────────────────────────

interface ParsedSection {
  section_number: string | null;
  section_title: string;
  markdown_content: string;
}

function parseSectionsResponse(raw: string): ParsedSection[] {
  // Strip code fences (```json ... ```)
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    const firstNewline = cleaned.indexOf("\n");
    if (firstNewline > -1) cleaned = cleaned.slice(firstNewline + 1);
  }
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3).trim();

  // Try direct parse first
  try {
    const parsed = JSON.parse(cleaned);
    // Accept both array and { sections: [...] } wrapper
    if (Array.isArray(parsed) && parsed.length > 0) {
      return normalizeSections(parsed);
    }
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
      return normalizeSections(parsed.sections);
    }
  } catch { /* not direct JSON */ }

  // Try to find JSON array in the response
  try {
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeSections(parsed);
      }
    }
  } catch {
    // fall through
  }

  console.error("[parseSectionsResponse] Failed to parse JSON from response. First 500 chars:", cleaned.slice(0, 500));
  return [];
}

function normalizeSections(parsed: any[]): ParsedSection[] {
  return parsed.map((s: any) => {
    let md = (s.markdown_content || s.markdown || s.content || "").trim();
    // Strip code fences within individual section markdown
    if (md.startsWith("```")) {
      const nl = md.indexOf("\n");
      if (nl > -1) md = md.slice(nl + 1);
    }
    if (md.endsWith("```")) md = md.slice(0, -3).trim();
    return {
      section_number: s.section_number || null,
      section_title: s.section_title || s.title || "Untitled Section",
      markdown_content: md,
    };
  }).filter((s: ParsedSection) => s.markdown_content.length > 20);
}

// ─── Main handler ────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError("AUTH_MISSING", "No authorization header", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !user) return jsonError("AUTH_INVALID", "Invalid token", 401);

    // Role check
    const { data: roleRow } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    const role = roleRow?.role || "student";
    const allowed = ["super_admin", "platform_admin", "admin", "teacher"];
    if (!allowed.includes(role)) return jsonError("FORBIDDEN", "Insufficient permissions", 403);

    // Parse request
    const body = await req.json();
    const { chapter_id, topic_id, generation_mode, document_id } = body as {
      chapter_id?: string;
      topic_id?: string;
      generation_mode: "full" | "sections" | "both";
      document_id?: string;
    };

    if (!chapter_id && !topic_id) return jsonError("BAD_REQUEST", "chapter_id or topic_id required");
    if (!generation_mode) return jsonError("BAD_REQUEST", "generation_mode required (full|sections|both)");

    // ── Fetch PDF ─────────────────────────────────────────────────
    let sourceTitle = "";
    let sourcePdfUrl: string | null = null;
    let sourceDocumentName: string | null = null;
    let sourceDocumentId: string | null = null;
    let pdfBytes: Uint8Array | null = null;

    // Helper: download admin doc PDF bytes
    async function downloadAdminDocPdf(doc: { storage_path: string; file_name: string; id?: string; title?: string }): Promise<{ bytes: Uint8Array; signedUrl: string; docTitle: string }> {
      const { data: signedData, error: signErr } = await serviceClient.storage
        .from("admin-pdfs")
        .createSignedUrl(doc.storage_path, 600);
      if (signErr || !signedData?.signedUrl) {
        throw new Error(`Failed to get signed URL: ${signErr?.message || "unknown"}`);
      }
      const pdfResponse = await fetch(signedData.signedUrl);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to download PDF: ${pdfResponse.status}`);
      }
      const pdfBuffer = await pdfResponse.arrayBuffer();
      return { bytes: new Uint8Array(pdfBuffer), signedUrl: signedData.signedUrl, docTitle: doc.title || doc.file_name };
    }

    if (chapter_id) {
      const { data: chapter, error } = await serviceClient
        .from("module_chapters")
        .select("title, module_id")
        .eq("id", chapter_id)
        .single();
      if (error || !chapter) return jsonError("NOT_FOUND", "Chapter not found", 404);
      sourceTitle = chapter.title;

      // Find the PDF document
      let docToUse: { id: string; title: string; storage_path: string; file_name: string } | null = null;

      if (document_id) {
        // Admin explicitly selected a document
        const { data: chosenDoc, error: docErr } = await serviceClient
          .from("admin_documents")
          .select("id, title, storage_path, file_name")
          .eq("id", document_id)
          .eq("is_deleted", false)
          .single();
        if (docErr || !chosenDoc) return jsonError("NOT_FOUND", "Selected document not found or deleted.", 404);
        docToUse = chosenDoc;
      } else {
        // Auto-detect: latest chapter-linked PDF
        const { data: adminDoc } = await serviceClient
          .from("admin_documents")
          .select("id, title, storage_path, file_name")
          .eq("chapter_id", chapter_id)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!adminDoc) {
          // Fallback: module-level document
          const { data: moduleDoc } = await serviceClient
            .from("admin_documents")
            .select("id, title, storage_path, file_name")
            .eq("module_id", chapter.module_id)
            .eq("is_deleted", false)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          docToUse = moduleDoc;
        } else {
          docToUse = adminDoc;
        }
      }

      if (!docToUse) {
        return jsonError("NO_PDF", "No PDF document found for this chapter. Upload a Content PDF first, or select a document manually.", 400);
      }

      try {
        const dlResult = await downloadAdminDocPdf(docToUse);
        pdfBytes = dlResult.bytes;
        sourcePdfUrl = dlResult.signedUrl;
        sourceDocumentName = dlResult.docTitle;
        sourceDocumentId = docToUse.id;
        console.log(`[generate-mind-map] Downloaded "${dlResult.docTitle}" (${pdfBytes.length} bytes)`);
      } catch (e) {
        return jsonError("DOWNLOAD_ERROR", e instanceof Error ? e.message : "PDF could not be downloaded", 500);
      }
    } else {
      const { data: topic, error } = await serviceClient
        .from("topics")
        .select("name")
        .eq("id", topic_id!)
        .single();
      if (error || !topic) return jsonError("NOT_FOUND", "Topic not found", 404);
      sourceTitle = topic.name;
      return jsonError("NOT_IMPLEMENTED", "Topic-based generation not yet supported", 400);
    }

    // ── Validate PDF ──────────────────────────────────────────────
    if (!pdfBytes || pdfBytes.length < 10240) {
      return jsonError("INVALID_PDF", `PDF is too small or invalid (${pdfBytes?.length || 0} bytes, minimum 10KB)`, 400);
    }

    // ── Fetch prompts ─────────────────────────────────────────────
    const { data: fullPromptRow } = await serviceClient
      .from("mind_map_prompts")
      .select("*")
      .eq("prompt_type", "full")
      .eq("is_default", true)
      .limit(1)
      .maybeSingle();

    const { data: sectionPromptRow } = await serviceClient
      .from("mind_map_prompts")
      .select("*")
      .eq("prompt_type", "section")
      .eq("is_default", true)
      .limit(1)
      .maybeSingle();

    const defaultFullPrompt = `You are a Professor of Surgery teaching undergraduate medical students.
Analyze the provided PDF document and create a structured, hierarchical mind map.

Rules:
- Return ONLY valid Markmap Markdown
- Start with the required frontmatter:
---
markmap:
  colorFreezeLevel: 2
  initialExpandLevel: 2
---
- Use a single root heading (#) matching the chapter title
- Use ##, ###, #### for hierarchy
- Focus on: classifications, mechanisms, indications, complications, clinical relationships
- Keep nodes concise and exam-oriented
- Ignore page headers, footers, figure captions, table labels, and reference lists unless educationally central
- No explanatory text before or after the markdown
- Do NOT wrap output in code blocks`;

    // ── Built-in structured section prompt (mandatory JSON contract) ──
    const SECTION_JSON_CONTRACT = `You are an expert medical educator.
Analyze the provided PDF document. Identify the true main sections of this chapter (ignore page headers, footers, figures, captions, tables, and reference lists unless educationally central).

For EACH main section, generate a separate focused Markmap mind map.

You MUST return your response as a JSON array where each element has:
- "section_number": the section number if detectable (e.g. "1.1", "2.3"), or null
- "section_title": the section heading/title
- "markdown_content": a complete valid Markmap markdown string for that section

Each markdown_content MUST:
- Start with the required frontmatter:
---
markmap:
  colorFreezeLevel: 2
  initialExpandLevel: 2
---
- Use a single root heading (#) matching the section title
- Use ##, ###, #### for deeper hierarchy
- Be detailed since this covers a single section
- Focus on: key concepts, pathophysiology, diagnosis, management, clinical pearls
- Keep nodes concise and exam-oriented
- NOT contain code blocks

Return ONLY the JSON array, no other text.`;

    // For sections: always enforce the structured JSON contract.
    // If admin has a custom section prompt, check if it's structured or legacy.
    const adminSectionStyle = sectionPromptRow?.system_prompt || "";
    const isLegacySectionPrompt = adminSectionStyle.length > 0 &&
      !adminSectionStyle.includes("JSON array") && !adminSectionStyle.includes("json array") &&
      !adminSectionStyle.includes("section_title") && !adminSectionStyle.includes("markdown_content");

    let effectiveSectionPrompt: string;
    if (!adminSectionStyle || isLegacySectionPrompt) {
      if (isLegacySectionPrompt) {
        console.warn("[generate-mind-map] Section prompt is legacy/non-structured — using built-in JSON contract instead. Update Section prompt in Mind Map Prompts settings.");
      }
      effectiveSectionPrompt = SECTION_JSON_CONTRACT;
    } else {
      effectiveSectionPrompt = adminSectionStyle;
    }

    const fullSystemPrompt = fullPromptRow?.system_prompt || defaultFullPrompt;
    const fullPromptVersion = fullPromptRow?.id || "built-in-default";
    const sectionPromptVersion = sectionPromptRow?.id || "built-in-default";

    // ── AI settings ───────────────────────────────────────────────
    const aiSettings = await getAISettings(serviceClient);
    const keyResult = await resolveApiKey(serviceClient, user.id, role, aiSettings);
    if (keyResult.error) return jsonError("AI_KEY_ERROR", keyResult.error, 500);
    const geminiModelCandidates = buildGeminiModelCandidates(aiSettings.gemini_model);
    console.log("[generate-mind-map] Gemini model candidates:", geminiModelCandidates);

    // Resolve the actual API key — when keySource is 'global', use GOOGLE_API_KEY from env
    let geminiApiKey = keyResult.apiKey;
    if (!geminiApiKey) {
      geminiApiKey = Deno.env.get("GOOGLE_API_KEY");
      if (!geminiApiKey) {
        return jsonError("AI_KEY_ERROR", "No Google API key configured. Please set GOOGLE_API_KEY in Edge Function secrets.", 500);
      }
    }

    // ── Generate maps ─────────────────────────────────────────────
    const results: ResultItem[] = [];
    const pdfSize = pdfBytes.length;

    // Full map
    if (generation_mode === "full" || generation_mode === "both") {
      console.log("[generate-mind-map] Generating full chapter map via direct PDF-to-AI...");
      const userPrompt = `Create a full mind map for this chapter: "${sourceTitle}"`;
      const aiResult = await callGeminiWithPdf(pdfBytes, fullSystemPrompt, userPrompt, geminiApiKey!, geminiModelCandidates);

      if (!aiResult.success) {
        console.error("[generate-mind-map] Full map AI error:", aiResult.error);
        results.push({ type: "full", title: sourceTitle, success: false, status: "failed", errors: [aiResult.error || "AI failed to process PDF"] });
      } else {
        // Strip code fences for markmap output
        let markdown = aiResult.content!.trim();
        if (markdown.startsWith("```")) {
          const nl = markdown.indexOf("\n");
          if (nl > -1) markdown = markdown.slice(nl + 1);
        }
        if (markdown.endsWith("```")) markdown = markdown.slice(0, -3).trim();
        const validation = validateMarkmapMarkdown(markdown);

        if (!validation.valid) {
          console.error("[generate-mind-map] Full map validation failed:", validation.errors);
          results.push({ type: "full", title: sourceTitle, success: false, status: "failed", errors: validation.errors });
        } else {
          const { data: saved, error: saveErr } = await serviceClient
            .from("mind_maps")
            .insert({
              chapter_id: chapter_id || null,
              topic_id: topic_id || null,
              title: `${sourceTitle} — Full Mind Map`,
              map_type: "full",
              source_type: "generated_markdown",
              markdown_content: markdown,
              source_pdf_url: sourcePdfUrl,
              source_detection_metadata: {
                method: "direct_pdf_to_ai",
                  model_used: aiResult.modelUsed || geminiModelCandidates[0],
                pdf_size: pdfSize,
                source_document_id: sourceDocumentId,
                prompt_snapshot: fullSystemPrompt,
                generated_at: new Date().toISOString(),
              },
              prompt_version: fullPromptVersion,
              status: "draft",
              created_by: user.id,
            })
            .select("id")
            .single();

          if (saveErr) {
            console.error("[generate-mind-map] Save error:", saveErr);
            results.push({ type: "full", title: sourceTitle, success: false, status: "failed", errors: [saveErr.message] });
          } else {
            results.push({ type: "full", title: sourceTitle, success: true, status: "generated", mapId: saved.id });
          }
        }
      }
    }

    // Section maps
    if (generation_mode === "sections" || generation_mode === "both") {
      console.log("[generate-mind-map] Generating section maps via direct PDF-to-AI...");
      const userPrompt = `Analyze this PDF chapter "${sourceTitle}" and generate separate mind maps for each main section. Return the result as a JSON array as instructed.`;

      // Use Gemini JSON mode for reliable structured output
      const sectionGenConfig = { responseMimeType: "application/json" };
      const aiResult = await callGeminiWithPdf(pdfBytes, effectiveSectionPrompt, userPrompt, geminiApiKey!, geminiModelCandidates, sectionGenConfig);

      if (!aiResult.success) {
        console.error("[generate-mind-map] Section maps AI error:", aiResult.error);
        results.push({ type: "section", title: "Section generation", success: false, status: "failed", errors: [aiResult.error || "AI failed to process PDF"] });
      } else {
        console.log("[generate-mind-map] Section AI response length:", aiResult.content!.length, "preview:", aiResult.content!.slice(0, 200));
        const sections = parseSectionsResponse(aiResult.content!);

        if (sections.length === 0) {
          console.warn("[generate-mind-map] Could not parse section maps from AI response. Full response length:", aiResult.content!.length);
          results.push({
            type: "section",
            title: "Section generation",
            success: false,
            status: "failed",
            errors: ["AI response could not be parsed into section maps. Check Edge Function logs for details."],
          });
        } else {
          console.log(`[generate-mind-map] Parsed ${sections.length} sections from AI response`);

          // Try to match sections to DB sections
          let dbSections: { id: string; name: string; section_number: string | null }[] = [];
          if (chapter_id) {
            const { data } = await serviceClient
              .from("sections")
              .select("id, name, section_number")
              .eq("chapter_id", chapter_id)
              .order("display_order");
            dbSections = data || [];
          }

          for (const section of sections) {
            const sectionLabel = section.section_number
              ? `${section.section_number} ${section.section_title}`
              : section.section_title;

            const validation = validateMarkmapMarkdown(section.markdown_content);

            if (!validation.valid) {
              console.error(`[generate-mind-map] Section "${sectionLabel}" validation failed:`, validation.errors);
              results.push({ type: "section", title: sectionLabel, success: false, status: "failed", errors: validation.errors });
              continue;
            }

            // Match to DB section
            let matchedSectionId: string | null = null;
            if (section.section_number) {
              const match = dbSections.find((s) => s.section_number === section.section_number);
              if (match) matchedSectionId = match.id;
            }
            if (!matchedSectionId) {
              const match = dbSections.find((s) =>
                s.name.toLowerCase().trim() === section.section_title.toLowerCase().trim()
              );
              if (match) matchedSectionId = match.id;
            }

            const sectionKey = `${section.section_number ? section.section_number + "_" : ""}${section.section_title.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 50)}`;

            const { data: saved, error: saveErr } = await serviceClient
              .from("mind_maps")
              .insert({
                chapter_id: chapter_id || null,
                topic_id: topic_id || null,
                section_id: matchedSectionId,
                title: `${sectionLabel} — Mind Map`,
                map_type: "section",
                source_type: "generated_markdown",
                section_key: sectionKey,
                section_title: section.section_title,
                section_number: section.section_number,
                markdown_content: section.markdown_content,
                source_pdf_url: sourcePdfUrl,
                source_detection_metadata: {
                  method: "direct_pdf_to_ai",
                  model_used: aiResult.modelUsed || geminiModelCandidates[0],
                  pdf_size: pdfSize,
                  source_document_id: sourceDocumentId,
                  matched_db_section_id: matchedSectionId,
                  prompt_snapshot: effectiveSectionPrompt,
                  generated_at: new Date().toISOString(),
                },
                prompt_version: sectionPromptVersion,
                status: "draft",
                created_by: user.id,
              })
              .select("id")
              .single();

            if (saveErr) {
              console.error(`[generate-mind-map] Section save error:`, saveErr);
              results.push({ type: "section", title: sectionLabel, success: false, status: "failed", errors: [saveErr.message] });
            } else {
              results.push({ type: "section", title: sectionLabel, success: true, status: "generated", mapId: saved.id });
            }
          }
        }
      }
    }

    return jsonResp({
      success: true,
      generation_mode,
      source_document: {
        name: sourceDocumentName,
        id: sourceDocumentId,
        pdf_size: pdfSize,
        method: "direct_pdf_to_ai",
      },
      results,
      total_generated: results.filter((r) => r.status === "generated").length,
      total_failed: results.filter((r) => r.status === "failed").length,
      total_skipped: results.filter((r) => r.status === "skipped").length,
    });
  } catch (err) {
    console.error("[generate-mind-map] Unhandled error:", err);
    return jsonError("INTERNAL_ERROR", err instanceof Error ? err.message : "Unknown error", 500);
  }
});
