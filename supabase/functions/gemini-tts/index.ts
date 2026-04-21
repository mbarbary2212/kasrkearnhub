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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const svcClient = createClient(supabaseUrl, serviceRoleKey);

    async function streamFromGemini(payload: any) {
      const { text, voiceName, stylePrompt } = payload;
      const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY');
      if (!GEMINI_API_KEY) throw new Error('GOOGLE_API_KEY is not set');

      async function callGemini(inputText: string, voice: string) {
        const response = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-tts:generateContent',
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
                    prebuiltVoiceConfig: { voiceName: voice },
                  },
                },
              },
            }),
          }
        );

        if (!response.ok) throw new Error(`Gemini status ${response.status}`);
        const result = await response.json();
        const data = result?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!data) throw new Error('No audio data returned from Gemini');
        return data;
      }

      const voice = voiceName || 'Kore';
      const finalText = stylePrompt ? `${stylePrompt}\n\n${text}` : text;
      
      let audioData;
      try {
        audioData = await callGemini(finalText, voice);
      } catch (err) {
        if (stylePrompt) audioData = await callGemini(text, voice);
        else throw err;
      }

      return addWavHeader(audioData);
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const tokenId = url.searchParams.get('token_id');
      
      let payloadToStream: any;
      
      if (tokenId) {
        // 1. New Handshake Flow
        const { data: tokenData, error: tokenError } = await svcClient
          .from('tts_tokens')
          .delete()
          .eq('id', tokenId)
          .select()
          .single();

        if (tokenError || !tokenData) {
          return new Response('Invalid or expired token', { status: 401, headers: corsHeaders });
        }
        payloadToStream = tokenData.payload;
      } else {
        // 2. Legacy Flow (Backward Compatibility)
        const text = url.searchParams.get('text');
        const token = url.searchParams.get('token');
        const voiceName = url.searchParams.get('voiceName');
        const stylePrompt = url.searchParams.get('stylePrompt');

        if (!text || !token) {
          return new Response('Missing token_id or legacy params', { status: 400, headers: corsHeaders });
        }

        // Validate legacy token
        const anonClient = createClient(supabaseUrl, supabaseAnonKey, { 
          global: { headers: { Authorization: `Bearer ${token}` } } 
        });
        const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
        if (authError || !user) {
          return new Response('Invalid legacy auth', { status: 401, headers: corsHeaders });
        }
        
        payloadToStream = { text, voiceName, stylePrompt };
      }

      console.log(`[GET] Streaming Gemini audio for ${tokenId ? 'Handshake' : 'Legacy'} request`);
      const wavBuffer = await streamFromGemini(payloadToStream);
      return new Response(wavBuffer, {
        headers: { ...corsHeaders, 'Content-Type': 'audio/wav' }
      });
    }

    // POST FLOW
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response('Unauthorized', { status: 401 });
    const token = authHeader.replace('Bearer ', '');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, { 
      global: { headers: { Authorization: `Bearer ${token}` } } 
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) return new Response('Invalid auth', { status: 401 });

    const payload = await req.json();
    if (payload.legacy === true) {
      const wavBuffer = await streamFromGemini(payload);
      return new Response(wavBuffer, { headers: { ...corsHeaders, 'Content-Type': 'audio/wav' } });
    }

    const { data: tokenRow, error: insertError } = await svcClient
      .from('tts_tokens')
      .insert({ user_id: user.id, payload })
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
