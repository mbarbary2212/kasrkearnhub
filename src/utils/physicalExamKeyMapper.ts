import * as Sentry from '@sentry/react';

/**
 * The 8 fixed anatomical region keys used by the Physical Examination UI.
 * All case data (AI-generated, JSON-imported, or legacy) MUST use these keys.
 */
export const VALID_REGION_KEYS = [
  'general',
  'head_neck',
  'vital_signs',
  'chest',
  'upper_limbs',
  'abdomen',
  'lower_limbs',
  'extra',
] as const;

export type RegionKey = (typeof VALID_REGION_KEYS)[number];

/**
 * Map any legacy/descriptive key to one of the 8 fixed RegionKey values.
 * e.g. "wound_assessment" → "extra", "abdomen_palpation" → "abdomen"
 */
export function mapLegacyKey(key: string): RegionKey {
  const k = key.toLowerCase();

  // Exact matches first
  if (VALID_REGION_KEYS.includes(k as RegionKey)) return k as RegionKey;

  // Exact aliases
  if (k === 'general_appearance') return 'general';
  if (k === 'vitals') return 'vital_signs';

  // ── Extra-type matches FIRST (prevents substring collisions) ──
  if (k.includes('wound') || k.includes('skin') || k.includes('dre') || k.includes('rectal') || k.includes('fundoscop')) {
    return 'extra';
  }

  // ── Anatomical region fuzzy matches ──
  if (k.includes('abdomen') || k.includes('abdominal')) return 'abdomen';
  // ENT: exact match or specific compound keys only — NOT k.includes('ent') which collides with -ment, -ent suffixes
  if (k.includes('head') || k.includes('neck') || k.includes('cranial') || k.includes('thyroid') || k === 'ent' || k.includes('ear_nose') || k.includes('ent_exam')) return 'head_neck';
  if (k.includes('chest') || k.includes('cardio') || k.includes('respiratory') || k.includes('lung') || k.includes('heart') || k.includes('pulmonary')) return 'chest';
  if (k.includes('upper') || k.includes('arm') || k.includes('hand') || k.includes('shoulder')) return 'upper_limbs';
  if (k.includes('lower') || k.includes('leg') || k.includes('foot') || k.includes('feet') || k.includes('knee')) return 'lower_limbs';
  if (k.includes('vital') || k.includes('bp') || k.includes('pulse') || k.includes('temperature')) return 'vital_signs';
  if (k.includes('general') || k.includes('appearance') || k.includes('overall')) return 'general';

  // Sentry warning for unmapped keys falling to extra
  Sentry.captureMessage(`PE fuzzy mapper: unknown key "${key}" → extra`, 'warning');

  // Everything else → extra
  return 'extra';
}

/**
 * Normalize a raw physical examination findings object to use only the 8 valid RegionKeys.
 * Merges duplicate keys (e.g. abdomen_inspection + abdomen_palpation → abdomen).
 * Reads both `finding` and `text` fields.
 * 
 * @param source - Raw findings/regions object from DB
 * @param context - Optional context for Sentry breadcrumb (e.g. "JSON import", "AI generation", "UI render")
 * @returns Normalized findings with only valid RegionKeys
 */
export function normalizePhysicalExamFindings(
  source: Record<string, any>,
  context: string = 'unknown',
): { normalized: Record<string, any>; remappedKeys: Array<{ from: string; to: string }> } {
  const converted: Record<string, any> = {};
  const remappedKeys: Array<{ from: string; to: string }> = [];

  for (const [key, val] of Object.entries(source)) {
    if (!val || typeof val !== 'object') continue;

    const regionKey = mapLegacyKey(key);
    const text = val.finding || val.text || '';
    let label = val.label || key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

    // Track remappings
    if (key !== regionKey) {
      remappedKeys.push({ from: key, to: regionKey });
    }

    // Shorten verbose labels
    if (regionKey === 'extra') {
      if (label.toLowerCase().includes('wound')) label = 'Wound';
      if (label.length > 30) label = label.substring(0, 28) + '…';
    }

    if (converted[regionKey]) {
      // Merge into existing region
      const existing = converted[regionKey];
      existing.text = [existing.text, `**${label}:** ${text}`].filter(Boolean).join('\n\n');
      if (val.ref && !existing.ref) existing.ref = val.ref;
      // Merge image_urls
      if (val.image_urls?.length) {
        existing.image_urls = [...(existing.image_urls || []), ...val.image_urls];
      }
    } else {
      // If this key was remapped, prefix text with its label for clarity when merging later
      const prefixedText = (key !== regionKey && text) ? `**${label}:** ${text}` : text;
      converted[regionKey] = {
        text: prefixedText,
        ref: val.ref || null,
        ...(regionKey === 'extra' ? { label } : {}),
        ...(val.vitals ? { vitals: val.vitals } : {}),
        ...(val.image_urls ? { image_urls: val.image_urls } : {}),
      };
    }
  }

  // Log Sentry breadcrumb for traceability
  if (remappedKeys.length > 0) {
    Sentry.addBreadcrumb({
      category: 'physical_exam',
      message: `PE key normalization (${context}): ${remappedKeys.length} keys remapped`,
      level: 'info',
      data: {
        context,
        remappedKeys,
        sourceKeys: Object.keys(source),
        resultKeys: Object.keys(converted),
      },
    });
  }

  return { normalized: converted, remappedKeys };
}
