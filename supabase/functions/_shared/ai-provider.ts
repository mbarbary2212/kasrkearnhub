// ============================================
// AI Provider Abstraction
// Supports: Lovable AI Gateway & Direct Google Gemini
// ============================================

export interface AIProvider {
  name: 'lovable' | 'gemini';
  model: string;
}

export interface AICallResult {
  success: boolean;
  content?: string;
  error?: string;
  status?: number;
}

export interface AISettings {
  ai_provider: 'lovable' | 'gemini';
  gemini_model: string;
  lovable_model: string;
  ai_content_factory_enabled: boolean;
  ai_content_factory_disabled_message: string;
}

const DEFAULT_SETTINGS: AISettings = {
  ai_provider: 'lovable',
  gemini_model: 'gemini-2.5-flash',
  lovable_model: 'google/gemini-3-flash-preview',
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
        settings.ai_provider = value === 'gemini' ? 'gemini' : 'lovable';
        break;
      case 'gemini_model':
        settings.gemini_model = (value as string) || DEFAULT_SETTINGS.gemini_model;
        break;
      case 'lovable_model':
        settings.lovable_model = (value as string) || DEFAULT_SETTINGS.lovable_model;
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
  return {
    name: settings.ai_provider,
    model: settings.ai_provider === 'gemini' 
      ? settings.gemini_model 
      : settings.lovable_model,
  };
}

/**
 * Call the AI provider with system and user prompts
 */
export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  provider: AIProvider
): Promise<AICallResult> {
  
  if (provider.name === 'gemini') {
    return callGeminiDirect(systemPrompt, userPrompt, provider.model);
  } else {
    return callLovableGateway(systemPrompt, userPrompt, provider.model);
  }
}

/**
 * Direct Google Gemini API call
 * Uses X-goog-api-key header (NOT URL param) for security
 */
async function callGeminiDirect(
  systemPrompt: string,
  userPrompt: string,
  model: string
): Promise<AICallResult> {
  const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
  
  if (!googleApiKey) {
    return { 
      success: false, 
      error: 'GOOGLE_API_KEY not configured. Please add it in Supabase Edge Function secrets.', 
      status: 500 
    };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': googleApiKey,  // Secure header-based auth (NOT URL param)
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
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error (${response.status}):`, errorText);
      
      if (response.status === 429) {
        return { success: false, error: 'Gemini API rate limit exceeded. Please try again later.', status: 429 };
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
    
    // Check for blocked content
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
