/**
 * Video utility functions for YouTube and Google Drive
 * Note: Vimeo support temporarily disabled - will be rewritten
 */

export type VideoSource = "youtube" | "googledrive" | "unknown";

export interface VideoInfo {
  source: VideoSource;
  id: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
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
 * Check if URL is a Vimeo URL (for detection only, playback disabled)
 * Used to show "unsupported" message instead of treating as unknown
 */
export function isVimeoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const u = url.trim().toLowerCase();
  return u.includes('vimeo.com') || u.includes('player.vimeo.com');
}

/**
 * Detect the video source from URL
 * Note: Vimeo URLs return 'unknown' (playback temporarily disabled)
 */
export function detectVideoSource(url: string | null | undefined): VideoSource {
  if (!url) return "unknown";

  if (extractYouTubeId(url)) return "youtube";
  if (extractGoogleDriveId(url)) return "googledrive";

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
 * Get complete video info from URL or iframe embed code
 * Returns source 'unknown' for Vimeo and other unsupported sources
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

  return {
    source: "unknown",
    id: null,
    embedUrl: null,
    thumbnailUrl: null,
  };
}

/**
 * Check if a URL is a valid supported video URL (YouTube or Google Drive)
 * Also handles iframe embed codes
 * Note: Returns true for Vimeo URLs to allow saving (playback shows unsupported message)
 */
export function isValidVideoUrl(input: string | null | undefined): boolean {
  const url = normalizeVideoInput(input);
  const source = detectVideoSource(url);
  // Allow YouTube, Google Drive, and Vimeo URLs to be saved
  // Vimeo will show "unsupported" message during playback
  if (source !== "unknown") return true;
  // Also allow Vimeo URLs to be saved
  if (isVimeoUrl(url)) return true;
  return false;
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
