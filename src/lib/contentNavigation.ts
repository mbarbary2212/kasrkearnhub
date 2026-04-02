/**
 * Content Deep-Link Navigation Utility
 * Builds URLs to navigate directly to specific content items within chapters.
 */

export type ContentMaterialType = 'mcq' | 'sba' | 'osce' | 'essay' | 'matching' | 'true_false' | 'flashcard' | 'case' | 'video' | 'lecture' | 'algorithm';
export type ContentNavigationSource = 'inbox' | 'analytics' | 'feedback';

interface ContentLinkParams {
  moduleId: string;
  chapterId?: string | null;
  materialType?: ContentMaterialType;
  materialId?: string;
  from?: ContentNavigationSource;
}

const MATERIAL_SECTION_MAP: Record<ContentMaterialType, { section: string; subtab: string }> = {
  mcq:        { section: 'practice', subtab: 'mcqs' },
  sba:        { section: 'practice', subtab: 'sbas' },
  osce:       { section: 'practice', subtab: 'osce' },
  essay:      { section: 'practice', subtab: 'essays' },
  matching:   { section: 'practice', subtab: 'matching' },
  true_false: { section: 'practice', subtab: 'truefalse' },
  flashcard:  { section: 'resources', subtab: 'flashcards' },
  case:       { section: 'interactive', subtab: 'cases' },
  video:      { section: 'resources', subtab: 'lectures' },
  lecture:    { section: 'resources', subtab: 'lectures' },
  algorithm:  { section: 'interactive', subtab: 'algorithms' },
};

/**
 * Builds a URL to navigate to a specific content item.
 * Falls back gracefully when some IDs are missing.
 */
export function buildContentLink(params: ContentLinkParams): string {
  const { moduleId, chapterId, materialType, materialId, from } = params;

  // If no chapter, link to module page
  if (!chapterId) {
    return `/module/${moduleId}`;
  }

  const basePath = `/module/${moduleId}/chapter/${chapterId}`;
  const searchParams = new URLSearchParams();

  // Add section + subtab if we know the material type
  if (materialType && MATERIAL_SECTION_MAP[materialType]) {
    const mapping = MATERIAL_SECTION_MAP[materialType];
    searchParams.set('section', mapping.section);
    searchParams.set('subtab', mapping.subtab);
  }

  // Add highlight for the specific item
  if (materialId) {
    searchParams.set('highlight', materialId);
  }

  // Add source context for the banner
  if (from) {
    searchParams.set('from', from);
  }

  const qs = searchParams.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Returns the back-link path for a given source.
 */
export function getBackLink(from: ContentNavigationSource | string): { path: string; label: string } {
  switch (from) {
    case 'inbox':
      return { path: '/admin/inbox', label: 'Back to Inbox' };
    case 'analytics':
      return { path: '/admin?tab=analytics', label: 'Back to Analytics' };
    default:
      return { path: '/admin', label: 'Back to Admin' };
  }
}

/**
 * Returns a display label for the source context.
 */
export function getSourceLabel(from: ContentNavigationSource | string): string {
  switch (from) {
    case 'inbox':
      return 'Opened from Inbox';
    case 'analytics':
      return 'Opened from Analytics';
    default:
      return 'Opened from Admin';
  }
}
