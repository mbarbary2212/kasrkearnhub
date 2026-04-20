import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface TestRequest {
  provider: 'lovable' | 'gemini' | 'anthropic';
  model: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as TestRequest;
    if (!body?.provider || !body?.model) {
      return new Response(
        JSON.stringify({ ok: false, error: 'provider and model are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { provider, model } = body;
    const PING = 'ping';

    if (provider === 'anthropic') {
      const key = Deno.env.get('ANTHROPIC_API_KEY');
      if (!key) {
        return new Response(JSON.stringify({ ok: false, error: 'ANTHROPIC_API_KEY not configured' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1,
          messages: [{ role: 'user', content: PING }],
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        return new Response(JSON.stringify({ ok: false, status: res.status, error: t.slice(0, 500) }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ ok: true, provider, model }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (provider === 'gemini') {
      const key = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY');
      if (!key) {
        return new Response(JSON.stringify({ ok: false, error: 'GOOGLE_API_KEY not configured' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: PING }] }],
          generationConfig: { maxOutputTokens: 1 },
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        return new Response(JSON.stringify({ ok: false, status: res.status, error: t.slice(0, 500) }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ ok: true, provider, model }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (provider === 'lovable') {
      const key = Deno.env.get('LOVABLE_API_KEY');
      if (!key) {
        return new Response(JSON.stringify({ ok: false, error: 'LOVABLE_API_KEY not configured' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: PING }],
          max_tokens: 1,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        return new Response(JSON.stringify({ ok: false, status: res.status, error: t.slice(0, 500) }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ ok: true, provider, model }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Unknown provider' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
