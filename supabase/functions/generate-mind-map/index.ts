import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAISettings, getAIProvider, callAI, resolveApiKey } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Section detection ───────────────────────────────────────────────

interface DetectedSection {
  key: string;
  title: string;
  number: string | null;
  startIndex: number;
  endIndex: number;
  text: string;
  confidence: number;
}

interface DetectionResult {
  sections: DetectedSection[];
  method: string;
  overallConfidence: number;
  rawCandidateCount: number;
}

/**
 * Universal section detection – tries multiple heading patterns.
 * Returns sections sorted by document order.
 */
function detectSections(rawText: string): DetectionResult {
  const text = normalizeText(rawText);

  // Patterns ordered by specificity
  const patterns: { name: string; regex: RegExp; extractNum: (m: RegExpMatchArray) => string; extractTitle: (m: RegExpMatchArray) => string }[] = [
    // 1.1, 2.3, 10.4 style
    {
      name: "decimal_numbered",
      regex: /^(\d{1,3}\.\d{1,3})\s+([A-Z][^\n]{3,80})$/gm,
      extractNum: (m) => m[1],
      extractTitle: (m) => m[2].trim(),
    },
    // 1.1.1 sub-sub style
    {
      name: "triple_decimal",
      regex: /^(\d{1,3}\.\d{1,3}\.\d{1,3})\s+([A-Z][^\n]{3,80})$/gm,
      extractNum: (m) => m[1],
      extractTitle: (m) => m[2].trim(),
    },
    // Section 1, Section 2
    {
      name: "section_keyword",
      regex: /^Section\s+(\d+)[:\s]+([^\n]{3,80})$/gim,
      extractNum: (m) => m[1],
      extractTitle: (m) => m[2].trim(),
    },
    // I., II., III. Roman numerals
    {
      name: "roman_numeral",
      regex: /^((?:I{1,3}|IV|V(?:I{0,3})|IX|X(?:I{0,3})))\.\s+([A-Z][^\n]{3,80})$/gm,
      extractNum: (m) => m[1],
      extractTitle: (m) => m[2].trim(),
    },
    // ALL CAPS heading (heuristic fallback)
    {
      name: "caps_heading",
      regex: /^([A-Z][A-Z\s&,\-]{4,60})$/gm,
      extractNum: () => "",
      extractTitle: (m) => m[1].trim(),
    },
  ];

  let bestResult: DetectionResult | null = null;

  for (const pattern of patterns) {
    const candidates: DetectedSection[] = [];
    let match: RegExpExecArray | null;
    pattern.regex.lastIndex = 0;

    while ((match = pattern.regex.exec(text)) !== null) {
      const num = pattern.extractNum(match);
      const title = pattern.extractTitle(match);

      // Skip very short or purely numeric titles
      if (title.length < 3 || /^\d+$/.test(title)) continue;
      // Skip common false positives
      if (/^(TABLE|FIGURE|DIAGRAM|REFERENCES|BIBLIOGRAPHY|INDEX|CONTENTS)/i.test(title)) continue;

      candidates.push({
        key: `${num ? num + "_" : ""}${title.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 50)}`,
        title,
        number: num || null,
        startIndex: match.index,
        endIndex: -1, // filled later
        text: "",
        confidence: 0,
      });
    }

    if (candidates.length < 2) continue;

    // Assign end indices & extract section text
    for (let i = 0; i < candidates.length; i++) {
      candidates[i].endIndex = i < candidates.length - 1 ? candidates[i + 1].startIndex : text.length;
      candidates[i].text = text.slice(candidates[i].startIndex, candidates[i].endIndex).trim();
    }

    // Score confidence
    const hasConsistentNumbering = candidates.every((c) => c.number !== null);
    const avgTextLen = candidates.reduce((s, c) => s + c.text.length, 0) / candidates.length;
    const reasonableSize = avgTextLen > 100 && avgTextLen < 50000;

    let confidence = 0.3; // base
    if (hasConsistentNumbering) confidence += 0.35;
    if (reasonableSize) confidence += 0.2;
    if (candidates.length >= 3 && candidates.length <= 30) confidence += 0.15;

    candidates.forEach((c) => (c.confidence = confidence));

    if (!bestResult || confidence > bestResult.overallConfidence) {
      bestResult = {
        sections: candidates,
        method: pattern.name,
        overallConfidence: Math.round(confidence * 100) / 100,
        rawCandidateCount: candidates.length,
      };
    }
  }

  return bestResult || { sections: [], method: "none", overallConfidence: 0, rawCandidateCount: 0 };
}

function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\f/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

