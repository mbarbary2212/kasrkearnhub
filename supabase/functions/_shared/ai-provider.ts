// ============================================
// AI Provider Abstraction
// Supports: Lovable AI Gateway & Direct Google Gemini
// ============================================

export type AIProviderName = 'lovable' | 'gemini' | 'anthropic' | 'groq';

export interface AIProvider {
  name: AIProviderName;
  model: string;
}

export interface AICallResult {
  success: boolean;
  content?: string;
  error?: string;
  status?: number;
}

export interface AISettings {
  ai_provider: AIProviderName;
  gemini_model: string;
  lovable_model: string;
  anthropic_model: string;
  groq_model: string;
  ai_content_factory_enabled: boolean;
  ai_content_factory_disabled_message: string;
}

const DEFAULT_SETTINGS: AISettings = {
  ai_provider: 'gemini',
  gemini_model: 'gemini-3.1-pro-preview',
  lovable_model: 'google/gemini-3-flash-preview',
  anthropic_model: 'claude-sonnet-4-20250514',
  groq_model: 'llama-3.3-70b-versatile',
  ai_content_factory_enabled: true,
  ai_content_factory_disabled_message: 'AI content generation is currently disabled by the administrator.',
};

interface AISettingRow {
  key: string;
  value: any;
}

/**
 * Fetch AI settings from database
 * @param serviceClient - Any Supabase client with service role access
 */
export async function getAISettings(serviceClient: any): Promise<AISettings> {
  const { data, error } = await serviceClient
    .from('ai_settings')
    .select('key, value');

  if (error) {
    console.error('Failed to fetch AI settings:', error.message);
    return DEFAULT_SETTINGS;
  }

  const settings = { ...DEFAULT_SETTINGS };
  
  for (const row of (data || []) as AISettingRow[]) {
    // Safely parse the value - it might be a raw string or a JSON-encoded string
    let value = row.value;
    if (typeof value === 'string') {
      // Only try to parse if it looks like JSON (starts with { or [ or ")
      if (value.startsWith('{') || value.startsWith('[') || value.startsWith('"')) {
        try {
          value = JSON.parse(value);
        } catch {
          // If parsing fails, use the raw string value
        }
      }
    }
    
    switch (row.key) {
      case 'ai_provider':
        settings.ai_provider = (['gemini', 'anthropic', 'lovable'].includes(value) ? value : 'gemini') as AIProviderName;
        break;
      case 'gemini_model':
        settings.gemini_model = (value as string) || DEFAULT_SETTINGS.gemini_model;
        break;
      case 'lovable_model':
        settings.lovable_model = (value as string) || DEFAULT_SETTINGS.lovable_model;
        break;
      case 'anthropic_model':
        settings.anthropic_model = (value as string) || DEFAULT_SETTINGS.anthropic_model;
        break;
      case 'groq_model':
        settings.groq_model = (value as string) || DEFAULT_SETTINGS.groq_model;
        break;
      case 'ai_content_factory_enabled':
        settings.ai_content_factory_enabled = value === true || value === 'true';
        break;
      case 'ai_content_factory_disabled_message':
        settings.ai_content_factory_disabled_message = (value as string) || DEFAULT_SETTINGS.ai_content_factory_disabled_message;
        break;
    }
  }

  return settings;
}

/**
 * Get the current AI provider configuration
 */
export function getAIProvider(settings: AISettings): AIProvider {
  const modelMap: Record<AIProviderName, string> = {
    gemini: settings.gemini_model,
    lovable: settings.lovable_model,
    anthropic: settings.anthropic_model,
    groq: settings.groq_model,
  };
  return {
    name: settings.ai_provider,
    model: modelMap[settings.ai_provider] || settings.gemini_model,
  };
}

/**
 * Global lab units instruction appended to all AI system prompts.
 * Ensures all AI-generated content uses Conventional (US) units.
 */
