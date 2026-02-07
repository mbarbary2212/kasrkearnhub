/**
 * Content Container Type System
 * 
 * This module provides unified types for handling both chapter-based and topic-based
 * content in the application.
 * 
 * CRITICAL: chapterId and topicId must NEVER be mixed.
 * NEVER pass topicId into props named chapterId.
 */

/**
 * Represents either a chapter or topic container for content.
 * Every content record should reference module_id AND exactly one of: chapter_id OR topic_id.
 */
export interface ContentContainerId {
  /** Chapter ID - mutually exclusive with topicId */
  chapterId?: string;
  /** Topic ID - mutually exclusive with chapterId */
  topicId?: string;
  /** Module ID - required for both */
  moduleId: string;
}

/**
 * The type of content container
 */
export type ContainerType = 'chapter' | 'topic';

/**
 * Get the container type based on which ID is present
 */
export function getContainerType(container: ContentContainerId): ContainerType {
  return container.chapterId ? 'chapter' : 'topic';
}

/**
 * Get the container ID (whichever is present)
 */
export function getContainerId(container: ContentContainerId): string {
  return container.chapterId || container.topicId || '';
}

/**
 * Get the database column name to filter by
 */
export function getContainerColumn(container: ContentContainerId): 'chapter_id' | 'topic_id' {
  return container.chapterId ? 'chapter_id' : 'topic_id';
}

/**
 * Create a content container from separate IDs
 */
export function createContentContainer(params: {
  chapterId?: string;
  topicId?: string;
  moduleId: string;
}): ContentContainerId {
  return {
    chapterId: params.chapterId,
    topicId: params.topicId,
    moduleId: params.moduleId,
  };
}

/**
 * Validate that only one of chapterId or topicId is set
 */
export function validateContainer(container: ContentContainerId): boolean {
  const hasChapter = !!container.chapterId;
  const hasTopic = !!container.topicId;
  // Exactly one must be set (XOR)
  return (hasChapter || hasTopic) && !(hasChapter && hasTopic);
}

/**
 * Get props to pass to a component that accepts both chapterId and topicId
 */
export function getContainerProps(container: ContentContainerId): {
  chapterId?: string;
  topicId?: string;
  moduleId: string;
} {
  return {
    chapterId: container.chapterId,
    topicId: container.topicId,
    moduleId: container.moduleId,
  };
}
