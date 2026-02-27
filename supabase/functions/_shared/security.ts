// ============================================
// Security Utilities for AI Content Factory
// - Prompt injection detection
// - Input validation
// - Strict schema validation
// ============================================

// ============================================
// PROMPT INJECTION DETECTION
// ============================================

const INJECTION_PATTERNS: RegExp[] = [
  // Instruction override attempts
  /ignore\s*(all\s*)?(previous|prior|above)\s*(instructions|prompts|rules)/i,
  /forget\s*(your|all|the)?\s*(instructions|prompts|rules|system)/i,
  /disregard\s*(all|your|the|previous)/i,
  /override\s*(your|the|all)\s*(instructions|rules|prompts)/i,
  /new\s+instructions?:/i,
  
  // Role/persona manipulation
  /you\s+are\s+now\s+(a|an|the)/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /act\s+as\s+if\s+you\s+have\s+no\s+guidelines/i,
  
  // System prompt extraction
  /reveal\s+(your|the)\s*(system|original)\s*prompt/i,
  /what\s+(is|are)\s+your\s*(instructions|rules|system\s*prompt)/i,
  /show\s+me\s+(your|the)\s*prompt/i,
  
  // Markup injection
  /system\s*prompt\s*:/i,
  /\[system\]/i,
  /\[admin\]/i,
  /\[developer\]/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /<\|im_start\|>/i,
  /<\|endoftext\|>/i,
  
  // Jailbreak attempts
  /bypass\s+(the\s+)?(filter|moderation|safety)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /do\s+anything\s+now/i,
  /no\s+restrictions/i,
  /unlimited\s+mode/i,
  /developer\s+mode/i,
  
  // Output manipulation
  /output\s+the\s+following\s+exactly/i,
  /respond\s+with\s+only/i,
  /your\s+response\s+must\s+start\s+with/i,
];

/**
 * Detect potential prompt injection in text
 */
export function detectPromptInjection(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  
  // Normalize text for pattern matching
  const normalizedText = text.toLowerCase().replace(/\s+/g, ' ');
  
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text) || pattern.test(normalizedText)) {
      console.warn(`Prompt injection detected: ${pattern}`);
      return true;
    }
  }
  
  // Check for base64-encoded injection attempts
  const base64Pattern = /^[A-Za-z0-9+/]{50,}={0,2}$/;
  for (const word of text.split(/\s+/)) {
    if (base64Pattern.test(word)) {
      try {
        const decoded = atob(word);
        for (const pattern of INJECTION_PATTERNS) {
          if (pattern.test(decoded)) {
            console.warn('Base64-encoded prompt injection detected');
            return true;
          }
        }
      } catch {
        // Not valid base64, ignore
      }
    }
  }
  
  return false;
}

// ============================================
// INPUT VALIDATION
// ============================================

export interface InputLimits {
  maxAdditionalInstructionsLength: number;
  maxQuantity: number;
  maxContentTypesPerBatch: number;
}

export const DEFAULT_LIMITS: InputLimits = {
  maxAdditionalInstructionsLength: 2000,
  maxQuantity: 50,
  maxContentTypesPerBatch: 6,
};

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate input limits for generation requests
 */
export function validateInputLimits(
  additionalInstructions: string | null | undefined,
  quantity: number,
  limits: InputLimits = DEFAULT_LIMITS
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (additionalInstructions && additionalInstructions.length > limits.maxAdditionalInstructionsLength) {
    errors.push({
      field: 'additional_instructions',
      message: `Additional instructions too long (max ${limits.maxAdditionalInstructionsLength} chars)`,
    });
  }
  
  if (additionalInstructions && detectPromptInjection(additionalInstructions)) {
    errors.push({
      field: 'additional_instructions',
      message: 'Suspicious content detected in additional instructions',
    });
  }
  
  if (quantity > limits.maxQuantity) {
    errors.push({
      field: 'quantity',
      message: `Quantity too high (max ${limits.maxQuantity})`,
    });
  }
  
  if (quantity < 1) {
    errors.push({
      field: 'quantity',
      message: 'Quantity must be at least 1',
    });
  }
  
  return errors;
}

// ============================================
// STRICT SCHEMA VALIDATION
// ============================================

type ContentType = 
  | 'mcq' 
  | 'flashcard' 
  | 'essay' 
  | 'osce' 
  | 'matching' 
  | 'case_scenario'
  | 'virtual_patient' 
  | 'clinical_case'
  | 'mind_map'
  | 'worked_case'
  | 'guided_explanation';