const LAB_UNITS_RULE = `

LABORATORY VALUES — MANDATORY UNIT SYSTEM (applies to ALL generated content):
Always use Conventional Units (US system). NEVER use SI units (mmol/L, µmol/L, or any metric molar units).
Required units by lab type:
- Glucose, Creatinine, BUN, Bilirubin (Total/Direct/Indirect), Calcium, Magnesium, Phosphorus, Cholesterol, Triglycerides, LDL, HDL → mg/dL
- Albumin, Total Protein, Hemoglobin → g/dL
- Hematocrit → %
- Sodium (Na), Potassium (K), Chloride (Cl), Bicarbonate (HCO3) → mEq/L
- PSA → ng/mL
- TSH → mIU/L, T3 → ng/dL, T4 → µg/dL
This rule applies to all lab values, reference ranges, reports, MCQ options, case data, and any generated content involving laboratory values.

VITAL SIGNS — MANDATORY UNITS:
- Temperature → °C (Celsius). NEVER use Fahrenheit.
- Blood Pressure → mmHg
- Heart Rate → bpm
- Respiratory Rate → breaths/min
- SpO2 → %
- Capillary Refill Time (CRT) → seconds`;

/**
 * Enrich system prompt with global rules (lab units, etc.)
 */
function enrichSystemPrompt(systemPrompt: string): string {
  return systemPrompt + LAB_UNITS_RULE;
}

/**
 * Call the AI provider with system and user prompts
 */
export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  provider: AIProvider,
  customApiKey?: string
): Promise<AICallResult> {
  const enriched = enrichSystemPrompt(systemPrompt);
  
  if (provider.name === 'gemini') {
    return callGeminiDirect(enriched, userPrompt, provider.model, customApiKey);
  } else if (provider.name === 'anthropic') {
    return callAnthropicDirect(enriched, userPrompt, provider.model, customApiKey);
  } else if (provider.name === 'groq') {
    return callGroqDirect(enriched, userPrompt, provider.model, customApiKey);
  } else {
    return callLovableGateway(enriched, userPrompt, provider.model);
  }
}

/**
 * Call AI with full conversation history (for multi-turn use cases like AI cases)
 */
export async function callAIWithMessages(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  provider: AIProvider,
  options?: { temperature?: number; maxTokens?: number; customApiKey?: string }
): Promise<AICallResult> {
  const enriched = enrichSystemPrompt(systemPrompt);
  const temp = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 1024;

  if (provider.name === 'anthropic') {
    return callAnthropicWithMessages(enriched, messages, provider.model, temp, maxTokens, options?.customApiKey);
  } else if (provider.name === 'gemini') {
    return callGeminiWithMessages(enriched, messages, provider.model, temp, maxTokens, options?.customApiKey);
  } else if (provider.name === 'groq') {
    return callGroqWithMessages(enriched, messages, provider.model, temp, maxTokens, options?.customApiKey);
  } else {
    return callLovableWithMessages(enriched, messages, provider.model, temp, maxTokens);
  }
}

/**
 * Determine which API key to use based on governance policy.
 * Returns: { apiKey, keySource } or { error }
 */
export async function resolveApiKey(
  serviceClient: any,
  userId: string,
  userRole: string,
  settings: AISettings,
): Promise<{ apiKey?: string; keySource?: 'personal' | 'global' | 'lovable'; error?: string; errorCode?: string }> {
  // Lovable gateway doesn't need per-user key resolution
  if (settings.ai_provider === 'lovable') {
    return { apiKey: undefined, keySource: 'lovable' };
  }

  // Fetch platform settings
  const { data: platformSettings } = await serviceClient
    .from('ai_platform_settings')
    .select('*')
    .eq('id', 1)
    .single();

  const isSuperAdmin = userRole === 'super_admin';

  if (isSuperAdmin) {
    if (platformSettings?.allow_superadmin_global_ai === false) {
      return { error: 'Global AI is disabled by platform settings.', errorCode: 'GLOBAL_AI_DISABLED' };
    }
    return { apiKey: undefined, keySource: 'global' };
  }

  // Non-superadmin: check for personal key first
  const { data: keyRow } = await serviceClient
    .from('admin_api_keys')
    .select('api_key_encrypted, revoked_at')
    .eq('user_id', userId)
    .single();

  if (keyRow && !keyRow.revoked_at && keyRow.api_key_encrypted) {
    // Decrypt the personal key
    try {
      const { decrypt } = await import('../manage-admin-api-key/index.ts');
      const decryptedKey = await decrypt(keyRow.api_key_encrypted);
      return { apiKey: decryptedKey, keySource: 'personal' };
    } catch (err) {
      console.error('Failed to decrypt admin API key:', err);
      // Fall through to fallback check
    }
  }

  // No personal key - check fallback policy
  if (platformSettings?.allow_admin_fallback_to_global_key) {
    return { apiKey: undefined, keySource: 'global' };
  }

  // No key and no fallback allowed
  const message = platformSettings?.global_key_disabled_message ||
    'Please add your own API key in Account → My AI API Key to generate content.';
  return { error: message, errorCode: 'GLOBAL_KEY_DISABLED' };
}

