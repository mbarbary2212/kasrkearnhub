import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAISettings, getAIProvider } from "../_shared/ai-provider.ts";
import { detectPromptInjection } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Admin roles that bypass quota limits
const ADMIN_ROLES = ['super_admin', 'platform_admin', 'department_admin', 'admin', 'teacher', 'topic_admin'];

// ============= Tutor Settings =============
interface TutorSettings {
  enabled: boolean;
  dailyLimit: number;
  disabledMessage: string;
  provider: 'gemini' | 'lovable';
  model: string;
}

async function getTutorSettings(serviceClient: any): Promise<TutorSettings> {
  const { data, error } = await serviceClient
    .from('ai_settings')
    .select('key, value');

  if (error) {
    console.error('Failed to fetch tutor settings:', error.message);
  }

  const defaults: TutorSettings = {
    enabled: true,
    dailyLimit: 5,
    disabledMessage: 'The MedGPT Tutor is temporarily unavailable. Please use Feedback & Inquiries.',
    provider: 'gemini',
    model: 'gemini-3.1-pro-preview',
  };

  if (!data) return defaults;

  // Track feature-specific vs global settings separately
  let featureProvider: string | null = null;
  let featureModel: string | null = null;
  let globalProvider: string | null = null;
  let globalGeminiModel: string | null = null;
  let globalLovableModel: string | null = null;

  for (const row of data) {
    let value = row.value;
    if (typeof value === 'string') {
      try { value = JSON.parse(value); } catch { /* keep as-is */ }
    }
    switch (row.key) {
      case 'tutor_enabled':
        defaults.enabled = value === true || value === 'true';
        break;
      case 'tutor_daily_limit':
        defaults.dailyLimit = parseInt(value) || 5;
        break;
      case 'tutor_disabled_message':
        defaults.disabledMessage = value || defaults.disabledMessage;
        break;
      case 'tutor_provider':
        featureProvider = value || null;
        break;
      case 'tutor_model':
        featureModel = value || null;
        break;
      case 'ai_provider':
        globalProvider = value || null;
        break;
      case 'gemini_model':
        globalGeminiModel = value || null;
        break;
      case 'lovable_model':
        globalLovableModel = value || null;
        break;
    }
  }

  // Resolve provider: feature-specific > global > default
  const resolvedProvider = featureProvider ?? globalProvider ?? 'lovable';
  defaults.provider = resolvedProvider === 'gemini' ? 'gemini' : 'lovable';

  // Resolve model: feature-specific > global (based on provider) > default
  if (featureModel) {
    defaults.model = featureModel;
  } else if (defaults.provider === 'gemini' && globalGeminiModel) {
    defaults.model = globalGeminiModel;
  } else if (defaults.provider === 'lovable' && globalLovableModel) {
    defaults.model = globalLovableModel;
  }

  return defaults;
}

// ============= Quota Management =============
async function checkAndIncrementQuota(
  serviceClient: any, 
  userId: string, 
  dailyLimit: number,
  incrementNow: boolean = false
): Promise<{ allowed: boolean; currentCount: number }> {
  const today = new Date().toISOString().split('T')[0];
  
  // Get current count
  const { data: existing } = await serviceClient
    .from('coach_usage')
    .select('question_count')
    .eq('user_id', userId)
    .eq('question_date', today)
    .single();

  const currentCount = existing?.question_count || 0;
  
  if (currentCount >= dailyLimit) {
    return { allowed: false, currentCount };
  }

  if (incrementNow) {
    // Upsert the count
    await serviceClient
      .from('coach_usage')
      .upsert({
        user_id: userId,
        question_date: today,
        question_count: currentCount + 1,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,question_date' });
  }

  return { allowed: true, currentCount };
}

async function incrementQuotaOnly(serviceClient: any, userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: existing } = await serviceClient
    .from('coach_usage')
    .select('question_count')
    .eq('user_id', userId)
    .eq('question_date', today)
    .single();

  const currentCount = existing?.question_count || 0;
  
  await serviceClient
    .from('coach_usage')
    .upsert({
      user_id: userId,
      question_date: today,
      question_count: currentCount + 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,question_date' });
}

// ============= System Prompt with RAG Constraint =============
function getSystemPrompt(hasContext: boolean): string {
  const basePrompt = `You are MedGPT Tutor, a specialized medical education assistant for Cairo University Faculty of Medicine.

Your role:
- Help students understand medical concepts from their course materials
- Explain complex medical topics in clear, accessible language
- Provide educational context for MCQs and clinical scenarios
- Encourage critical thinking and evidence-based reasoning

Guidelines:
- Be accurate and reference the provided course materials
- Use clear explanations with relevant examples
- When uncertain, acknowledge limitations
- Do not provide personal medical advice or diagnoses
- Keep responses focused on educational content`;

  if (hasContext) {
    return `${basePrompt}

## CRITICAL CONSTRAINT:
You MUST answer ONLY from the provided course materials context below.
If the question cannot be answered from the provided materials:
1. State clearly: "I cannot find information about this topic in the course materials."
2. Suggest: "Please navigate to a specific chapter or submit your question via Feedback & Inquiries."
3. DO NOT generate answers from general medical knowledge.
4. DO NOT hallucinate or make up information.

Disclaimer: You are an educational tool. Always refer to official university materials for clinical decisions.`;
  } else {
    // No context provided - strict mode for students
    return `${basePrompt}

## CRITICAL CONSTRAINT:
No course materials context has been provided with this request.
You MUST respond with:
"I cannot find information about this topic in the course materials. Please navigate to a specific chapter or module and try again, or submit your question via Feedback & Inquiries."

DO NOT answer questions from general knowledge when no context is provided.

Disclaimer: You are an educational tool. Always refer to official university materials for clinical decisions.`;
  }
}

// ============= Streaming Functions =============

// Stream from Lovable AI Gateway (OpenAI-compatible)
async function streamFromLovable(
  messages: Array<{ role: string; content: string }>,
  model: string,
  systemPrompt: string
): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    }),
  });

  return response;
}