// ─── Markmap validation ──────────────────────────────────────────────

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateMarkmapMarkdown(md: string): ValidationResult {
  const errors: string[] = [];

  // Check frontmatter
  if (!md.startsWith("---")) {
    errors.push("Missing Markmap frontmatter (must start with ---)");
  } else {
    const fmEnd = md.indexOf("---", 3);
    if (fmEnd === -1) {
      errors.push("Frontmatter not closed (missing second ---)");
    } else {
      const fm = md.slice(3, fmEnd);
      if (!fm.includes("markmap")) {
        errors.push("Frontmatter missing 'markmap' key");
      }
    }
  }

  // Count root headings (# at start of line, not ## or ###)
  const rootHeadings = md.match(/^# [^\n]+/gm);
  if (!rootHeadings || rootHeadings.length === 0) {
    errors.push("No root heading (# Title) found");
  } else if (rootHeadings.length > 1) {
    errors.push(`Multiple root headings found (${rootHeadings.length}), expected exactly 1`);
  }

  // Check for non-markdown prose before/after
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
    const { chapter_id, topic_id, generation_mode } = body as {
      chapter_id?: string;
      topic_id?: string;
      generation_mode: "full" | "sections" | "both";
    };

    if (!chapter_id && !topic_id) return jsonError("BAD_REQUEST", "chapter_id or topic_id required");
    if (!generation_mode) return jsonError("BAD_REQUEST", "generation_mode required (full|sections|both)");

    // ── Fetch PDF text ────────────────────────────────────────────
    let pdfText = "";
    let sourceTitle = "";
    let sourcePdfUrl: string | null = null;

    if (chapter_id) {
      const { data: chapter, error } = await serviceClient
        .from("module_chapters")
        .select("title, pdf_text, pdf_url")
        .eq("id", chapter_id)
        .single();
      if (error || !chapter) return jsonError("NOT_FOUND", "Chapter not found", 404);
      if (!chapter.pdf_text) return jsonError("NO_TEXT", "Chapter has no extracted PDF text. Upload a PDF first.", 400);
      pdfText = chapter.pdf_text;
      sourceTitle = chapter.title;
      sourcePdfUrl = chapter.pdf_url || null;
    } else {
      const { data: topic, error } = await serviceClient
        .from("topics")
        .select("name")
        .eq("id", topic_id!)
        .single();
      if (error || !topic) return jsonError("NOT_FOUND", "Topic not found", 404);
      sourceTitle = topic.name;
      // Topics may not have pdf_text — allow but warn
      return jsonError("NOT_IMPLEMENTED", "Topic-based generation not yet supported (no pdf_text field on topics)", 400);
    }

    // ── Section detection ─────────────────────────────────────────
    const detection = detectSections(pdfText);
    console.log(`[generate-mind-map] Detection: method=${detection.method}, sections=${detection.sections.length}, confidence=${detection.overallConfidence}`);

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

    const defaultFullPrompt = `Analyze the provided PDF content and create a hierarchical mind map in Markdown compatible with Markmap.

You are a Professor of Surgery teaching undergraduate medical students.

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
- No explanatory text before or after the markdown`;

    const defaultSectionPrompt = `Analyze the provided section content and create a focused hierarchical mind map in Markdown compatible with Markmap.

You are a Professor of Surgery teaching undergraduate medical students.

Rules:
- Return ONLY valid Markmap Markdown
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
- No explanatory text before or after the markdown`;

    const fullSystemPrompt = fullPromptRow?.system_prompt || defaultFullPrompt;
    const sectionSystemPrompt = sectionPromptRow?.system_prompt || defaultSectionPrompt;
    const fullPromptVersion = fullPromptRow?.id || "built-in-default";
    const sectionPromptVersion = sectionPromptRow?.id || "built-in-default";

    // ── AI settings ───────────────────────────────────────────────
    const aiSettings = await getAISettings(serviceClient);
    const provider = getAIProvider(aiSettings);
    const keyResult = await resolveApiKey(serviceClient, user.id, role, aiSettings);
    if (keyResult.error) return jsonError("AI_KEY_ERROR", keyResult.error, 500);

    // ── Generate maps ─────────────────────────────────────────────
    const results: { type: string; title: string; success: boolean; mapId?: string; errors?: string[] }[] = [];

    // Full map
    if (generation_mode === "full" || generation_mode === "both") {
      console.log("[generate-mind-map] Generating full chapter map...");
      const userPrompt = `Chapter: "${sourceTitle}"\n\nFull PDF content:\n\n${pdfText.slice(0, 120000)}`;
      const aiResult = await callAI(fullSystemPrompt, userPrompt, provider, keyResult.apiKey);

      if (!aiResult.success) {
        console.error("[generate-mind-map] Full map AI error:", aiResult.error);
        results.push({ type: "full", title: sourceTitle, success: false, errors: [aiResult.error || "AI call failed"] });
      } else {
        const markdown = aiResult.content!.trim();
        const validation = validateMarkmapMarkdown(markdown);

        if (!validation.valid) {
          console.error("[generate-mind-map] Full map validation failed:", validation.errors);
          results.push({ type: "full", title: sourceTitle, success: false, errors: validation.errors });
        } else {
          // Save as draft
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
                detection_method: detection.method,
                detection_confidence: detection.overallConfidence,
                sections_found: detection.sections.length,
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
            results.push({ type: "full", title: sourceTitle, success: false, errors: [saveErr.message] });
          } else {
            results.push({ type: "full", title: sourceTitle, success: true, mapId: saved.id });
          }
        }
      }
    }

    // Section maps
    if ((generation_mode === "sections" || generation_mode === "both") && detection.sections.length >= 2) {
      console.log(`[generate-mind-map] Generating ${detection.sections.length} section maps...`);

      // Try to match sections to existing DB sections
      let dbSections: { id: string; name: string; section_number: string | null }[] = [];
      if (chapter_id) {
        const { data } = await serviceClient
          .from("sections")
          .select("id, name, section_number")
          .eq("chapter_id", chapter_id)
          .order("display_order");
        dbSections = data || [];
      }

      for (const section of detection.sections) {
        console.log(`[generate-mind-map] Generating map for section: ${section.number || ""} ${section.title}`);

        const sectionLabel = section.number ? `${section.number} ${section.title}` : section.title;
        const userPrompt = `Section: "${sectionLabel}"\nFrom chapter: "${sourceTitle}"\n\nSection content:\n\n${section.text.slice(0, 80000)}`;
        const aiResult = await callAI(sectionSystemPrompt, userPrompt, provider, keyResult.apiKey);

        if (!aiResult.success) {
          console.error(`[generate-mind-map] Section "${sectionLabel}" AI error:`, aiResult.error);
          results.push({ type: "section", title: sectionLabel, success: false, errors: [aiResult.error || "AI call failed"] });
          continue;
        }

        const markdown = aiResult.content!.trim();
        const validation = validateMarkmapMarkdown(markdown);

        if (!validation.valid) {
          console.error(`[generate-mind-map] Section "${sectionLabel}" validation failed:`, validation.errors);
          results.push({ type: "section", title: sectionLabel, success: false, errors: validation.errors });
          continue;
        }

        // Try to match to existing DB section
        let matchedSectionId: string | null = null;
        if (section.number) {
          const match = dbSections.find((s) => s.section_number === section.number);
          if (match) matchedSectionId = match.id;
        }
        if (!matchedSectionId) {
          const match = dbSections.find((s) =>
            s.name.toLowerCase().trim() === section.title.toLowerCase().trim()
          );
          if (match) matchedSectionId = match.id;
        }

        const { data: saved, error: saveErr } = await serviceClient
          .from("mind_maps")
          .insert({
            chapter_id: chapter_id || null,
            topic_id: topic_id || null,
            section_id: matchedSectionId,
            title: `${sectionLabel} — Mind Map`,
            map_type: "section",
            source_type: "generated_markdown",
            section_key: section.key,
            section_title: section.title,
            section_number: section.number,
            markdown_content: markdown,
            source_pdf_url: sourcePdfUrl,
            source_detection_metadata: {
              detection_method: detection.method,
              detection_confidence: section.confidence,
              section_text_length: section.text.length,
              matched_db_section_id: matchedSectionId,
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
          results.push({ type: "section", title: sectionLabel, success: false, errors: [saveErr.message] });
        } else {
          results.push({ type: "section", title: sectionLabel, success: true, mapId: saved.id });
        }

        // Small delay between AI calls to avoid rate limits
        await new Promise((r) => setTimeout(r, 500));
      }
    } else if ((generation_mode === "sections" || generation_mode === "both") && detection.sections.length < 2) {
      console.warn("[generate-mind-map] Section detection found fewer than 2 sections, skipping section maps");
      results.push({
        type: "section",
        title: "Section detection",
        success: false,
        errors: [`Only ${detection.sections.length} section(s) detected (confidence: ${detection.overallConfidence}). Section maps require at least 2 sections.`],
      });
    }

    return jsonResp({
      success: true,
      generation_mode,
      detection: {
        method: detection.method,
        confidence: detection.overallConfidence,
        sections_found: detection.sections.length,
        section_titles: detection.sections.map((s) => ({
          number: s.number,
          title: s.title,
          text_length: s.text.length,
        })),
      },
      results,
      total_generated: results.filter((r) => r.success).length,
      total_failed: results.filter((r) => !r.success).length,
    });
  } catch (err) {
    console.error("[generate-mind-map] Unhandled error:", err);
    return jsonError("INTERNAL_ERROR", err instanceof Error ? err.message : "Unknown error", 500);
  }
});