/**
 * Log an AI usage event
 */
export async function logAIUsage(
  serviceClient: any,
  userId: string,
  contentType: string,
  provider: string,
  keySource: string,
  tokensInput?: number,
  tokensOutput?: number,
) {
  try {
    await serviceClient.from('ai_usage_events').insert({
      user_id: userId,
      content_type: contentType,
      provider,
      key_source: keySource,
      tokens_input: tokensInput || null,
      tokens_output: tokensOutput || null,
    });
  } catch (err) {
    console.error('Failed to log AI usage:', err);
  }
}

/**
 * Load active AI rules for a content type with precedence: chapter > module > global
 */
/**
 * Get the model for a specific content type, falling back to the global default.
 * Reads the 'content_type_model_overrides' setting from AISettings.
 */
export function getModelForContentType(
  settings: AISettings,
  contentType: string,
  overrides?: Record<string, string>,
): string {
  if (overrides && overrides[contentType] && overrides[contentType] !== 'default') {
    return overrides[contentType];
  }
  // Fall back to global model
  const modelMap: Record<AIProviderName, string> = {
    gemini: settings.gemini_model,
    lovable: settings.lovable_model,
    anthropic: settings.anthropic_model,
  };
  return modelMap[settings.ai_provider] || settings.gemini_model;
}

/**
 * Fetch content_type_model_overrides from ai_settings
 */
export async function getContentTypeOverrides(serviceClient: any): Promise<Record<string, string>> {
  const { data, error } = await serviceClient
    .from('ai_settings')
    .select('value')
    .eq('key', 'content_type_model_overrides')
    .single();

  if (error || !data?.value) return {};

  let value = data.value;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return {}; }
  }
  return (typeof value === 'object' && !Array.isArray(value)) ? value as Record<string, string> : {};
}

export async function loadAIRules(
  serviceClient: any,
  contentType: string,
  moduleId?: string | null,
  chapterId?: string | null,
): Promise<string> {
  const parts: string[] = [];

  // Global rules
  const { data: globalRules } = await serviceClient
    .from('ai_rules')
    .select('instructions')
    .eq('scope', 'global')
    .eq('content_type', contentType)
    .eq('is_active', true)
    .limit(1);

  if (globalRules?.[0]?.instructions) {
    parts.push(globalRules[0].instructions);
  }

  // Module-level override
  if (moduleId) {
    const { data: moduleRules } = await serviceClient
      .from('ai_rules')
      .select('instructions')
      .eq('scope', 'module')
      .eq('module_id', moduleId)
      .eq('content_type', contentType)
      .eq('is_active', true)
      .limit(1);

    if (moduleRules?.[0]?.instructions) {
      parts.push(`\nMODULE-SPECIFIC RULES:\n${moduleRules[0].instructions}`);
    }
  }

  // Chapter-level override
  if (chapterId) {
    const { data: chapterRules } = await serviceClient
      .from('ai_rules')
      .select('instructions')
      .eq('scope', 'chapter')
      .eq('chapter_id', chapterId)
      .eq('content_type', contentType)
      .eq('is_active', true)
      .limit(1);

    if (chapterRules?.[0]?.instructions) {
      parts.push(`\nCHAPTER-SPECIFIC RULES:\n${chapterRules[0].instructions}`);
    }
  }

  return parts.join('\n\n');
}

