import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      let waitMs: number;

      if (retryAfter) {
        const parsed = parseInt(retryAfter, 10);
        waitMs = !isNaN(parsed) ? parsed * 1000 : Math.pow(2, attempt) * 1000;
      } else {
        waitMs = Math.pow(2, attempt) * 1000 + Math.random() * 500;
      }

      console.warn(`Rate limited (429). Waiting ${waitMs}ms before retry ${attempt + 1}/${maxRetries}.`);
      await response.text(); // consume body
      await new Promise(resolve => setTimeout(resolve, waitMs));
      continue;
    }

    return response;
  }

  // Final attempt
  return await fetch(url, options);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const svcClient = createClient(supabaseUrl, serviceRoleKey);

    // ──────────────────────────────────────────────────────────────────────────
    // 1. FLOW: GET (Streaming Audio)
    // ──────────────────────────────────────────────────────────────────────────
    async function streamFromElevenLabs(payload: any) {
      const { text, voiceId, tone, speed: requestSpeed } = payload;
      const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
      if (!elevenLabsApiKey) throw new Error('ELEVENLABS_API_KEY is not set');

      const toneSettings: Record<string, any> = {
        calm:        { stability: 0.55, similarity_boost: 0.75, style: 0.2 },
        worried:     { stability: 0.35, similarity_boost: 0.7,  style: 0.4 },
        anxious:     { stability: 0.25, similarity_boost: 0.65, style: 0.5 },
        angry:       { stability: 0.3,  similarity_boost: 0.8,  style: 0.7 },
        impolite:    { stability: 0.35, similarity_boost: 0.8,  style: 0.6 },
        in_pain:     { stability: 0.2,  similarity_boost: 0.7,  style: 0.6 },
        cooperative: { stability: 0.6,  similarity_boost: 0.75, style: 0.3 },
      };

      const voiceSettings = toneSettings[tone] || toneSettings.calm;
      const ttsSpeed = typeof requestSpeed === 'number' ? requestSpeed : 1.1;

      const response = await fetchWithRetry(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_22050_32`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': elevenLabsApiKey,
            'Accept': 'audio/mpeg',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: voiceSettings,
            speed: ttsSpeed,
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errText}`);
      }
      return response;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. FLOW: GET (Streaming Audio via Token)
    // ──────────────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const tokenId = url.searchParams.get('token_id');

      if (!tokenId) {
        return new Response(JSON.stringify({ error: 'Missing token_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Atomically consume token
      const { data: tokenData, error: tokenError } = await svcClient
        .from('tts_tokens')
        .delete()
        .eq('id', tokenId)
        .select()
        .single();

      if (tokenError || !tokenData) {
        return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.log(`[GET] Handshake active for user ${tokenData.user_id}`);
      const response = await streamFromElevenLabs(tokenData.payload);

      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'audio/mpeg',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. FLOW: POST (Token Creation OR Legacy Direct Streaming)
    // ──────────────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, { 
      global: { headers: { Authorization: `Bearer ${token}` } } 
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const payload = await req.json();
    const { text, voiceId, legacy } = payload;

    if (!text || !voiceId) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (legacy === true) {
      console.log('[POST] Legacy direct streaming enabled');
      const response = await streamFromElevenLabs(payload);
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'audio/mpeg',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    // Default: Return handshake token
    const { data: tokenRow, error: insertError } = await svcClient
      .from('tts_tokens')
      .insert({
        user_id: user.id,
        payload
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ token_id: tokenRow.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Master Error:', (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
