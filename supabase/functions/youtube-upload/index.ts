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

// ─── Action: upload ────────────────────────────────────────────────────────────
// Downloads file from Supabase Storage and uploads it to YouTube server-side

async function handleUpload(
  supabase: ReturnType<typeof createClient>,
  body: {
    storage_path: string;
    title: string;
    description?: string;
    privacy?: string;
    chapter_id: string;
    module_id?: string;
    doctor?: string;
  }
): Promise<Response> {
  const { storage_path, title, description, privacy, chapter_id, module_id, doctor } = body;

  if (!storage_path || !title || !chapter_id) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: storage_path, title, chapter_id" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const accessToken = await getAccessToken();

  // Step 1: Download file from Supabase Storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from("video-uploads")
    .download(storage_path);

  if (downloadError || !fileData) {
    throw new Error(`Failed to download from storage: ${downloadError?.message}`);
  }

  const fileBuffer = await fileData.arrayBuffer();
  const fileSize = fileBuffer.byteLength;
  const contentType = fileData.type || "video/mp4";

  console.log(`youtube-upload: downloaded ${fileSize} bytes from storage`);

  // Step 2: Initiate YouTube resumable upload
  const initiateRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": contentType,
        "X-Upload-Content-Length": String(fileSize),
      },
      body: JSON.stringify({
        snippet: {
          title,
          description: description ?? "",
          categoryId: "27",
        },
        status: { privacyStatus: privacy ?? "unlisted" },
      }),
    }
  );

  if (!initiateRes.ok) {
    const errText = await initiateRes.text();
    throw new Error(`Failed to initiate YouTube upload: ${errText}`);
  }

  const uploadUrl = initiateRes.headers.get("Location");
  if (!uploadUrl) throw new Error("No Location header returned from YouTube");

  // Step 3: Upload file to YouTube
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileSize),
    },
    body: fileBuffer,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`YouTube upload failed: ${errText}`);
  }

  const videoData = await uploadRes.json();
  const youtubeVideoId = videoData?.id;
  if (!youtubeVideoId) throw new Error("YouTube did not return a video ID");

  console.log(`youtube-upload: uploaded video ${youtubeVideoId}`);

  // Step 4: Handle playlist
  if (module_id) {
    const playlistKey = `youtube_playlist_${module_id}`;
    let playlistId: string | null = null;

    const { data: settingRow } = await supabase
      .from("platform_settings").select("value").eq("key", playlistKey).maybeSingle();
    playlistId = settingRow?.value ?? null;

    if (!playlistId) {
      const { data: moduleData } = await supabase.from("modules").select("name").eq("id", module_id).single();
      const moduleName = moduleData?.name ?? "Unnamed Module";

      const createRes = await fetch("https://www.googleapis.com/youtube/v3/playlists?part=snippet,status", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ snippet: { title: moduleName }, status: { privacyStatus: "unlisted" } }),
      });

      if (createRes.ok) {
        const playlistData = await createRes.json();
        playlistId = playlistData.id;
        await supabase.from("platform_settings").upsert(
          [{ key: playlistKey, value: playlistId, updated_at: new Date().toISOString() }],
          { onConflict: "key" }
        );
        await supabase.from("modules").update({ youtube_playlist_id: playlistId }).eq("id", module_id);
      }
    }

    if (playlistId) {
      await fetch("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          snippet: { playlistId, resourceId: { kind: "youtube#video", videoId: youtubeVideoId } },
        }),
      });
    }
  }

  // Step 5: Create lecture record
  const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;

  const { error: insertError } = await supabase.from("lectures").insert({
    title,
    description: doctor ?? "General",
    video_url: youtubeUrl,
    youtube_video_id: youtubeVideoId,
    chapter_id,
    module_id: module_id ?? null,
  });

  if (insertError) throw insertError;

  // Step 6: Delete temp file from storage
  await supabase.storage.from("video-uploads").remove([storage_path]);

  console.log(`youtube-upload: done — lecture created for video ${youtubeVideoId}`);

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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const action = body?.action;

    if (action === "upload") return await handleUpload(supabase, body);

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in youtube-upload:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