/**
 * Helper: retry-aware fetch for retryable status codes (503, 429)
 * Returns the Response on success or the last failed Response after exhausting retries.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2,
): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.ok || (response.status !== 503 && response.status !== 429)) {
      return response;
    }
    lastResponse = response;
    // Consume body to avoid resource leak
    await response.text();
    if (attempt < maxRetries) {
      const delayMs = (attempt + 1) * 1000; // 1s, 2s
      console.warn(`Retryable ${response.status} on attempt ${attempt + 1}, waiting ${delayMs}ms...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return lastResponse!;
}

/**
 * Direct Google Gemini API call
 * Uses X-goog-api-key header (NOT URL param) for security
 * Includes retry logic for 503/429 errors
 */
async function callGeminiDirect(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  customApiKey?: string
): Promise<AICallResult> {
  const googleApiKey = customApiKey || Deno.env.get('GOOGLE_API_KEY');
  
  if (!googleApiKey) {
    return { 
      success: false, 
      error: customApiKey ? 'Invalid personal API key.' : 'GOOGLE_API_KEY not configured. Please add it in Supabase Edge Function secrets.', 
      status: 500 
    };
  }

  try {
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': googleApiKey,
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 16384,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error (${response.status}):`, errorText);
      
      if (response.status === 429) {
        return { success: false, error: 'Gemini API rate limit exceeded. Please try again later.', status: 429 };
      }
      if (response.status === 503) {
        return { success: false, error: 'Gemini API is experiencing high demand. Please try again later.', status: 503 };
      }
      if (response.status === 403) {
        return { success: false, error: 'Invalid Google API key or API not enabled.', status: 403 };
      }
      if (response.status === 400) {
        return { success: false, error: 'Invalid request to Gemini API. Check model name.', status: 400 };
      }
      
      return { success: false, error: `Gemini API error: ${response.status}`, status: response.status };
    }

    const result = await response.json();
    
    if (result.candidates?.[0]?.finishReason === 'SAFETY') {
      return { success: false, error: 'Content was blocked by Gemini safety filters.', status: 400 };
    }
    
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      console.error('Empty Gemini response:', JSON.stringify(result));
      return { success: false, error: 'Gemini returned empty response', status: 500 };
    }
    
    return { success: true, content };
    
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown Gemini API error';
    console.error('Gemini API call failed:', msg);
    return { success: false, error: msg, status: 500 };
  }
}

/**
 * Lovable AI Gateway call (default provider)
 */
async function callLovableGateway(
  systemPrompt: string,
  userPrompt: string,
  model: string
): Promise<AICallResult> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  
  if (!lovableApiKey) {
    return { 
      success: false, 
      error: 'LOVABLE_API_KEY not configured.', 
      status: 500 
    };
  }

  try {
    const response = await fetch(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Lovable AI Gateway error (${response.status}):`, errorText);
      
      if (response.status === 429) {
        return { success: false, error: 'Lovable AI rate limit exceeded. Please try again later.', status: 429 };
      }
      if (response.status === 402) {
        return { success: false, error: 'Lovable AI credits exhausted. Please add credits to your workspace.', status: 402 };
      }
      
      return { success: false, error: `Lovable AI error: ${response.status}`, status: response.status };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('Empty Lovable AI response:', JSON.stringify(result));
      return { success: false, error: 'Lovable AI returned empty response', status: 500 };
    }
    
    return { success: true, content };
    
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown Lovable AI error';
    console.error('Lovable AI call failed:', msg);
    return { success: false, error: msg, status: 500 };
  }
}

/**
 * Direct Anthropic API call (single prompt)
 */
async function callAnthropicDirect(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  customApiKey?: string
): Promise<AICallResult> {
  return callAnthropicWithMessages(systemPrompt, [{ role: 'user', content: userPrompt }], model, 0.7, 16384, customApiKey);
}

/**
 * Anthropic API call with conversation history
 */
