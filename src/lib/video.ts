/**
 * Video utility functions for YouTube, Google Drive, and Vimeo
 */

export type VideoSource = 'youtube' | 'googledrive' | 'vimeo' | 'unknown';

export interface VideoInfo {
  source: VideoSource;
  id: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
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
 * Extract Vimeo video ID from various URL formats
 */
export function extractVimeoId(url: string | null | undefined): string | null {
  if (!url) return null;
  
  const patterns = [
    // https://vimeo.com/VIDEO_ID
    /vimeo\.com\/(\d+)/,
    // https://player.vimeo.com/video/VIDEO_ID
    /player\.vimeo\.com\/video\/(\d+)/,
    // https://vimeo.com/channels/CHANNEL/VIDEO_ID
    /vimeo\.com\/channels\/[^\/]+\/(\d+)/,
    // https://vimeo.com/groups/GROUP/videos/VIDEO_ID
    /vimeo\.com\/groups\/[^\/]+\/videos\/(\d+)/,
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
 * Detect the video source from URL
 */
export function detectVideoSource(url: string | null | undefined): VideoSource {
  if (!url) return 'unknown';
  
  if (extractYouTubeId(url)) return 'youtube';
  if (extractGoogleDriveId(url)) return 'googledrive';
  if (extractVimeoId(url)) return 'vimeo';
  
  return 'unknown';
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
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'mq' | 'hq' | 'sd' | 'maxres' = 'hq'): string {
  const qualityMap = {
    default: 'default',
    mq: 'mqdefault',
    hq: 'hqdefault',
    sd: 'sddefault',
    maxres: 'maxresdefault',
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
 * Get Vimeo embed URL from video ID
 */
export function getVimeoEmbedUrl(videoId: string): string {
  return `https://player.vimeo.com/video/${videoId}`;
}

/**
 * Get Vimeo thumbnail URL from video ID
 * Uses vumbnail.com service for easy thumbnail access
 */
export function getVimeoThumbnail(videoId: string): string {
  return `https://vumbnail.com/${videoId}.jpg`;
}

/**
 * Get complete video info from URL
 */
export function getVideoInfo(url: string | null | undefined): VideoInfo {
  const source = detectVideoSource(url);
  
  if (source === 'youtube') {
    const id = extractYouTubeId(url);
    return {
      source,
      id,
      embedUrl: id ? getYouTubeEmbedUrl(id) : null,
      thumbnailUrl: id ? getYouTubeThumbnail(id) : null,
    };
  }
  
  if (source === 'googledrive') {
    const id = extractGoogleDriveId(url);
    return {
      source,
      id,
      embedUrl: id ? getGoogleDriveEmbedUrl(id) : null,
      thumbnailUrl: id ? getGoogleDriveThumbnail(id) : null,
    };
  }
  
  if (source === 'vimeo') {
    const id = extractVimeoId(url);
    return {
      source,
      id,
      embedUrl: id ? getVimeoEmbedUrl(id) : null,
      thumbnailUrl: id ? getVimeoThumbnail(id) : null,
    };
  }
  
  return {
    source: 'unknown',
    id: null,
    embedUrl: null,
    thumbnailUrl: null,
  };
}

/**
 * Check if a URL is a valid video URL (YouTube or Google Drive)
 */
export function isValidVideoUrl(url: string | null | undefined): boolean {
  return detectVideoSource(url) !== 'unknown';
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
