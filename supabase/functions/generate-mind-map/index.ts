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

// ─── PDF text extraction: Direct (binary) ────────────────────────────

function extractTextFromPdfBuffer(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes);
  const textChunks: string[] = [];

  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match: RegExpExecArray | null;
  while ((match = btEtRegex.exec(raw)) !== null) {
    const block = match[1];
    const tjMatches = block.match(/\(([^)]*)\)\s*Tj/g);
    if (tjMatches) {
      for (const tj of tjMatches) {
        const textMatch = tj.match(/\(([^)]*)\)/);
        if (textMatch) textChunks.push(textMatch[1]);
      }
    }
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

// ─── PDF text extraction: PDF.js ─────────────────────────────────────

async function extractTextWithPdfJs(pdfBytes: Uint8Array): Promise<string> {
  // Use pinned version of pdf.js from esm.sh (bundled for Deno)
  const pdfjsLib = await import("https://esm.sh/pdfjs-dist@4.0.379/build/pdf.mjs");

  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes, useSystemFonts: true });
  const pdfDoc = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    const pageLines: string[] = [];
    let lastY: number | null = null;

    for (const item of content.items) {
      if (!("str" in item)) continue;
      const textItem = item as { str: string; transform: number[] };
      const y = textItem.transform[5];
      // Detect line break by Y-position change
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        pageLines.push("\n");
      }
      pageLines.push(textItem.str);
      lastY = y;
    }
    pageTexts.push(pageLines.join(""));
  }

  return pageTexts.join("\n\n").trim();
}

// ─── Text quality scoring ────────────────────────────────────────────

interface QualityBreakdown {
  char_count: number;
  heading_score: number;
  corrupted_char_ratio: number;
  noise_score: number;
  section_numbering_score: number;
  avg_readable_line_length: number;
}

interface QualityResult {
  score: number;
  breakdown: QualityBreakdown;
}

function scoreTextQuality(text: string): QualityResult {
  if (!text || text.length === 0) {
    return { score: 0, breakdown: { char_count: 0, heading_score: 0, corrupted_char_ratio: 1, noise_score: 1, section_numbering_score: 0, avg_readable_line_length: 0 } };
  }

  const charCount = text.length;

  // 1. Heading detection (0-20 points)
  const headingPatterns = [
    /^\d{1,3}\.\d{1,3}\s+[A-Z]/gm,
    /^#{1,4}\s+/gm,
    /^Section\s+\d/gim,
    /^[A-Z][A-Z\s]{4,60}$/gm,
    /^(?:I{1,3}|IV|V(?:I{0,3})|IX|X)\.\s+/gm,
  ];
  let headingMatches = 0;
  for (const p of headingPatterns) {
    p.lastIndex = 0;
    const m = text.match(p);
    if (m) headingMatches += m.length;
  }
  const headingScore = Math.min(headingMatches / 5, 1); // normalize: 5+ headings = perfect
  const headingPoints = headingScore * 20;

  // 2. Corrupted character ratio (0-25 points, inverted — fewer corrupted = higher score)
  // Count replacement chars, control chars (except \n\r\t), and sequences of non-ASCII gibberish
  const corruptedChars = (text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFD\uFEFF]/g) || []).length;
  // Also count high ratio of non-printable sequences
  const weirdSequences = (text.match(/[^\x20-\x7E\n\r\t\u00A0-\u024F\u0600-\u06FF]{3,}/g) || []).length;
  const corruptedRatio = (corruptedChars + weirdSequences * 10) / charCount;
  const corruptedPoints = Math.max(0, (1 - corruptedRatio * 50)) * 25;

  // 3. Noise detection — repeated header/footer lines (0-15 points)
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const lineCounts = new Map<string, number>();
  for (const line of lines) {
    if (line.length < 5 || line.length > 120) continue;
    const key = line.toLowerCase();
    lineCounts.set(key, (lineCounts.get(key) || 0) + 1);
  }
  const noiseLines = Array.from(lineCounts.values()).filter(c => c >= 4).reduce((s, c) => s + c, 0);
  const noiseRatio = lines.length > 0 ? noiseLines / lines.length : 0;
  const noiseScore = noiseRatio;
  const noisePoints = Math.max(0, (1 - noiseRatio * 5)) * 15;

  // 4. Section numbering preservation (0-15 points)
  const numberedSections = (text.match(/^\d{1,3}\.\d{1,3}/gm) || []).length;
  const sectionScore = Math.min(numberedSections / 3, 1);
  const sectionPoints = sectionScore * 15;

  // 5. Average readable line length (0-15 points) — ideal 40-120 chars
  const nonEmptyLines = lines.filter(l => l.length > 3);
  const avgLineLen = nonEmptyLines.length > 0
    ? nonEmptyLines.reduce((s, l) => s + l.length, 0) / nonEmptyLines.length
    : 0;
  let lineLenPoints = 0;
  if (avgLineLen >= 40 && avgLineLen <= 120) lineLenPoints = 15;
  else if (avgLineLen >= 20 && avgLineLen <= 200) lineLenPoints = 10;
  else if (avgLineLen > 5) lineLenPoints = 5;

  // 6. Character count bonus (0-10 points) — more text generally better
  let charPoints = 0;
  if (charCount > 10000) charPoints = 10;
  else if (charCount > 5000) charPoints = 8;
  else if (charCount > 1000) charPoints = 5;
  else if (charCount > 200) charPoints = 2;

  const totalScore = Math.round(headingPoints + corruptedPoints + noisePoints + sectionPoints + lineLenPoints + charPoints);

  return {
    score: Math.min(100, Math.max(0, totalScore)),
    breakdown: {
      char_count: charCount,
      heading_score: Math.round(headingScore * 100) / 100,
      corrupted_char_ratio: Math.round(corruptedRatio * 10000) / 10000,
      noise_score: Math.round(noiseScore * 10000) / 10000,
      section_numbering_score: Math.round(sectionScore * 100) / 100,
      avg_readable_line_length: Math.round(avgLineLen),
    },
  };
}

