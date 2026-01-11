/**
 * Video utility functions for YouTube, Google Drive, and Vimeo
 */

export type VideoSource = "youtube" | "googledrive" | "vimeo" | "unknown";

export interface VideoInfo {
  source: VideoSource;
  id: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  vimeoHash?: string | null;
}

/**
 * Normalize video input - extracts URL from iframe embed codes or returns clean URL
 * Handles cases where users paste full iframe embed code instead of just the URL
 */
export function normalizeVideoInput(input: string | null | undefined): string | null {
  if (!input) return null;

  // Check if input contains an iframe tag
  if (input.includes("<iframe")) {
    // Extract src attribute from iframe
    const srcMatch = input.match(/src=["']([^"']+)["']/);
    if (srcMatch && srcMatch[1]) {
      // Decode HTML entities like &amp; to &
      return srcMatch[1].replace(/&amp;/g, "&");
    }
  }

  // Return trimmed input as-is (it might be a direct URL)
  return input.trim();
}

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;

  const patterns = [
    // Standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // Short URL: https://youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // Embed URL: https://www.youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // Shorts URL: https://www.youtube.com/shorts/VIDEO_ID
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract Google Drive file ID from various URL formats
 */
export function extractGoogleDriveId(url: string | null | undefined): string | null {
  if (!url) return null;

  const patterns = [
    // https://drive.google.com/file/d/FILE_ID/view
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    // https://drive.google.com/open?id=FILE_ID
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    // https://drive.google.com/uc?id=FILE_ID
    /drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/,
    // https://drive.google.com/uc?export=download&id=FILE_ID
    /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
/**
 * Vimeo video info with optional privacy hash for unlisted videos
 */
export interface VimeoVideoInfo {
  id: string;
  hash: string | null;
}

/**
 * Extract Vimeo video ID from various URL formats
 */
export function extractVimeoId(url: string | null | undefined): string | null {
  const info = extractVimeoIdAndHash(url);
  return info?.id || null;
}

/**
 * Extract Vimeo video ID AND privacy hash from various URL formats
 * The privacy hash (?h=xxx or /xxx after video ID) is required for unlisted/private videos
 */
export function extractVimeoIdAndHash(url: string | null | undefined): VimeoVideoInfo | null {
  if (!url) return null;

  const u = url.trim();

  // Match ID first from common Vimeo/player URLs
  const idMatch = u.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
  if (idMatch?.[1]) {
    const id = idMatch[1];

    // Prefer reading ?h= from query params reliably
    let hash: string | null = null;
    try {
      const parsed = new URL(u);
      hash = parsed.searchParams.get("h");
    } catch {
      const hMatch = u.match(/[?&]h=([a-zA-Z0-9]+)/);
      hash = hMatch?.[1] || null;
    }

    // If no query hash, try the /id/hash path format
    if (!hash) hash = extractHashFromPath(u, id);

    return { id, hash: hash || null };
  }

  // Channels/groups format
  const channelMatch = u.match(/vimeo\.com\/(?:channels|groups)\/[^\/]+\/(?:videos\/)?(\d+)/);
  if (channelMatch?.[1]) {
    return { id: channelMatch[1], hash: null };
  }

  // Fallback: any vimeo.com/<digits>
  const anyMatch = u.match(/vimeo\.com\/(\d+)/);
  if (anyMatch?.[1]) {
    return { id: anyMatch[1], hash: extractHashFromPath(u, anyMatch[1]) };
  }

  return null;
}

/**
 * Extract privacy hash from path format: vimeo.com/123456/abc123
 */
function extractHashFromPath(url: string, videoId: string): string | null {
  // Look for pattern: /VIDEO_ID/HASH where HASH is alphanumeric
  const pathMatch = url.match(new RegExp(`/${videoId}/([a-zA-Z0-9]+)(?:[?#]|$)`));
  if (pathMatch && pathMatch[1]) {
    // Make sure it's not another path segment like 'video' or 'embed'
    const hash = pathMatch[1];
    if (!["video", "embed", "player", "channels", "groups"].includes(hash.toLowerCase())) {
      return hash;
    }
  }
  return null;
}

/**
 * Detect the video source from URL
 */
export function detectVideoSource(url: string | null | undefined): VideoSource {
  if (!url) return "unknown";

  if (extractYouTubeId(url)) return "youtube";
  if (extractGoogleDriveId(url)) return "googledrive";
  if (extractVimeoId(url)) return "vimeo";

  return "unknown";
}

/**
 * Get YouTube embed URL from video ID
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Get Google Drive embed URL from file ID
 */
export function getGoogleDriveEmbedUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Get YouTube thumbnail URL from video ID
 */
export function getYouTubeThumbnail(
  videoId: string,
  quality: "default" | "mq" | "hq" | "sd" | "maxres" = "hq",
): string {
  const qualityMap = {
    default: "default",
    mq: "mqdefault",
    hq: "hqdefault",
    sd: "sddefault",
    maxres: "maxresdefault",
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Get Google Drive thumbnail URL from file ID
 * Note: This returns a generic preview thumbnail
 */
export function getGoogleDriveThumbnail(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w640`;
}

/**
 * Get Vimeo embed URL from video ID with optional privacy hash
 * @param videoId - The Vimeo video ID
 * @param hash - Optional privacy hash for unlisted videos
 * @param options - Additional embed options
 */
export function getVimeoEmbedUrl(
  videoId: string,
  hash?: string | null,
  options?: { autoplay?: boolean; muted?: boolean },
): string {
  const params = new URLSearchParams();

  // Add privacy hash first if present (required for unlisted videos)
  if (hash) {
    params.set("h", hash);
  }

  // Add playback options
  // CRITICAL: Always add muted=1 when autoplay=1 to comply with browser policies
  if (options?.autoplay) {
    params.set("autoplay", "1");
    params.set("muted", "1");
  } else if (options?.muted) {
    params.set("muted", "1");
  }

  // Always add these for better mobile support
  params.set("playsinline", "1");
  params.set("dnt", "1"); // Do not track

  const queryString = params.toString();
  return `https://player.vimeo.com/video/${videoId}${queryString ? `?${queryString}` : ""}`;
}

/**
 * Get Vimeo thumbnail URL from video ID
 * Uses vumbnail.com service for easy thumbnail access
 */
export function getVimeoThumbnail(videoId: string): string {
  return `https://vumbnail.com/${videoId}.jpg`;
}

/**
 * Get complete video info from URL or iframe embed code
 * For Vimeo, preserves query parameters from embed URLs to support private videos
 */
export function getVideoInfo(input: string | null | undefined): VideoInfo {
  // Normalize input first to handle iframe embed codes
  const url = normalizeVideoInput(input);
  const source = detectVideoSource(url);

  if (source === "youtube") {
    const id = extractYouTubeId(url);
    return {
      source,
      id,
      embedUrl: id ? getYouTubeEmbedUrl(id) : null,
      thumbnailUrl: id ? getYouTubeThumbnail(id) : null,
    };
  }

  if (source === "googledrive") {
    const id = extractGoogleDriveId(url);
    return {
      source,
      id,
      embedUrl: id ? getGoogleDriveEmbedUrl(id) : null,
      thumbnailUrl: id ? getGoogleDriveThumbnail(id) : null,
    };
  }

  if (source === "vimeo") {
    const vimeoInfo = extractVimeoIdAndHash(url);
    const id = vimeoInfo?.id || null;
    const hash = vimeoInfo?.hash || null;

    // Build embed URL with privacy hash if present
    const embedUrl = id ? getVimeoEmbedUrl(id, hash) : null;

    return {
      source,
      id,
      embedUrl,
      thumbnailUrl: id ? getVimeoThumbnail(id) : null,
      // Expose hash for components that need it
      vimeoHash: hash,
    };
  }

  return {
    source: "unknown",
    id: null,
    embedUrl: null,
    thumbnailUrl: null,
  };
}

/**
 * Check if a URL is a valid video URL (YouTube, Google Drive, or Vimeo)
 * Also handles iframe embed codes
 */
export function isValidVideoUrl(input: string | null | undefined): boolean {
  const url = normalizeVideoInput(input);
  return detectVideoSource(url) !== "unknown";
}

/**
 * Check if a URL is a valid YouTube URL
 */
export function isValidYouTubeUrl(url: string | null | undefined): boolean {
  return extractYouTubeId(url) !== null;
}

/**
 * Check if a URL is a valid Google Drive URL
 */
export function isValidGoogleDriveUrl(url: string | null | undefined): boolean {
  return extractGoogleDriveId(url) !== null;
}

/**
 * Check if a URL is a valid Vimeo URL
 */
export function isValidVimeoUrl(url: string | null | undefined): boolean {
  return extractVimeoId(url) !== null;
}