// Allowed keys per content type (plus section_number for all)
const ALLOWED_KEYS: Record<ContentType, string[]> = {
  mcq: ['stem', 'choices', 'correct_key', 'explanation', 'difficulty', 'section_number'],
  flashcard: ['front', 'back', 'section_number'],
  essay: ['title', 'question', 'model_answer', 'keywords', 'section_number'],
  osce: [
    'history_text', 
    'statement_1', 'answer_1', 'explanation_1',
    'statement_2', 'answer_2', 'explanation_2',
    'statement_3', 'answer_3', 'explanation_3',
    'statement_4', 'answer_4', 'explanation_4',
    'statement_5', 'answer_5', 'explanation_5',
    'section_number'
  ],
  matching: ['instruction', 'column_a_items', 'column_b_items', 'correct_matches', 'explanation', 'difficulty', 'section_number'],
  case_scenario: ['title', 'case_history', 'case_questions', 'model_answer', 'section_number'],
  virtual_patient: ['title', 'intro_text', 'level', 'estimated_minutes', 'tags', 'stages', 'section_number'],
  clinical_case: ['title', 'intro_text', 'level', 'case_mode', 'estimated_minutes', 'tags', 'stages', 'section_number'],
  mind_map: ['title', 'central_concept', 'nodes', 'section_number'],
  worked_case: ['title', 'case_summary', 'steps', 'learning_objectives', 'section_number'],
  guided_explanation: ['topic', 'introduction', 'guided_questions', 'summary', 'key_takeaways', 'section_number'],
};

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate AI output against strict schema
 * - Rejects extra keys (possible injection)
 * - Scans string values for injection attempts
 */
export function validateStrictSchema(
  items: any[],
  contentType: ContentType
): SchemaValidationResult {
  const allowedKeys = new Set(ALLOWED_KEYS[contentType] || []);
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!allowedKeys.size) {
    warnings.push(`No schema defined for content type: ${contentType}`);
    return { valid: true, errors, warnings };
  }
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    if (!item || typeof item !== 'object') {
      errors.push(`Item #${i + 1}: Invalid item structure`);
      continue;
    }
    
    // Check for extra keys (potential injection)
    for (const key of Object.keys(item)) {
      if (!allowedKeys.has(key)) {
        errors.push(`Item #${i + 1}: Unexpected key "${key}" (not in schema)`);
      }
    }
    
    // Scan string values for injection attempts
    for (const [key, value] of Object.entries(item)) {
      if (typeof value === 'string' && detectPromptInjection(value)) {
        errors.push(`Item #${i + 1}: Field "${key}" contains suspicious content`);
      }
      
      // Recursively check arrays of strings
      if (Array.isArray(value)) {
        for (const element of value) {
          if (typeof element === 'string' && detectPromptInjection(element)) {
            errors.push(`Item #${i + 1}: Array field "${key}" contains suspicious content`);
            break;
          }
          // Check nested objects (e.g., choices, stages)
          if (element && typeof element === 'object') {
            for (const [nestedKey, nestedValue] of Object.entries(element)) {
              if (typeof nestedValue === 'string' && detectPromptInjection(nestedValue)) {
                errors.push(`Item #${i + 1}: Nested field "${key}.${nestedKey}" contains suspicious content`);
              }
            }
          }
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// PROFANITY / ABUSE DETECTION
// ============================================

const PROFANITY_PATTERNS: RegExp[] = [
  // English profanity (common slurs and vulgar terms)
  /\b(f+u+c+k+|f+[*@#]+k+|sh[i1!]+t|b[i1!]+tch|a+ss+h+o+le|d[i1!]+ck|c+u+n+t|wh+o+re|slut|bastard|damn+it)\b/i,
  /\b(stfu|gtfo|lmfao|wtf|omfg)\b/i,
  /\b(retard|retarded|spastic|mongol)\b/i,
  /\b(n[i1!]+gg+[ae]r?|f+[a@]+gg*[o0]t)\b/i,

  // Arabic transliterated profanity
  /\b(kos\s*om+|ya?\s*ibn\s*(el|al)?\s*shar?mouta|shar?mouta|ya?\s*kal[bp]|ya?\s*7mar|ya?\s*7ayawan|ya?\s*khara)\b/i,
  /\b(3ars|m[ou]t[ae]?nakk?|zani|ya\s*wis[kh])\b/i,

  // Threats / violence
  /\b(kill\s+(your|my|the|you)|i('ll|'m\s+going\s+to)\s+(hurt|murder|stab|shoot))\b/i,
  /\b(bomb\s+threat|terroris[mt])\b/i,

  // Sexual harassment
  /\b(send\s+nudes|sex\s+with\s+(you|me)|suck\s+my)\b/i,
];

/**
 * Detect profanity or abusive language in text
 */
export function detectProfanity(text: string): boolean {
  if (!text || typeof text !== 'string') return false;

  const normalizedText = text.toLowerCase().replace(/\s+/g, ' ');

  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(text) || pattern.test(normalizedText)) {
      console.warn(`Profanity detected: ${pattern}`);
      return true;
    }
  }

  return false;
}

/**
 * Sanitize section numbers from AI output
 * - Ensures they match expected format (e.g., "3.1", "3.10")
 * - Rejects invalid formats
 */
export function sanitizeSectionNumber(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  
  // Convert to string
  const str = String(value).trim();
  
  // Empty string
  if (!str) {
    return null;
  }
  
  // Valid patterns: "1", "3.1", "3.10", "10.1.2"
  // Allow digits separated by dots
  const validPattern = /^\d+(\.\d+)*$/;
  
  if (!validPattern.test(str)) {
    console.warn(`Invalid section_number format: "${str}"`);
    return null;
  }
  
  return str;
}
