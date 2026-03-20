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

function detectSections(rawText: string): DetectionResult {
  const text = normalizeText(rawText);

  const patterns: { name: string; regex: RegExp; extractNum: (m: RegExpMatchArray) => string; extractTitle: (m: RegExpMatchArray) => string }[] = [
    {
      name: "decimal_numbered",
      regex: /^(\d{1,3}\.\d{1,3})\s+([A-Z][^\n]{3,80})$/gm,
      extractNum: (m) => m[1],
      extractTitle: (m) => m[2].trim(),
    },
    {
      name: "triple_decimal",
      regex: /^(\d{1,3}\.\d{1,3}\.\d{1,3})\s+([A-Z][^\n]{3,80})$/gm,
      extractNum: (m) => m[1],
      extractTitle: (m) => m[2].trim(),
    },
    {
      name: "section_keyword",
      regex: /^Section\s+(\d+)[:\s]+([^\n]{3,80})$/gim,
      extractNum: (m) => m[1],
      extractTitle: (m) => m[2].trim(),
    },
    {
      name: "roman_numeral",
      regex: /^((?:I{1,3}|IV|V(?:I{0,3})|IX|X(?:I{0,3})))\.\s+([A-Z][^\n]{3,80})$/gm,
      extractNum: (m) => m[1],
      extractTitle: (m) => m[2].trim(),
    },
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

      if (title.length < 3 || /^\d+$/.test(title)) continue;
      if (/^(TABLE|FIGURE|DIAGRAM|REFERENCES|BIBLIOGRAPHY|INDEX|CONTENTS)/i.test(title)) continue;

      candidates.push({
        key: `${num ? num + "_" : ""}${title.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 50)}`,
        title,
        number: num || null,
        startIndex: match.index,
        endIndex: -1,
        text: "",
        confidence: 0,
      });
    }

    if (candidates.length < 2) continue;

    for (let i = 0; i < candidates.length; i++) {
      candidates[i].endIndex = i < candidates.length - 1 ? candidates[i + 1].startIndex : text.length;
      candidates[i].text = text.slice(candidates[i].startIndex, candidates[i].endIndex).trim();
    }

    const hasConsistentNumbering = candidates.every((c) => c.number !== null);
    const avgTextLen = candidates.reduce((s, c) => s + c.text.length, 0) / candidates.length;
    const reasonableSize = avgTextLen > 100 && avgTextLen < 50000;

    let confidence = 0.3;
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

  // Reject fenced code blocks
  if (md.includes("```")) {
    errors.push("Output contains fenced code blocks (```) — must be pure Markmap Markdown");
  }

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
      if (!fm.includes("colorFreezeLevel")) {
        errors.push("Frontmatter missing 'colorFreezeLevel' key");
      }
      if (!fm.includes("initialExpandLevel")) {
        errors.push("Frontmatter missing 'initialExpandLevel' key");
      }
    }
  }

  // Count root headings
  const rootHeadings = md.match(/^# [^\n]+/gm);
  if (!rootHeadings || rootHeadings.length === 0) {
    errors.push("No root heading (# Title) found");
  } else if (rootHeadings.length > 1) {
    errors.push(`Multiple root headings found (${rootHeadings.length}), expected exactly 1`);
  }

  // Must have at least one ## heading (not flat)
  const subHeadings = md.match(/^## [^\n]+/gm);
  if (!subHeadings || subHeadings.length === 0) {
    errors.push("No secondary headings (##) found — map is flat/useless");
  }

  // Check for prose before first heading
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

// ─── PDF text extraction ─────────────────────────────────────────────

function extractTextFromPdfBuffer(bytes: Uint8Array): string {
  // Binary PDF text extraction — decode stream objects and extract readable text
  const raw = new TextDecoder("latin1").decode(bytes);
  const textChunks: string[] = [];

  // Extract text from PDF stream objects using BT/ET markers
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match: RegExpExecArray | null;
  while ((match = btEtRegex.exec(raw)) !== null) {
    const block = match[1];
    // Extract text from Tj and TJ operators
    const tjMatches = block.match(/\(([^)]*)\)\s*Tj/g);
    if (tjMatches) {
      for (const tj of tjMatches) {
        const textMatch = tj.match(/\(([^)]*)\)/);
        if (textMatch) textChunks.push(textMatch[1]);
      }
    }
    // TJ array operator
    const tjArrayMatches = block.match(/\[(.*?)\]\s*TJ/g);
    if (tjArrayMatches) {
      for (const tja of tjArrayMatches) {
        const parts = tja.match(/\(([^)]*)\)/g);
        if (parts) {
          textChunks.push(parts.map(p => p.slice(1, -1)).join(""));
        }
      }
    }
  }

  return textChunks.join(" ").replace(/\s+/g, " ").trim();
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
        .select("title, pdf_text, pdf_url, module_id")
        .eq("id", chapter_id)
        .single();
      if (error || !chapter) return jsonError("NOT_FOUND", "Chapter not found", 404);
      sourceTitle = chapter.title;
      sourcePdfUrl = chapter.pdf_url || null;

      if (chapter.pdf_text && chapter.pdf_text.length > 50) {
        pdfText = chapter.pdf_text;
        console.log(`[generate-mind-map] Using pdf_text from module_chapters (${pdfText.length} chars)`);
      } else {
        // Fallback: find an admin_document linked to this chapter
        console.log("[generate-mind-map] No pdf_text in chapter, falling back to admin_documents...");
        const { data: adminDoc } = await serviceClient
          .from("admin_documents")
          .select("storage_path, file_name")
          .eq("chapter_id", chapter_id)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!adminDoc) {
          // Try module-level document
          const { data: moduleDoc } = await serviceClient
            .from("admin_documents")
            .select("storage_path, file_name")
            .eq("module_id", chapter.module_id || (await serviceClient.from("module_chapters").select("module_id").eq("id", chapter_id).single()).data?.module_id)
            .eq("is_deleted", false)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!moduleDoc) {
            return jsonError("NO_TEXT", "No PDF content found. Upload a Content PDF for this chapter first.", 400);
          }

          // Download and extract text from module-level doc
          const { data: signedData, error: signErr } = await serviceClient.storage
            .from("admin-pdfs")
            .createSignedUrl(moduleDoc.storage_path, 600);
          if (signErr || !signedData?.signedUrl) {
            return jsonError("STORAGE_ERROR", `Failed to get signed URL: ${signErr?.message || "unknown"}`, 500);
          }

          const pdfResponse = await fetch(signedData.signedUrl);
          if (!pdfResponse.ok) {
            return jsonError("DOWNLOAD_ERROR", `Failed to download PDF: ${pdfResponse.status}`, 500);
          }
          const pdfBuffer = await pdfResponse.arrayBuffer();
          pdfText = extractTextFromPdfBuffer(new Uint8Array(pdfBuffer));
          sourcePdfUrl = signedData.signedUrl;
          console.log(`[generate-mind-map] Extracted text from module doc "${moduleDoc.file_name}" (${pdfText.length} chars)`);
        } else {
          // Download and extract text from chapter-level doc
          const { data: signedData, error: signErr } = await serviceClient.storage
            .from("admin-pdfs")
            .createSignedUrl(adminDoc.storage_path, 600);
          if (signErr || !signedData?.signedUrl) {
            return jsonError("STORAGE_ERROR", `Failed to get signed URL: ${signErr?.message || "unknown"}`, 500);
          }

          const pdfResponse = await fetch(signedData.signedUrl);
          if (!pdfResponse.ok) {
            return jsonError("DOWNLOAD_ERROR", `Failed to download PDF: ${pdfResponse.status}`, 500);
          }
          const pdfBuffer = await pdfResponse.arrayBuffer();
          pdfText = extractTextFromPdfBuffer(new Uint8Array(pdfBuffer));
          sourcePdfUrl = signedData.signedUrl;
          console.log(`[generate-mind-map] Extracted text from admin doc "${adminDoc.file_name}" (${pdfText.length} chars)`);
        }

        if (!pdfText || pdfText.length < 50) {
          return jsonError("NO_TEXT", "PDF text extraction yielded insufficient content. The PDF may be image-based or empty.", 400);
        }
      }
    } else {
      const { data: topic, error } = await serviceClient
        .from("topics")
        .select("name")
        .eq("id", topic_id!)
        .single();
      if (error || !topic) return jsonError("NOT_FOUND", "Topic not found", 404);
      sourceTitle = topic.name;
      return jsonError("NOT_IMPLEMENTED", "Topic-based generation not yet supported (no pdf_text field on topics)", 400);
    }

    const textLengthOriginal = pdfText.length;

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
- No explanatory text before or after the markdown
- Do NOT wrap output in code blocks`;

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
- No explanatory text before or after the markdown
- Do NOT wrap output in code blocks`;

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
    const results: ResultItem[] = [];
    const FULL_TRUNCATE_LIMIT = 120000;
    const SECTION_TRUNCATE_LIMIT = 80000;
    const MIN_SECTION_LENGTH = 200;

    // Full map
    if (generation_mode === "full" || generation_mode === "both") {
      console.log("[generate-mind-map] Generating full chapter map...");
      const textSent = pdfText.slice(0, FULL_TRUNCATE_LIMIT);
      const userPrompt = `Chapter: "${sourceTitle}"\n\nFull PDF content:\n\n${textSent}`;
      const aiResult = await callAI(fullSystemPrompt, userPrompt, provider, keyResult.apiKey);

      if (!aiResult.success) {
        console.error("[generate-mind-map] Full map AI error:", aiResult.error);
        results.push({ type: "full", title: sourceTitle, success: false, status: "failed", errors: [aiResult.error || "AI call failed"] });
      } else {
        const markdown = aiResult.content!.trim();
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
                detection_method: detection.method,
                detection_confidence: detection.overallConfidence,
                sections_found: detection.sections.length,
                text_length_original: textLengthOriginal,
                text_length_sent_to_ai: textSent.length,
                was_truncated: textLengthOriginal > FULL_TRUNCATE_LIMIT,
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
    if ((generation_mode === "sections" || generation_mode === "both") && detection.sections.length >= 2) {
      console.log(`[generate-mind-map] Generating ${detection.sections.length} section maps...`);

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
        const sectionLabel = section.number ? `${section.number} ${section.title}` : section.title;

        // Skip short sections
        if (section.text.length < MIN_SECTION_LENGTH) {
          console.log(`[generate-mind-map] Skipping short section "${sectionLabel}" (${section.text.length} chars)`);
          results.push({
            type: "section",
            title: sectionLabel,
            success: false,
            status: "skipped",
            errors: [`Section too short (${section.text.length} chars, minimum ${MIN_SECTION_LENGTH})`],
          });
          continue;
        }

        console.log(`[generate-mind-map] Generating map for section: ${sectionLabel}`);

        const textSent = section.text.slice(0, SECTION_TRUNCATE_LIMIT);
        const userPrompt = `Section: "${sectionLabel}"\nFrom chapter: "${sourceTitle}"\n\nSection content:\n\n${textSent}`;
        const aiResult = await callAI(sectionSystemPrompt, userPrompt, provider, keyResult.apiKey);

        if (!aiResult.success) {
          console.error(`[generate-mind-map] Section "${sectionLabel}" AI error:`, aiResult.error);
          results.push({ type: "section", title: sectionLabel, success: false, status: "failed", errors: [aiResult.error || "AI call failed"] });
          continue;
        }

        const markdown = aiResult.content!.trim();
        const validation = validateMarkmapMarkdown(markdown);

        if (!validation.valid) {
          console.error(`[generate-mind-map] Section "${sectionLabel}" validation failed:`, validation.errors);
          results.push({ type: "section", title: sectionLabel, success: false, status: "failed", errors: validation.errors });
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
              text_length_original: section.text.length,
              text_length_sent_to_ai: textSent.length,
              was_truncated: section.text.length > SECTION_TRUNCATE_LIMIT,
              prompt_snapshot: sectionSystemPrompt,
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

        // Small delay between AI calls
        await new Promise((r) => setTimeout(r, 500));
      }
    } else if ((generation_mode === "sections" || generation_mode === "both") && detection.sections.length < 2) {
      console.warn("[generate-mind-map] Section detection found fewer than 2 sections, skipping section maps");
      results.push({
        type: "section",
        title: "Section detection",
        success: false,
        status: "failed",
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
      total_generated: results.filter((r) => r.status === "generated").length,
      total_failed: results.filter((r) => r.status === "failed").length,
      total_skipped: results.filter((r) => r.status === "skipped").length,
    });
  } catch (err) {
    console.error("[generate-mind-map] Unhandled error:", err);
    return jsonError("INTERNAL_ERROR", err instanceof Error ? err.message : "Unknown error", 500);
  }
});
