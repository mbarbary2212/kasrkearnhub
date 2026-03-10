import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId, tone, speed: requestSpeed } = await req.json();

    if (!text || !voiceId) {
      return new Response(
        JSON.stringify({ error: 'text and voiceId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map patient tone to ElevenLabs voice_settings
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

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
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
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
