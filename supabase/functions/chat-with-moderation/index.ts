import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAISettings, getAIProvider } from "../_shared/ai-provider.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Prompt injection detection patterns
const INJECTION_PATTERNS = [
  /ignore\s*(all\s*)?(previous|prior|above)\s*(instructions|prompts|rules)/i,
  /forget\s*(your|all|the)?\s*(instructions|prompts|rules|system)/i,
  /you\s+are\s+now\s+(a|an|the)/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /act\s+as\s+if\s+you/i,
  /disregard\s+(all|your|the|previous)/i,
  /override\s+(your|the|all)\s*(instructions|rules|prompts)/i,
  /new\s+instructions?:/i,
  /system\s*prompt\s*:/i,
  /\[system\]/i,
  /\[admin\]/i,
  /\[developer\]/i,
  /bypass\s+(the\s+)?(filter|moderation|safety)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /do\s+anything\s+now/i,
  /no\s+restrictions/i,
  /ignore\s+safety/i,
  /reveal\s+(your|the)\s*(system|original)\s*prompt/i,
  /what\s+(is|are)\s+your\s+(instructions|rules|system\s*prompt)/i,
];

// System prompt for the AI tutor - works for all users
const SYSTEM_PROMPT = `You are MedGPT Tutor, a specialized medical education assistant for Cairo University Faculty of Medicine.

Your role:
- Help students, teachers, and staff understand medical concepts
- Explain complex medical topics in clear, accessible language
- Support learning across all medical disciplines (anatomy, physiology, pharmacology, pathology, etc.)
- Provide educational context for MCQs and clinical scenarios
- Encourage critical thinking and evidence-based reasoning

Guidelines:
- Be accurate and cite established medical knowledge
- Use clear explanations with relevant examples
- When uncertain, acknowledge limitations
- Encourage users to verify information with official course materials
- Do not provide personal medical advice or diagnoses
- Keep responses focused on educational content

Disclaimer: You are an educational tool. Always refer to official university materials and qualified healthcare professionals for clinical decisions.`;

function detectPromptInjection(text: string): boolean {
  const normalizedText = text.toLowerCase().replace(/\s+/g, ' ');
  
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text) || pattern.test(normalizedText)) {
      console.log(`Prompt injection detected: ${pattern}`);
      return true;
    }
  }
  
  // Check for base64 encoded content that might contain injection attempts
  const base64Pattern = /^[A-Za-z0-9+/]{50,}={0,2}$/;
  const words = text.split(/\s+/);
  for (const word of words) {
    if (base64Pattern.test(word)) {
      try {
        const decoded = atob(word);
        for (const pattern of INJECTION_PATTERNS) {
          if (pattern.test(decoded)) {
            console.log('Prompt injection detected in base64 content');
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

async function moderateContent(content: string, apiKey: string): Promise<{ flagged: boolean; categories: string[] }> {
  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: content }),
    });

    if (!response.ok) {
      console.error('Moderation API error:', response.status);
      // If moderation fails, allow the message (fail open) but log it
      return { flagged: false, categories: [] };
    }

    const data = await response.json();
    const result = data.results?.[0];
    
    if (!result) {
      return { flagged: false, categories: [] };
    }

    const flaggedCategories: string[] = [];
    if (result.categories) {
      for (const [category, isFlagged] of Object.entries(result.categories)) {
        if (isFlagged) {
          flaggedCategories.push(category);
        }
      }
    }

    return {
      flagged: result.flagged || false,
      categories: flaggedCategories,
    };
  } catch (error) {
    console.error('Moderation error:', error);
    return { flagged: false, categories: [] };
  }
}

// Stream from Lovable AI Gateway (OpenAI-compatible)
async function streamFromLovable(
  messages: Array<{ role: string; content: string }>,
  model: string
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
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      stream: true,
    }),
  });

  return response;
}

// Stream from Google Gemini API with SSE transformation
async function streamFromGemini(
  messages: Array<{ role: string; content: string }>,
  model: string
): Promise<Response> {
  const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
  
  if (!googleApiKey) {
    throw new Error('GOOGLE_API_KEY not configured');
  }

  // Build conversation for Gemini format
  const conversationParts: string[] = [];
  conversationParts.push(`System: ${SYSTEM_PROMPT}`);
  
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

  // Transform Gemini SSE format to OpenAI-compatible format for frontend
  const transformStream = new TransformStream({
    transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk);
      const lines = text.split('\n');
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;
        
        try {
          const geminiData = JSON.parse(jsonStr);
          const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (content) {
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Moderation service unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the latest user message for moderation
    const userMessages = messages.filter((m: { role: string }) => m.role === 'user');
    const latestUserMessage = userMessages[userMessages.length - 1];

    if (!latestUserMessage || !latestUserMessage.content) {
      return new Response(
        JSON.stringify({ error: 'No user message found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userContent = latestUserMessage.content;
    console.log('Processing message:', userContent.substring(0, 100) + '...');

    // Step 1: Check for prompt injection
    if (detectPromptInjection(userContent)) {
      console.log('Message blocked: Prompt injection detected');
      return new Response(
        JSON.stringify({
          blocked: true,
          message: "I cannot process this request. Please rephrase your question in an academic context.",
          reason: "prompt_injection"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Run OpenAI moderation
    const moderationResult = await moderateContent(userContent, OPENAI_API_KEY);
    
    if (moderationResult.flagged) {
      console.log('Message blocked: Moderation flagged', moderationResult.categories);
      return new Response(
        JSON.stringify({
          blocked: true,
          message: "I cannot process this request. Please rephrase your question in an academic context.",
          reason: "content_policy",
          categories: moderationResult.categories
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Get AI provider configuration
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const aiSettings = await getAISettings(serviceClient);
    const provider = getAIProvider(aiSettings);

    console.log(`Message passed moderation, forwarding to AI (provider: ${provider.name}, model: ${provider.model})`);

    // Step 4: Stream response based on provider
    let streamResponse: Response;
    
    try {
      if (provider.name === 'gemini') {
        streamResponse = await streamFromGemini(messages, provider.model);
      } else {
        streamResponse = await streamFromLovable(messages, provider.model);
      }
    } catch (providerError) {
      console.error('Provider error:', providerError);
      return new Response(
        JSON.stringify({ error: 'AI service temporarily unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!streamResponse.ok && provider.name === 'lovable') {
      if (streamResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (streamResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await streamResponse.text();
      console.error("AI gateway error:", streamResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
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
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
