import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const YOUTUBE_CLIENT_ID = Deno.env.get("YOUTUBE_CLIENT_ID") ?? "";
const YOUTUBE_CLIENT_SECRET = Deno.env.get("YOUTUBE_CLIENT_SECRET") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: "YouTube OAuth credentials are not configured on the server." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate the calling user's token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { code, redirect_uri } = body as { code: string; redirect_uri: string };

    if (!code || !redirect_uri) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: code, redirect_uri" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("youtube-oauth-callback: exchanging code for tokens");

    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: YOUTUBE_CLIENT_ID,
        client_secret: YOUTUBE_CLIENT_SECRET,
        redirect_uri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", tokenData);
      return new Response(
        JSON.stringify({ error: "Token exchange failed", details: tokenData }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { refresh_token, access_token, expires_in } = tokenData;

    if (!refresh_token) {
      return new Response(
        JSON.stringify({
          error: "No refresh_token returned. Ensure prompt=consent was used.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const expiresAt = Date.now() + expires_in * 1000;

    // Store tokens in platform_settings (service role bypasses RLS)
    const upserts = [
      { key: "youtube_refresh_token", value: refresh_token, updated_at: new Date().toISOString() },
      { key: "youtube_access_token", value: access_token, updated_at: new Date().toISOString() },
      {
        key: "youtube_access_token_expires_at",
        value: String(expiresAt),
        updated_at: new Date().toISOString(),
      },
    ];

    const { error: upsertError } = await supabase
      .from("platform_settings")
      .upsert(upserts, { onConflict: "key" });

    if (upsertError) {
      console.error("Failed to store tokens:", upsertError);
      throw upsertError;
    }

    console.log("youtube-oauth-callback: tokens stored successfully");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in youtube-oauth-callback:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
