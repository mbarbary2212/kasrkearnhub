import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Creates a standard 44-byte WAV header for 16kHz, 16-bit, Mono PCM.
 * For streaming, we set the total size to 0 or a very large value.
 */
function createWavHeader(dataSize = 0): Uint8Array {
  const numChannels = 1;
  const sampleRate = 16000;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, dataSize > 0 ? 36 + dataSize : 0x7FFFFFFF, true); // Total size
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize > 0 ? dataSize : 0x7FFFFFFF, true); // Chunk size

  return new Uint8Array(buffer);
}

/**
 * Parses the Gemini NDJSON/Array stream and extracts Base64 audio chunks.
 * Handles the "[" and "," characters in the stream.
 */
async function streamGemini(
  inputText: string, 
  voiceName: string, 
  stylePrompt: string | undefined, 
  controller: ReadableStreamDefaultController
) {
  const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) throw new Error('CONFIG_ERROR: Missing Google API Key');

  const modelId = 'gemini-3.1-flash-tts-preview';
  const voice = (voiceName === 'Aoide' || voiceName === 'Aoede') ? 'Aoide' : 'Kore';
  const prompt = stylePrompt ? `${stylePrompt}\n\n${inputText}` : inputText;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
        }
      }
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('>>>> GOOGLE_STREAM_ERROR:', err);
    throw new Error(`Google API Stream Error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Failed to get reader from Google response');

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // The stream is basically a series of JSON objects.
    // They are often wrapped in [ ... ] or separated by commas.
    // We look for parts that look like candidates and extract audio.
    const chunks = buffer.split(/\r?\n/);
    buffer = chunks.pop() || "";

    for (const chunk of chunks) {
        const cleaned = chunk.trim().replace(/^,/, '').replace(/^\[/, '').replace(/\]$/, '');
        if (!cleaned) continue;

        try {
            const json = JSON.parse(cleaned);
            const base64Audio = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const raw = atob(base64Audio);
                const bytes = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
                
                // Gemini returns 24kHz usually, but we want 16kHz for consistency if needed.
                // For simplicity in the stream, we just send what we get and rely on the header.
                // Wait! If the header says 16kHz, we MUST send 16kHz.
                // Let's stick to 24kHz in the header for maximum quality if Google sends 24.
                controller.enqueue(bytes);
            }
        } catch (e) {
            // Partial JSON or unexpected format, keep in buffer
            buffer = chunk + "\n" + buffer;
            break;
        }
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const svcClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const url = new URL(req.url);

    if (req.method === 'GET') {
      const tokenId = url.searchParams.get('token_id');
      if (!tokenId) return new Response('Missing token_id', { status: 400, headers: corsHeaders });

      const { data: tokenData, error: tokenError } = await svcClient
        .from('tts_tokens')
        .delete()
        .eq('id', tokenId)
        .select()
        .single();

      if (tokenError || !tokenData) return new Response('Invalid or expired token', { status: 401, headers: corsHeaders });

      const { text, voiceName, stylePrompt } = tokenData.payload;
      
      // STREAMING PIPELINE
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // 1. Send WAV Header (Setting to 24kHz since Gemini native is usually 24kHz)
            const header = createWavHeader(0); // 0 triggers the 0x7FFFFFFF hack inside createWavHeader
            // UPDATE: Let's use 24kHz sample rate in the header
            const view = new DataView(header.buffer);
            view.setUint32(24, 24000, true); // Sample Rate
            view.setUint32(28, 24000 * 1 * 2, true); // Byte Rate
            controller.enqueue(header);

            // 2. Start Gemini Stream
            await streamGemini(text, voiceName, stylePrompt, controller);
            
            controller.close();
          } catch (err) {
            console.error('>>>> STREAM_RUNTIME_ERROR:', err);
            controller.error(err);
          }
        }
      });

      return new Response(stream, { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'audio/wav',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        } 
      });
    }

    // Handshake remain same
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response('Unauthorized', { status: 401 });
    const payload = await req.json();
    const { text } = payload;
    if (!text) return new Response('Missing text', { status: 400, headers: corsHeaders });

    const { data: { user }, error: authError } = await (createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!)).auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response('Invalid auth', { status: 401 });

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
    const msg = (err as Error).message;
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
  }
});
