/**
 * Shared utilities for blueprint Excel import:
 * - Text normalization
 * - Column alias mapping
 * - Fuzzy / scored matching for chapters and sections
 * - Auto header-row detection
 */

// ─── Column aliases ────────────────────────────────────────────────
export const COLUMN_ALIASES: Record<string, string[]> = {
  mcq: ['mcq', 'mcqs', 'multiple choice'],
  recall: ['recall', 'recalls'],
  case: ['case', 'cases', 'short case', 'short cases'],
  osce: ['osce', 'osces', 'osce station', 'osce stations'],
  long_case: ['long case', 'long cases', 'long_case', 'long_cases'],
  paraclinical: [
    'paraclinical', 'paraclinicals', 'para-clinical', 'para clinical',
    'anatomy/pathology/xray', 'anatomy / pathology / xray',
    'anatomy/pathology/x-ray', 'anatomy', 'pathology', 'xray', 'x-ray',
    'paraclinical interpretation',
  ],
};

/**
 * Given a raw header string from the Excel sheet, return the matching
 * component key (e.g. 'mcq', 'paraclinical') or null.
 */
export function resolveColumnAlias(rawHeader: string): string | null {
  const h = rawHeader.trim().toLowerCase();
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(h)) return key;
  }
  return null;
}

// ─── Text normalization ────────────────────────────────────────────
const EMOJI_RE = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u2705\u274C\u26A0\uFE0F✅❌⚠️🔴🟢🟡✓✔☑️→→]/gu;
const PREFIX_RE = /^(ch\.?\s*\d+\s*[:\-–—]\s*)/i;
const NUMERIC_PREFIX_RE = /^\d+(\.\d+)*\.?\s*/;
const NOISE_RE = /[^a-z0-9\s]/g;

/**
 * Aggressively normalise text for comparison:
 * strips emoji, arrows, numeric prefixes, punctuation, lowercases, collapses whitespace.
 */
