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

// ─── Action: delete ────────────────────────────────────────────────────────────

async function handleDelete(
  supabase: any,
  body: { youtube_video_id: string }
): Promise<Response> {
  const { youtube_video_id } = body;

  if (!youtube_video_id) {
    return new Response(
      JSON.stringify({ error: "Missing required field: youtube_video_id" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const accessToken = await getAccessToken();

  const deleteRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?id=${encodeURIComponent(youtube_video_id)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!deleteRes.ok && deleteRes.status !== 404) {
    const errText = await deleteRes.text();
    throw new Error(`YouTube delete failed (${deleteRes.status}): ${errText}`);
  }

  console.log(`youtube-upload: deleted YouTube video ${youtube_video_id}`);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ─── Action: upload ────────────────────────────────────────────────────────────
// Downloads file from Supabase Storage and uploads it to YouTube server-side

const encodeDoctor = (d: string | undefined) =>
  (d || "general").toLowerCase().replace(/[^a-z0-9]/g, "_");

async function handleUpload(
  supabase: any,
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

  // Step 1: Get a signed URL and stream file metadata from Supabase Storage
  // (avoids loading the entire file into memory, which hits the 150MB edge function limit)
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("video-uploads")
    .createSignedUrl(storage_path, 600);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    throw new Error(`Failed to get signed URL: ${signedUrlError?.message}`);
  }

  // Fetch just the headers first to get file size without downloading
  const headRes = await fetch(signedUrlData.signedUrl, { method: "HEAD" });
  if (!headRes.ok) throw new Error(`Failed to stat file in storage: ${headRes.status}`);

  const fileSize = parseInt(headRes.headers.get("content-length") ?? "0", 10);
  const contentType = headRes.headers.get("content-type") || "video/mp4";

  if (!fileSize) throw new Error("Could not determine file size from storage");

  console.log(`youtube-upload: file is ${fileSize} bytes, type ${contentType}`);

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

  // Step 3: Stream file directly from Supabase Storage to YouTube (no in-memory buffering)
  const storageStream = await fetch(signedUrlData.signedUrl);
  if (!storageStream.ok) throw new Error(`Failed to fetch file from storage: ${storageStream.status}`);

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileSize),
    },
    body: storageStream.body,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`YouTube upload failed: ${errText}`);
  }

  const videoData = await uploadRes.json();
  const youtubeVideoId = videoData?.id;
  if (!youtubeVideoId) throw new Error("YouTube did not return a video ID");

  console.log(`youtube-upload: uploaded video ${youtubeVideoId}`);

  // Step 4: Handle playlist — one playlist per chapter+doctor combination
  // Playlist name format: Module › Doctor › Chapter
  const playlistKey = `yt_pl_${chapter_id}_${encodeDoctor(doctor)}`;
  let playlistId: string | null = null;

  const { data: settingRow } = await supabase
    .from("platform_settings").select("value").eq("key", playlistKey).maybeSingle();
  playlistId = settingRow?.value ?? null;

  if (!playlistId) {
    // Fetch chapter title and module name from DB
    const { data: chapterData } = await supabase
      .from("module_chapters")
      .select("title, module_id, modules(name)")
      .eq("id", chapter_id)
      .single();

    const chapterTitle = chapterData?.title ?? "Unnamed Chapter";
    // modules may be an array or object depending on Supabase join shape
    const rawModules = (chapterData as { modules?: { name: string } | { name: string }[] } | null)?.modules;
    const moduleName: string = Array.isArray(rawModules)
      ? (rawModules[0]?.name ?? "Unnamed Module")
      : (rawModules?.name ?? "Unnamed Module");
    const moduleCode = moduleName.split(":")[0].trim();
    const doctorLabel = doctor || "General";
    // Format: Module › Doctor › Chapter
    const playlistTitle = `${moduleCode} \u203a ${doctorLabel} \u203a ${chapterTitle}`;

    const createRes = await fetch("https://www.googleapis.com/youtube/v3/playlists?part=snippet,status", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ snippet: { title: playlistTitle }, status: { privacyStatus: "unlisted" } }),
    });

    if (createRes.ok) {
      const playlistData = await createRes.json();
      playlistId = playlistData.id;
      await supabase.from("platform_settings").upsert(
        [{ key: playlistKey, value: playlistId, updated_at: new Date().toISOString() }],
        { onConflict: "key" }
      );
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
    if (action === "delete") return await handleDelete(supabase, body);

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
