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
    // ── Parameter & Auth extraction ──
    const url = new URL(req.url);
    let text, voiceId, tone, requestSpeed, token;

    if (req.method === 'GET') {
      text = url.searchParams.get('text');
      voiceId = url.searchParams.get('voiceId');
      tone = url.searchParams.get('tone');
      requestSpeed = parseFloat(url.searchParams.get('speed') || '1.1');
      token = url.searchParams.get('token');
    } else {
      const body = await req.json();
      text = body.text;
      voiceId = body.voiceId;
      tone = body.tone;
      requestSpeed = body.speed;
      const authHeader = req.headers.get('Authorization') || '';
      token = authHeader.replace('Bearer ', '');
    }

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, { 
      global: { headers: { Authorization: `Bearer ${token}` } } 
    });
    
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = user.id;
    const svcClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await svcClient.from('user_roles').select('role').eq('user_id', userId).single();
    const userRole = roleData?.role || 'student';
    const allowedRoles = ['super_admin', 'platform_admin', 'admin', 'teacher', 'department_admin', 'topic_admin', 'student'];
    if (!allowedRoles.includes(userRole)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    if (!text || !voiceId) {
      return new Response(
        JSON.stringify({ error: 'text and voiceId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ELEVENLABS_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetchWithRetry(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_22050_32`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
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
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `ElevenLabs API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (err) {
    console.error('elevenlabs-tts error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
