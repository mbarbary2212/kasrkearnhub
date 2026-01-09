// Client-side profanity filter with medical context awareness
// This is a first-line defense; AI moderation handles nuanced cases

const BLOCKED_PATTERNS: RegExp[] = [
  // Common profanity (with l33tspeak variants)
  /\bf+[u\*@]+c+k+/gi,
  /\bs+h+[i1\*]+t+/gi,
  /\b(a|@)+ss+h+[o0]+l+e+/gi,
  /\bb+[i1]+t+c+h+/gi,
  /\bd+[i1]+c+k+(?!inson|ens)/gi, // Exclude names like Dickens
  /\bc+[u\*]+n+t+/gi,
  /\bp+[i1]+ss+/gi,
  /\bw+h+[o0]+r+e+/gi,
  /\bsl+[u\*]+t+/gi,
  /\bb+a+st+a+r+d+/gi,
  /\bd+a+m+n+/gi,
  /\bh+e+l+l+(?!\s*(cell|o|p))/gi, // Exclude "hello", "help", "cell"
  
  // Slurs and hate speech
  /\bn+[i1]+g+[g3]+[ae@]+/gi,
  /\bf+[a@]+g+[o0]+t+/gi,
  /\br+e+t+a+r+d+/gi,
  /\bsp+[i1]+c+/gi,
  /\bch+[i1]+n+k+/gi,
  /\bk+[i1]+k+e+/gi,
  /\btr+a+n+n+y+/gi,
  
  // Harassment patterns
  /\bk+[i1]+l+l+\s*(your)?s+e+l+f+/gi,
  /\bg+o+\s*d+[i1]+e+/gi,
  /\bi+['']?l+l+\s*k+[i1]+l+l+/gi,
  
  // Sexual content (non-medical)
  /\bp+[o0]+r+n+/gi,
  /\bx+x+x+/gi,
  /\bs+e+x+y+/gi,
  /\bh+[o0]+r+n+y+/gi,
  /\bb+[o0]+[o0]+b+s+/gi,
  /\bt+[i1]+t+s+/gi,
];

// Medical/educational terms that should NOT be blocked
const MEDICAL_WHITELIST: string[] = [
  'penis', 'vagina', 'breast', 'rectum', 'anus', 'testicle', 'scrotum',
  'uterus', 'ovary', 'cervix', 'prostate', 'ejaculation', 'erection',
  'orgasm', 'clitoris', 'labia', 'vulva', 'menstruation', 'puberty',
  'sexually transmitted', 'std', 'sti', 'hiv', 'aids', 'herpes',
  'intercourse', 'contraception', 'fertility', 'pregnancy', 'fetus',
  'embryo', 'sperm', 'ovum', 'hormone', 'estrogen', 'testosterone',
  'mastitis', 'erectile', 'dysfunction', 'libido', 'genitalia',
  'urethral', 'perineum', 'mammary', 'nipple', 'areola',
  'anal', 'rectal', 'colonoscopy', 'digital rectal exam',
  'breast exam', 'pelvic exam', 'pap smear', 'circumcision',
  'vasectomy', 'hysterectomy', 'mastectomy', 'orchidectomy',
];

export interface ProfanityCheckResult {
  blocked: boolean;
  matches: string[];
  sanitized: string;
}

export function checkMessage(text: string): ProfanityCheckResult {
  const matches: string[] = [];
  const lowerText = text.toLowerCase();
  
  // Check if text contains medical context
  const hasMedicalContext = MEDICAL_WHITELIST.some(term => 
    lowerText.includes(term.toLowerCase())
  );
  
  // If message has clear medical context, be more lenient
  if (hasMedicalContext) {
    // Only check for the most severe content
    const severePatterns = BLOCKED_PATTERNS.slice(0, 12); // Main profanity only
    for (const pattern of severePatterns) {
      const found = text.match(pattern);
      if (found) {
        // Double-check it's not in medical whitelist
        const isWhitelisted = MEDICAL_WHITELIST.some(term =>
          found.some(match => term.toLowerCase().includes(match.toLowerCase()))
        );
        if (!isWhitelisted) {
          matches.push(...found);
        }
      }
    }
  } else {
    // Full check for non-medical content
    for (const pattern of BLOCKED_PATTERNS) {
      const found = text.match(pattern);
      if (found) matches.push(...found);
    }
  }
  
  // Deduplicate matches
  const uniqueMatches = [...new Set(matches)];
  
  // Create sanitized version
  let sanitized = text;
  for (const match of uniqueMatches) {
    const replacement = match[0] + '*'.repeat(match.length - 2) + match[match.length - 1];
    sanitized = sanitized.replace(new RegExp(escapeRegex(match), 'gi'), replacement);
  }
  
  return {
    blocked: uniqueMatches.length > 0,
    matches: uniqueMatches,
    sanitized,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Quick check for real-time feedback (less intensive)
export function quickCheck(text: string): boolean {
  for (const pattern of BLOCKED_PATTERNS.slice(0, 15)) {
    if (pattern.test(text)) return true;
  }
  return false;
}