async function callAnthropicWithMessages(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  model: string,
  temperature: number,
  maxTokens: number,
  customApiKey?: string
): Promise<AICallResult> {
  const apiKey = customApiKey || Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return { success: false, error: 'ANTHROPIC_API_KEY not configured. Add it in Supabase Edge Function secrets.', status: 500 };
  }

  try {
    const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        ...(temperature !== undefined ? { temperature } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Anthropic API error (${response.status}):`, errorText);
      if (response.status === 429) return { success: false, error: 'Anthropic rate limit exceeded. Please try again later.', status: 429 };
      if (response.status === 402) return { success: false, error: 'Anthropic credits exhausted.', status: 402 };
      return { success: false, error: `Anthropic API error: ${response.status}`, status: response.status };
    }

    const result = await response.json();
    const content = result.content?.[0]?.text;
    if (!content) return { success: false, error: 'Anthropic returned empty response', status: 500 };
    return { success: true, content };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown Anthropic error';
    console.error('Anthropic API call failed:', msg);
    return { success: false, error: msg, status: 500 };
  }
}

/**
 * Lovable AI Gateway call with conversation history
 */
async function callLovableWithMessages(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  model: string,
  temperature: number,
  maxTokens: number,
): Promise<AICallResult> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) return { success: false, error: 'LOVABLE_API_KEY not configured.', status: 500 };

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Lovable AI error (${response.status}):`, errorText);
      if (response.status === 429) return { success: false, error: 'Rate limit exceeded. Please try again later.', status: 429 };
      if (response.status === 402) return { success: false, error: 'AI credits exhausted. Please add credits.', status: 402 };
      return { success: false, error: `Lovable AI error: ${response.status}`, status: response.status };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) return { success: false, error: 'Lovable AI returned empty response', status: 500 };
    return { success: true, content };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown Lovable AI error';
    return { success: false, error: msg, status: 500 };
  }
}

/**
 * Gemini API call with conversation history
 */
async function callGeminiWithMessages(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  model: string,
  temperature: number,
  maxTokens: number,
  customApiKey?: string
): Promise<AICallResult> {
  const googleApiKey = customApiKey || Deno.env.get('GOOGLE_API_KEY');
  if (!googleApiKey) return { success: false, error: 'GOOGLE_API_KEY not configured.', status: 500 };

  try {
    // Combine system prompt + conversation into a single prompt for Gemini
    const combinedPrompt = messages
      .map(m => `[${m.role.toUpperCase()}]: ${m.content}`)
      .join('\n\n');

    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': googleApiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${combinedPrompt}` }] }],
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini error (${response.status}):`, errorText);
      if (response.status === 429) return { success: false, error: 'Gemini rate limit exceeded.', status: 429 };
      return { success: false, error: `Gemini API error: ${response.status}`, status: response.status };
    }

    const result = await response.json();
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) return { success: false, error: 'Gemini returned empty response', status: 500 };
    return { success: true, content };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown Gemini error';
    return { success: false, error: msg, status: 500 };
  }
}

/**
 * Direct Groq API call
 */
async function callGroqDirect(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  customApiKey?: string
): Promise<AICallResult> {
  return callGroqWithMessages(systemPrompt, [{ role: 'user', content: userPrompt }], model, 0.7, 4096, customApiKey);
}

/**
 * Groq API call with conversation history (OpenAI compatible)
 */
async function callGroqWithMessages(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  model: string,
  temperature: number,
  maxTokens: number,
  customApiKey?: string
): Promise<AICallResult> {
  const apiKey = customApiKey || Deno.env.get('GROQ_API_KEY');
  if (!apiKey) {
    return { success: false, error: 'GROQ_API_KEY not configured. Add it in Supabase Edge Function secrets.', status: 500 };
  }

  try {
    const response = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Groq API error (${response.status}):`, errorText);
      if (response.status === 429) return { success: false, error: 'Groq rate limit exceeded.', status: 429 };
      return { success: false, error: `Groq API error: ${response.status}`, status: response.status };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) return { success: false, error: 'Groq returned empty response', status: 500 };
    return { success: true, content };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown Groq error';
    console.error('Groq API call failed:', msg);
    return { success: false, error: msg, status: 500 };
  }
}
