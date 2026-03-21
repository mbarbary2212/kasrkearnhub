import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("YOUTUBE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("YOUTUBE_CLIENT_SECRET")!;
  const refreshToken = Deno.env.get("YOUTUBE_REFRESH_TOKEN")!;

  if (!refreshToken) throw new Error("YOUTUBE_REFRESH_TOKEN secret is not set");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
  return data.access_token;
}

// ─── Action: initiate ─────────────────────────────────────────────────────────

async function handleInitiate(
  body: { title: string; description: string; privacy: string }
): Promise<Response> {
  const { title, description, privacy } = body;

  if (!title) {
    return new Response(JSON.stringify({ error: "Missing required field: title" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const accessToken = await getAccessToken();

  const initiateResponse = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/*",
      },
      body: JSON.stringify({
        snippet: {
          title,
          description: description ?? "",
          categoryId: "27",
        },
        status: {
          privacyStatus: privacy ?? "unlisted",
        },
      }),
    }
  );

  if (!initiateResponse.ok) {
    const errText = await initiateResponse.text();
    console.error("YouTube initiate failed:", errText);
    return new Response(
      JSON.stringify({ error: "Failed to initiate YouTube upload", details: errText }),
      { status: initiateResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const uploadUrl = initiateResponse.headers.get("Location");
  if (!uploadUrl) {
    return new Response(
      JSON.stringify({ error: "No Location header returned from YouTube" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ upload_url: uploadUrl }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Action: finalize ─────────────────────────────────────────────────────────

async function handleFinalize(
  supabase: ReturnType<typeof createClient>,
  body: { youtube_video_id: string; lecture_id: string; module_id?: string }
): Promise<Response> {
  const { youtube_video_id, lecture_id, module_id } = body;

  if (!youtube_video_id || !lecture_id) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: youtube_video_id, lecture_id" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const accessToken = await getAccessToken();

  // ── Playlist handling ────────────────────────────────────────────────────────
  if (module_id) {
    const playlistKey = `youtube_playlist_${module_id}`;
    let playlistId: string | null = null;

    const { data: settingRow } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", playlistKey)
      .maybeSingle();

    playlistId = settingRow?.value ?? null;

    if (!playlistId) {
      const { data: moduleData } = await supabase
        .from("modules")
        .select("name")
        .eq("id", module_id)
        .single();

      const moduleName = moduleData?.name ?? "Unnamed Module";

      const createRes = await fetch(
        "https://www.googleapis.com/youtube/v3/playlists?part=snippet,status",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            snippet: { title: moduleName },
            status: { privacyStatus: "unlisted" },
          }),
        }
      );

      if (createRes.ok) {
        const playlistData = await createRes.json();
        playlistId = playlistData.id;

        await supabase
          .from("platform_settings")
          .upsert([{ key: playlistKey, value: playlistId, updated_at: new Date().toISOString() }], { onConflict: "key" });

        await supabase
          .from("modules")
          .update({ youtube_playlist_id: playlistId })
          .eq("id", module_id);
      } else {
        console.error("Failed to create YouTube playlist:", await createRes.text());
      }
    }

    if (playlistId) {
      const addRes = await fetch(
        "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            snippet: {
              playlistId,
              resourceId: { kind: "youtube#video", videoId: youtube_video_id },
            },
          }),
        }
      );
      if (!addRes.ok) console.error("Failed to add video to playlist:", await addRes.text());
    }
  }

  // ── Update lecture record ────────────────────────────────────────────────────
  const youtubeUrl = `https://www.youtube.com/watch?v=${youtube_video_id}`;

  const { error: updateError } = await supabase
    .from("lectures")
    .update({ video_url: youtubeUrl, youtube_video_id })
    .eq("id", lecture_id);

  if (updateError) throw updateError;

  return new Response(
    JSON.stringify({ success: true, youtube_url: youtubeUrl }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const action = body?.action;

    if (action === "initiate") return await handleInitiate(body);
    if (action === "finalize") return await handleFinalize(supabase, body);

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in youtube-upload:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
