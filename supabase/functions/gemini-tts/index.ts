import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function addWavHeader(
  pcmBase64: string,
  inputSampleRate = 24000,
  outputSampleRate = 16000,
  numChannels = 1,
  bitsPerSample = 16
): ArrayBuffer {
  const pcmBuffer = new Int16Array(
    Uint8Array.from(atob(pcmBase64), c => c.charCodeAt(0)).buffer
  );

  // Downsample using linear interpolation
  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.floor(pcmBuffer.length / ratio);
  const downsampled = new Int16Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const pos = i * ratio;
    const index = Math.floor(pos);
    const frac = pos - index;
    const a = pcmBuffer[index] ?? 0;
    const b = pcmBuffer[index + 1] ?? 0;
    downsampled[i] = Math.round(a + frac * (b - a));
  }

  const dataSize = downsampled.byteLength;
  const byteRate = outputSampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, outputSampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  new Uint8Array(buffer).set(new Uint8Array(downsampled.buffer), 44);
  return buffer;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Parameter & Auth extraction ──
    const url = new URL(req.url);
    let text, voiceName, stylePrompt, token;

    if (req.method === 'GET') {
      text = url.searchParams.get('text');
      voiceName = url.searchParams.get('voiceName');
      stylePrompt = url.searchParams.get('stylePrompt');
      token = url.searchParams.get('token');
    } else {
      const body = await req.json();
      text = body.text;
      voiceName = body.voiceName;
      stylePrompt = body.stylePrompt;
      const authHeader = req.headers.get('Authorization') || '';
      token = authHeader.replace('Bearer ', '');
    }

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, { 
      global: { headers: { Authorization: `Bearer ${token}` } } 
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    if (!text) {
      return new Response(
        JSON.stringify({ error: 'text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    async function callGemini(inputText: string, voiceName: string) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
          {
            method: 'POST',
            headers: {
              'X-Goog-Api-Key': GEMINI_API_KEY!,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: inputText }] }],
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName },
                  },
                },
              },
            }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);
        console.log('[gemini-tts] Gemini API responded:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Gemini TTS API error:', response.status, errorText);
          return { ok: false, status: response.status, audioData: null, finishReason: null };
        }
        const result = await response.json();
        const audioData = result?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        const finishReason = result?.candidates?.[0]?.finishReason;
        return { ok: true, status: 200, audioData, finishReason };
      } catch (err) {
        clearTimeout(timeoutId);
        if ((err as Error).name === 'AbortError') {
          console.error('[gemini-tts] Gemini API timed out after 15s');
          return { ok: false, status: 504, audioData: null, finishReason: 'TIMEOUT' };
        }
        throw err;
      }
    }

    const voice = voiceName || 'Kore';
    const finalText = stylePrompt ? `${stylePrompt}\n\n${text}` : text;

    // First attempt with style prompt (with retry on 500)
    console.log('[gemini-tts] Attempt 1 with style prompt:', !!stylePrompt);
    let result = await callGemini(finalText, voice);

    // Retry once on transient 500 errors from Gemini API
    if (!result.ok && result.status === 500) {
      console.log('[gemini-tts] Got 500 from Gemini, retrying after 500ms...');
      await new Promise(r => setTimeout(r, 500));
      result = await callGemini(finalText, voice);
    }

    if (!result.ok) {
      return new Response(
        JSON.stringify({ error: `Gemini TTS API error: ${result.status}` }),
        { status: result.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no audio and we had a style prompt, retry without it
    if (!result.audioData && stylePrompt) {
      console.log('[gemini-tts] No audio (finishReason:', result.finishReason, ') — retrying without style prompt');
      result = await callGemini(text, voice);
      if (!result.ok) {
        return new Response(
          JSON.stringify({ error: `Gemini TTS API error on retry: ${result.status}` }),
          { status: result.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const audioData = result.audioData;
    if (!audioData) {
      console.error('[gemini-tts] No audio data after all attempts, finishReason:', result.finishReason);
      return new Response(
        JSON.stringify({ error: 'No audio data returned from Gemini' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const wavBuffer = addWavHeader(audioData);
    return new Response(wavBuffer, {
      headers: { ...corsHeaders, 'Content-Type': 'audio/wav' }
    });
  } catch (err) {
    console.error('gemini-tts error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