export function normalizeText(raw: string): string {
  return raw
    .replace(EMOJI_RE, '')
    .replace(PREFIX_RE, '')
    .replace(/^[→→•·\-–—]\s*/, '')
    .replace(NUMERIC_PREFIX_RE, '')
    .replace(NOISE_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Extract a leading section number like "2.1" from a label.
 * Returns null if no numeric prefix found.
 */
export function extractSectionNumber(raw: string): string | null {
  const cleaned = raw.replace(EMOJI_RE, '').replace(/^[→→•·\-–—]\s*/, '').trim();
  const m = cleaned.match(/^(\d+(?:\.\d+)+)\.?\s/);
  return m ? m[1] : null;
}

// ─── Simple similarity scoring ─────────────────────────────────────
/** Token-overlap Jaccard-like similarity 0..1 */
export function wordSimilarity(a: string, b: string): number {
  const ta = new Set(a.split(/\s+/).filter(Boolean));
  const tb = new Set(b.split(/\s+/).filter(Boolean));
  if (ta.size === 0 && tb.size === 0) return 1;
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersection = 0;
  for (const w of ta) if (tb.has(w)) intersection++;
  return intersection / Math.max(ta.size, tb.size);
}

/** Levenshtein-distance based similarity 0..1 */
export function editSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const la = a.length, lb = b.length;
  if (la === 0 || lb === 0) return 0;
  const maxLen = Math.max(la, lb);
  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  for (let i = 1; i <= la; i++) {
    const curr = [i];
    for (let j = 1; j <= lb; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    prev = curr;
  }
  return 1 - prev[lb] / maxLen;
}

// ─── Header row detection ──────────────────────────────────────────
const KNOWN_HEADERS = new Set([
  'chapter', 'section', 'topic',
  ...Object.values(COLUMN_ALIASES).flat(),
  'chapter_id', 'section_id',
]);

/** Returns true if this row looks like a real header row. */
export function isHeaderRow(cells: string[]): boolean {
  let matches = 0;
  for (const c of cells) {
    if (KNOWN_HEADERS.has(c.trim().toLowerCase())) matches++;
  }
  return matches >= 2;
}

/** Returns true if this row is a non-data filler (blank, repeated header, title). */
export function isSkippableRow(firstCell: string): boolean {
  const lc = firstCell.trim().toLowerCase();
  if (!lc) return true;
  if (lc === 'chapter' || lc === 'section' || lc === 'topic') return true;
  return false;
}

// ─── Chapter matching ──────────────────────────────────────────────
export interface ChapterCandidate {
  id: string;
  module_id: string;
  chapter_number: number;
  title: string;
}

export interface MatchResult<T> {
  match: T | null;
  score: number;
  ambiguous: boolean;
}

export function matchChapter(
  label: string,
  chapters: ChapterCandidate[],
  chapterIdHint?: string,
): MatchResult<ChapterCandidate> {
  if (chapterIdHint) {
    const byId = chapters.find(c => c.id === chapterIdHint);
    if (byId) return { match: byId, score: 1, ambiguous: false };
  }

  const norm = normalizeText(label);
  if (!norm) return { match: null, score: 0, ambiguous: false };

  type Scored = { ch: ChapterCandidate; score: number };
  const scored: Scored[] = chapters.map(ch => {
    const normTitle = normalizeText(ch.title);
    if (norm === normTitle) return { ch, score: 1 };
    if (norm.includes(normTitle) || normTitle.includes(norm)) return { ch, score: 0.85 };
    const ws = wordSimilarity(norm, normTitle);
    const es = editSimilarity(norm, normTitle);
    return { ch, score: Math.max(ws, es) };
  });

  scored.sort((a, b) => b.score - a.score);
  if (scored.length === 0 || scored[0].score < 0.4) {
    return { match: null, score: 0, ambiguous: false };
  }
  const best = scored[0];
  const ambiguous = scored.length > 1 && scored[1].score > 0.7 && (best.score - scored[1].score) < 0.1;
  return { match: best.ch, score: best.score, ambiguous };
}

// ─── Section matching ──────────────────────────────────────────────
export interface SectionCandidate {
  id: string;
  name: string;
  section_number: string | null;
  chapter_id: string;
}

export function matchSection(
  label: string,
  sections: SectionCandidate[],
  sectionIdHint?: string,
): MatchResult<SectionCandidate> {
  if (sectionIdHint) {
    const byId = sections.find(s => s.id === sectionIdHint);
    if (byId) return { match: byId, score: 1, ambiguous: false };
  }

  if (!label.trim() || sections.length === 0) return { match: null, score: 0, ambiguous: false };

  // Priority: try to match by visible section number first (e.g. "2.1")
  const labelSecNum = extractSectionNumber(label);
  if (labelSecNum) {
    const byNum = sections.filter(s => s.section_number === labelSecNum);
    if (byNum.length === 1) {
      return { match: byNum[0], score: 0.98, ambiguous: false };
    }
  }

  const norm = normalizeText(label);
  if (!norm) return { match: null, score: 0, ambiguous: false };

  type Scored = { sec: SectionCandidate; score: number };
  const scored: Scored[] = sections.map(sec => {
    const normName = normalizeText(sec.name);
    if (norm === normName) return { sec, score: 1 };
    if (sec.section_number && normalizeText(sec.section_number) === norm) return { sec, score: 0.95 };
    if (norm.includes(normName) || normName.includes(norm)) return { sec, score: 0.85 };
    const ws = wordSimilarity(norm, normName);
    const es = editSimilarity(norm, normName);
    return { sec, score: Math.max(ws, es) };
  });

  scored.sort((a, b) => b.score - a.score);
  if (scored.length === 0 || scored[0].score < 0.4) {
    return { match: null, score: 0, ambiguous: false };
  }
  const best = scored[0];
  const ambiguous = scored.length > 1 && scored[1].score > 0.7 && (best.score - scored[1].score) < 0.1;
  return { match: best.sec, score: best.score, ambiguous };
}