// ─── Tiered extraction orchestrator ──────────────────────────────────

type ExtractionMethod = "auto" | "direct" | "pdfjs" | "chapter_text";

interface ExtractionScoreEntry {
  score: number;
  breakdown: QualityBreakdown;
  time_ms: number;
}

interface TieredExtractionResult {
  text: string;
  extraction_method_used: ExtractionMethod;
  source_method: "chapter_pdf_text" | "selected_document" | "auto_detected_document";
  selection_reason: string;
  scores: {
    direct?: ExtractionScoreEntry;
    pdfjs?: ExtractionScoreEntry;
    chapter_text?: ExtractionScoreEntry;
  };
  fallback_triggered: boolean;
  heading_count: number;
  selected_text_preview: string;
}

async function runTieredExtraction(
  pdfBytes: Uint8Array | null,
  chapterPdfText: string | null,
  requestedMethod: ExtractionMethod,
  sourceMethod: "chapter_pdf_text" | "selected_document" | "auto_detected_document",
): Promise<TieredExtractionResult> {
  const scores: TieredExtractionResult["scores"] = {};
  let bestText = "";
  let bestScore = -1;
  let bestMethod: ExtractionMethod = "direct";
  let selectionReason = "";
  let fallbackTriggered = false;

  // --- Score chapter.pdf_text if available ---
  if (chapterPdfText && chapterPdfText.length > 50) {
    const t0 = performance.now();
    const q = scoreTextQuality(chapterPdfText);
    scores.chapter_text = { score: q.score, breakdown: q.breakdown, time_ms: Math.round(performance.now() - t0) };
    console.log(`[tiered-extraction] chapter_text: score=${q.score}, chars=${chapterPdfText.length}`);

    if (requestedMethod === "chapter_text") {
      return buildResult(chapterPdfText, "chapter_text", sourceMethod, `Forced by manual override: chapter_text`, scores, false);
    }

    if (q.score > bestScore) {
      bestText = chapterPdfText;
      bestScore = q.score;
      bestMethod = "chapter_text";
    }
  }

  // --- If forced method, run only that ---
  if (requestedMethod === "direct" && pdfBytes) {
    const t0 = performance.now();
    const directText = extractTextFromPdfBuffer(pdfBytes);
    const q = scoreTextQuality(directText);
    scores.direct = { score: q.score, breakdown: q.breakdown, time_ms: Math.round(performance.now() - t0) };
    return buildResult(directText, "direct", sourceMethod, `Forced by manual override: direct`, scores, false);
  }
  if (requestedMethod === "pdfjs" && pdfBytes) {
    const t0 = performance.now();
    const pdjsText = await extractTextWithPdfJs(pdfBytes);
    const q = scoreTextQuality(pdjsText);
    scores.pdfjs = { score: q.score, breakdown: q.breakdown, time_ms: Math.round(performance.now() - t0) };
    return buildResult(pdjsText, "pdfjs", sourceMethod, `Forced by manual override: pdfjs`, scores, false);
  }

  // --- Auto mode: tiered pipeline ---
  if (pdfBytes) {
    // Step 1: Direct extraction
    const t0 = performance.now();
    const directText = extractTextFromPdfBuffer(pdfBytes);
    const directQ = scoreTextQuality(directText);
    scores.direct = { score: directQ.score, breakdown: directQ.breakdown, time_ms: Math.round(performance.now() - t0) };
    console.log(`[tiered-extraction] direct: score=${directQ.score}, chars=${directText.length}`);

    if (directQ.score > bestScore) {
      bestText = directText;
      bestScore = directQ.score;
      bestMethod = "direct";
    }

    // Step 2: Decide whether to run PDF.js
    // >=85: accept direct, skip PDF.js
    // 60-84: run PDF.js too, compare
    // <60: definitely run PDF.js
    const shouldRunPdfJs = directQ.score < 85;

    if (shouldRunPdfJs) {
      fallbackTriggered = directQ.score < 60;
      console.log(`[tiered-extraction] Direct score ${directQ.score} < 85, running PDF.js extraction...`);
      try {
        const t1 = performance.now();
        const pdjsText = await extractTextWithPdfJs(pdfBytes);
        const pdjsQ = scoreTextQuality(pdjsText);
        scores.pdfjs = { score: pdjsQ.score, breakdown: pdjsQ.breakdown, time_ms: Math.round(performance.now() - t1) };
        console.log(`[tiered-extraction] pdfjs: score=${pdjsQ.score}, chars=${pdjsText.length}`);

        if (pdjsQ.score > bestScore) {
          bestText = pdjsText;
          bestScore = pdjsQ.score;
          bestMethod = "pdfjs";
        }
      } catch (err) {
        console.error("[tiered-extraction] PDF.js extraction failed:", err);
        scores.pdfjs = { score: 0, breakdown: { char_count: 0, heading_score: 0, corrupted_char_ratio: 1, noise_score: 1, section_numbering_score: 0, avg_readable_line_length: 0 }, time_ms: 0 };
      }
    } else {
      console.log(`[tiered-extraction] Direct score ${directQ.score} >= 85, skipping PDF.js`);
    }
  }

  // Build selection reason
  const scoreEntries = Object.entries(scores) as [string, ExtractionScoreEntry][];
  if (scoreEntries.length === 1) {
    selectionReason = `Only one method available (${bestMethod}), score: ${bestScore}`;
  } else {
    const ranked = scoreEntries.sort((a, b) => b[1].score - a[1].score);
    const winner = ranked[0];
    const runnerUp = ranked[1];
    if (winner[0] === bestMethod) {
      selectionReason = `${bestMethod} scored highest (${winner[1].score}) vs ${runnerUp[0]} (${runnerUp[1].score})`;
    } else {
      selectionReason = `Selected ${bestMethod} with score ${bestScore}`;
    }
    if (fallbackTriggered) {
      selectionReason += " — PDF.js fallback was triggered due to low direct extraction score (<60)";
    }
  }

  return buildResult(bestText, bestMethod, sourceMethod, selectionReason, scores, fallbackTriggered);
}