// Stream from Google Gemini API with SSE transformation and stream-safe quota increment
async function streamFromGemini(
  messages: Array<{ role: string; content: string }>,
  model: string,
  systemPrompt: string,
  onFirstContent?: () => Promise<void>
): Promise<Response> {
  const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
  
  if (!googleApiKey) {
    throw new Error('GOOGLE_API_KEY not configured');
  }

  // Build conversation for Gemini format
  const conversationParts: string[] = [];
  conversationParts.push(`System: ${systemPrompt}`);
  
  for (const msg of messages) {
    const role = msg.role === 'user' ? 'User' : 'Assistant';
    conversationParts.push(`${role}: ${msg.content}`);
  }

  const fullPrompt = conversationParts.join('\n\n');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': googleApiKey,
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: fullPrompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini streaming error (${response.status}):`, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  // Transform Gemini SSE format to OpenAI-compatible format with quota tracking
  let hasIncrementedQuota = false;
  let safetyBlocked = false;

  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk);
      const lines = text.split('\n');
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;
        
        try {
          const geminiData = JSON.parse(jsonStr);
          
          // Check for safety blocking
          const finishReason = geminiData.candidates?.[0]?.finishReason;
          if (finishReason === 'SAFETY') {
            safetyBlocked = true;
            // Don't increment quota for safety blocks
            const blockedResponse = {
              choices: [{
                delta: { 
                  content: "I cannot process this request. Please rephrase your question in an academic context." 
                },
                index: 0,
                finish_reason: 'stop'
              }]
            };
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(blockedResponse)}\n\n`));
            continue;
          }

          const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (content) {
            // Increment quota on first successful content
            if (!hasIncrementedQuota && !safetyBlocked && onFirstContent) {
              await onFirstContent();
              hasIncrementedQuota = true;
            }

            // Transform to OpenAI-compatible format
            const openaiFormat = {
              choices: [{
                delta: { content },
                index: 0,
              }]
            };
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openaiFormat)}\n\n`));
          }
        } catch (e) {
          // Skip malformed JSON chunks
        }
      }
    },
    flush(controller) {
      controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
    },
  });

  const transformedStream = response.body!.pipeThrough(transformStream);
  
  return new Response(transformedStream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

// Stream from Lovable with quota tracking wrapper
async function streamFromLovableWithQuota(
  messages: Array<{ role: string; content: string }>,
  model: string,
  systemPrompt: string,
  onFirstContent?: () => Promise<void>
): Promise<Response> {
  const response = await streamFromLovable(messages, model, systemPrompt);
  
  if (!response.ok || !response.body) {
    return response;
  }

  let hasIncrementedQuota = false;

  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk);
      
      // Check if there's actual content in the stream
      if (text.includes('"content":') && !hasIncrementedQuota && onFirstContent) {
        await onFirstContent();
        hasIncrementedQuota = true;
      }
      
      controller.enqueue(chunk);
    },
  });

  const transformedStream = response.body.pipeThrough(transformStream);
  
  return new Response(transformedStream, {
    headers: response.headers,
    status: response.status,
  });
}

// ============= Main Handler =============
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============= Step 1: JWT Authentication =============
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ 
          blocked: true,
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please sign in to use the tutor.' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create user-context client for auth verification
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authError } = await userClient.auth.getUser(token);
    
    if (authError || !claims?.user) {
      console.error('Auth verification failed:', authError?.message);
      return new Response(
        JSON.stringify({ 
          blocked: true,
          code: 'UNAUTHORIZED',
          message: 'Session expired. Please sign in again.' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claims.user.id;

    // Create service client for database operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // ============= Step 2: Get Tutor Settings =============
    const tutorSettings = await getTutorSettings(serviceClient);

    if (!tutorSettings.enabled) {
      return new Response(
        JSON.stringify({
          blocked: true,
          code: 'TUTOR_DISABLED',
          title: 'Tutor Unavailable',
          message: tutorSettings.disabledMessage,
          action_url: '/feedback',
          action_label: 'Go to Feedback'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= Step 3: Check User Role =============
    const { data: roleData } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const userRole = roleData?.role || 'student';
    const isAdmin = ADMIN_ROLES.includes(userRole);

    // ============= Step 4: Parse Request =============
    const { messages, context } = await req.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the latest user message
    const userMessages = messages.filter((m: { role: string }) => m.role === 'user');
    const latestUserMessage = userMessages[userMessages.length - 1];

    if (!latestUserMessage || !latestUserMessage.content) {
      return new Response(
        JSON.stringify({ error: 'No user message found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userContent = latestUserMessage.content;
    console.log(`Processing message from ${isAdmin ? 'admin' : 'student'}:`, userContent.substring(0, 100) + '...');

    // ============= Step 5: Quota Check (Students Only) =============
    if (!isAdmin) {
      const quotaCheck = await checkAndIncrementQuota(serviceClient, userId, tutorSettings.dailyLimit, false);
      
      if (!quotaCheck.allowed) {
        console.log(`Quota exceeded for user ${userId}: ${quotaCheck.currentCount}/${tutorSettings.dailyLimit}`);
        return new Response(
          JSON.stringify({
            blocked: true,
            code: 'QUOTA_EXCEEDED',
            title: 'Daily question limit reached',
            message: `You have used all ${tutorSettings.dailyLimit} questions for today. Please try again tomorrow, or send your question via Feedback & Inquiries.`,
            action_url: '/feedback',
            action_label: 'Go to Feedback'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ============= Step 6: Prompt Injection Detection =============
    if (detectPromptInjection(userContent)) {
      console.log('Message blocked: Prompt injection detected');
      return new Response(
        JSON.stringify({
          blocked: true,
          code: 'INJECTION_DETECTED',
          message: "I cannot process this request. Please rephrase your question in an academic context."
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= Step 7: RAG Context Check (Students Only) =============
    // For students: require context or return "not found" response
    // For admins: allow general queries (they may be testing or have special access)
    const hasContext = context && typeof context === 'string' && context.trim().length > 0;
    
    if (!isAdmin && !hasContext) {
      console.log('No context provided for student, returning strict response');
      return new Response(
        JSON.stringify({
          blocked: true,
          code: 'RAG_NO_CONTEXT',
          title: 'No course materials available',
          message: 'Please navigate to a specific chapter to ask questions about course content, or submit your question via Feedback & Inquiries.',
          action_url: '/feedback',
          action_label: 'Go to Feedback'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= Step 8: Build System Prompt =============
    let systemPrompt = getSystemPrompt(hasContext);
    
    if (hasContext) {
      systemPrompt += `\n\n[COURSE MATERIALS CONTEXT]\n${context}\n[END CONTEXT - Answer ONLY from above]`;
    }

    // ============= Step 9: Stream AI Response =============
    const provider = tutorSettings.provider;
    const model = tutorSettings.model;

    console.log(`Forwarding to AI (provider: ${provider}, model: ${model})`);

    // Create quota increment callback for students
    const onFirstContent = !isAdmin 
      ? async () => {
          await incrementQuotaOnly(serviceClient, userId);
          console.log(`Quota incremented for user ${userId}`);
        }
      : undefined;

    let streamResponse: Response;
    
    try {
      if (provider === 'gemini') {
        streamResponse = await streamFromGemini(messages, model, systemPrompt, onFirstContent);
      } else {
        streamResponse = await streamFromLovableWithQuota(messages, model, systemPrompt, onFirstContent);
      }
    } catch (providerError) {
      console.error('Provider error:', providerError);
      return new Response(
        JSON.stringify({ 
          blocked: true,
          code: 'AI_ERROR',
          message: 'AI service temporarily unavailable. Please try again later.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle rate limiting for Lovable gateway
    if (provider === 'lovable' && !streamResponse.ok) {
      if (streamResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            blocked: true,
            code: 'RATE_LIMITED',
            message: "Rate limits exceeded, please try again later." 
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (streamResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            blocked: true,
            code: 'AI_ERROR',
            message: "AI service temporarily unavailable. Please try again later." 
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await streamResponse.text();
      console.error("AI gateway error:", streamResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          blocked: true,
          code: 'AI_ERROR',
          message: "AI service error" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream the response back
    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Chat with moderation error:", error);
    return new Response(
      JSON.stringify({ 
        blocked: true,
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