function buildResult(
  text: string,
  method: ExtractionMethod,
  sourceMethod: "chapter_pdf_text" | "selected_document" | "auto_detected_document",
  reason: string,
  scores: TieredExtractionResult["scores"],
  fallback: boolean,
): TieredExtractionResult {
  const headingCount = (text.match(/^\d{1,3}\.\d{1,3}\s+[A-Z]/gm) || []).length
    + (text.match(/^#{1,4}\s+/gm) || []).length
    + (text.match(/^[A-Z][A-Z\s]{4,60}$/gm) || []).length;

  return {
    text,
    extraction_method_used: method,
    source_method: sourceMethod,
    selection_reason: reason,
    scores,
    fallback_triggered: fallback,
    heading_count: headingCount,
    selected_text_preview: text.slice(0, 500),
  };
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
    const { chapter_id, topic_id, generation_mode, document_id, extraction_method: reqExtractionMethod } = body as {
      chapter_id?: string;
      topic_id?: string;
      generation_mode: "full" | "sections" | "both";
      document_id?: string;
      extraction_method?: ExtractionMethod;
    };

    const extractionMethod: ExtractionMethod = reqExtractionMethod || "auto";

    if (!chapter_id && !topic_id) return jsonError("BAD_REQUEST", "chapter_id or topic_id required");
    if (!generation_mode) return jsonError("BAD_REQUEST", "generation_mode required (full|sections|both)");

    // ── Fetch PDF text ────────────────────────────────────────────
    let pdfText = "";
    let sourceTitle = "";
    let sourcePdfUrl: string | null = null;
    let sourceDocumentName: string | null = null;
    let sourceDocumentId: string | null = null;
    let sourceMethod: "chapter_pdf_text" | "selected_document" | "auto_detected_document" = "chapter_pdf_text";
    let chapterPdfTextLength: number | null = null;
    let chapterPdfTextRaw: string | null = null;
    let pdfBytes: Uint8Array | null = null;
    let extractionResult: TieredExtractionResult | null = null;

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
        .select("title, pdf_text, pdf_url, module_id")
        .eq("id", chapter_id)
        .single();
      if (error || !chapter) return jsonError("NOT_FOUND", "Chapter not found", 404);
      sourceTitle = chapter.title;
      sourcePdfUrl = chapter.pdf_url || null;

      // Record chapter.pdf_text
      if (chapter.pdf_text && chapter.pdf_text.length > 0) {
        chapterPdfTextLength = chapter.pdf_text.length;
        chapterPdfTextRaw = chapter.pdf_text;
      }

      // If admin explicitly chose a document, download it
      if (document_id) {
        sourceMethod = "selected_document";
        console.log(`[generate-mind-map] Admin selected document_id: ${document_id}`);
        const { data: chosenDoc, error: docErr } = await serviceClient
          .from("admin_documents")
          .select("id, title, storage_path, file_name")
          .eq("id", document_id)
          .eq("is_deleted", false)
          .single();

        if (docErr || !chosenDoc) {
          return jsonError("NOT_FOUND", "Selected document not found or deleted.", 404);
        }

        try {
          const dlResult = await downloadAdminDocPdf(chosenDoc);
          pdfBytes = dlResult.bytes;
          sourcePdfUrl = dlResult.signedUrl;
          sourceDocumentName = dlResult.docTitle;
          sourceDocumentId = chosenDoc.id;
          console.log(`[generate-mind-map] Downloaded selected document "${dlResult.docTitle}" (${pdfBytes.length} bytes)`);
        } catch (e) {
          return jsonError("DOWNLOAD_ERROR", e instanceof Error ? e.message : "PDF download failed", 500);
        }

        // Run tiered extraction
        extractionResult = await runTieredExtraction(
          pdfBytes,
          extractionMethod === "chapter_text" ? chapterPdfTextRaw : chapterPdfTextRaw,
          extractionMethod,
          sourceMethod,
        );
        pdfText = extractionResult.text;

        if (!pdfText || pdfText.length < 50) {
          return jsonError("NO_TEXT", `PDF text extraction from "${chosenDoc.title}" yielded insufficient content (${pdfText.length} chars). The built-in text extractor may have failed on compressed or encoded PDF streams. Try a different PDF or pre-extract the text.`, 400);
        }
      } else if (extractionMethod === "chapter_text" && chapterPdfTextRaw && chapterPdfTextRaw.length > 50) {
        // Forced chapter_text
        sourceMethod = "chapter_pdf_text";
        extractionResult = await runTieredExtraction(null, chapterPdfTextRaw, "chapter_text", sourceMethod);
        pdfText = extractionResult.text;
        sourceDocumentName = "Chapter extracted text (module_chapters.pdf_text)";
        console.log(`[generate-mind-map] Forced chapter_text: ${pdfText.length} chars`);
      } else if (extractionMethod !== "chapter_text" && chapterPdfTextRaw && chapterPdfTextRaw.length > 50 && !document_id) {
        // Auto mode: chapter has pdf_text — still try to find a document for comparison
        sourceMethod = "chapter_pdf_text";

        // Try to find an admin doc to potentially compare
        const { data: adminDoc } = await serviceClient
          .from("admin_documents")
          .select("id, title, storage_path, file_name")
          .eq("chapter_id", chapter_id)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (adminDoc && extractionMethod === "auto") {
          // Download the PDF and run tiered extraction with both sources
          try {
            const dlResult = await downloadAdminDocPdf(adminDoc);
            pdfBytes = dlResult.bytes;
            sourceDocumentName = dlResult.docTitle;
            sourceDocumentId = adminDoc.id;
            extractionResult = await runTieredExtraction(pdfBytes, chapterPdfTextRaw, "auto", sourceMethod);
            pdfText = extractionResult.text;
            // Update source method based on what was actually chosen
            if (extractionResult.extraction_method_used !== "chapter_text") {
              sourceMethod = "auto_detected_document";
              sourceDocumentName = dlResult.docTitle;
            } else {
              sourceDocumentName = "Chapter extracted text (module_chapters.pdf_text)";
            }
          } catch (e) {
            console.warn("[generate-mind-map] Could not download admin doc for comparison, using chapter.pdf_text:", e);
            extractionResult = await runTieredExtraction(null, chapterPdfTextRaw, "chapter_text", sourceMethod);
            pdfText = extractionResult.text;
            sourceDocumentName = "Chapter extracted text (module_chapters.pdf_text)";
          }
        } else {
          // No admin doc available, just use chapter text
          extractionResult = await runTieredExtraction(null, chapterPdfTextRaw, extractionMethod === "auto" ? "chapter_text" : extractionMethod, sourceMethod);
          pdfText = extractionResult.text;
          sourceDocumentName = "Chapter extracted text (module_chapters.pdf_text)";
        }
        console.log(`[generate-mind-map] Source: ${extractionResult.extraction_method_used} | ${pdfText.length} chars`);
      } else {
        // No chapter.pdf_text — fallback to admin_documents
        sourceMethod = "auto_detected_document";
        console.log("[generate-mind-map] No pdf_text in chapter, falling back to admin_documents...");
        const { data: adminDoc } = await serviceClient
          .from("admin_documents")
          .select("id, title, storage_path, file_name")
          .eq("chapter_id", chapter_id)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const docToUse = adminDoc || await (async () => {
          const { data: moduleDoc } = await serviceClient
            .from("admin_documents")
            .select("id, title, storage_path, file_name")
            .eq("module_id", chapter.module_id)
            .eq("is_deleted", false)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          return moduleDoc;
        })();

        if (!docToUse) {
          return jsonError("NO_TEXT", "No PDF content found. Upload a Content PDF for this chapter, or select a document manually.", 400);
        }

        try {
          const dlResult = await downloadAdminDocPdf(docToUse);
          pdfBytes = dlResult.bytes;
          sourcePdfUrl = dlResult.signedUrl;
          sourceDocumentName = dlResult.docTitle;
          sourceDocumentId = docToUse.id;
          console.log(`[generate-mind-map] Downloaded auto-detected document "${dlResult.docTitle}" (${pdfBytes.length} bytes)`);
        } catch (e) {
          return jsonError("DOWNLOAD_ERROR", e instanceof Error ? e.message : "PDF download failed", 500);
        }

        extractionResult = await runTieredExtraction(pdfBytes, chapterPdfTextRaw, extractionMethod, sourceMethod);
        pdfText = extractionResult.text;

        if (!pdfText || pdfText.length < 50) {
          return jsonError("NO_TEXT", `PDF text extraction from "${docToUse.title}" yielded insufficient content (${pdfText.length} chars). The built-in text extractor may have failed on compressed or encoded PDF streams. Try selecting a different document or pre-extracting the text.`, 400);
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
                extraction: extractionResult ? {
                  method_used: extractionResult.extraction_method_used,
                  selection_reason: extractionResult.selection_reason,
                  scores: extractionResult.scores,
                  fallback_triggered: extractionResult.fallback_triggered,
                  heading_count: extractionResult.heading_count,
                } : null,
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
              extraction: extractionResult ? {
                method_used: extractionResult.extraction_method_used,
                selection_reason: extractionResult.selection_reason,
                fallback_triggered: extractionResult.fallback_triggered,
              } : null,
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
      source_document: {
        name: sourceDocumentName,
        id: sourceDocumentId,
        text_length: pdfText.length,
        source_method: extractionResult?.source_method || sourceMethod,
        extraction_method_used: extractionResult?.extraction_method_used || "direct",
        chapter_pdf_text_length: chapterPdfTextLength,
        selection_reason: extractionResult?.selection_reason || "No tiered extraction performed",
        selected_text_preview: extractionResult?.selected_text_preview || pdfText.slice(0, 500),
        extraction_scores: extractionResult?.scores || {},
        fallback_triggered: extractionResult?.fallback_triggered || false,
        heading_count: extractionResult?.heading_count || 0,
      },
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
