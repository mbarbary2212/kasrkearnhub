/**
 * Helper function to translate RLS permission errors into user-friendly messages
 * that explain what the user can and cannot do based on their role.
 */
export function getPermissionErrorMessage(
  error: Error | unknown,
  context: {
    action: 'add' | 'edit' | 'delete';
    contentType: string;
    isModuleAdmin?: boolean;
    isTopicAdmin?: boolean;
    isChapterAdmin?: boolean;
  }
): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Check if it's a permission/RLS error
  const isPermissionError = 
    errorMessage.includes('row-level security') ||
    errorMessage.includes('permission denied') ||
    errorMessage.includes('violates row-level security policy') ||
    errorMessage.includes('new row violates') ||
    errorMessage.includes('42501') || // PostgreSQL permission denied
    errorMessage.includes('insufficient_privilege');

  if (!isPermissionError) {
    // Return original error if it's not a permission issue
    return errorMessage;
  }

  const { action, contentType, isModuleAdmin, isTopicAdmin, isChapterAdmin } = context;
  const actionText = action === 'add' ? 'add' : action === 'edit' ? 'edit' : 'delete';
  const contentTypeFriendly = getContentTypeFriendly(contentType);

  // Provide role-specific guidance
  if (isTopicAdmin) {
    return `You can only ${actionText} ${contentTypeFriendly} in topics or chapters you've been assigned to. Contact a Module Admin or Platform Admin if you need access to other areas.`;
  }

  if (isChapterAdmin) {
    return `You can only ${actionText} ${contentTypeFriendly} in chapters you've been assigned to. Contact a Module Admin or Platform Admin if you need access to other areas.`;
  }

  if (isModuleAdmin) {
    return `You can only ${actionText} ${contentTypeFriendly} in modules you've been assigned to. Contact a Platform Admin if you need access to other modules.`;
  }

  // Generic fallback
  return `You don't have permission to ${actionText} this ${contentTypeFriendly}. This content belongs to a module or topic outside your assigned area.`;
}

function getContentTypeFriendly(contentType: string): string {
  const map: Record<string, string> = {
    lecture: 'videos',
    resource: 'resources',
    mcq: 'MCQs',
    mcq_sets: 'MCQ sets',
    essay: 'short questions',
    practical: 'practicals',
    flashcard: 'flashcards',
    case_scenario: 'case scenarios',
    matching_question: 'matching questions',
    study_resource: 'study resources',
  };
  return map[contentType] || 'content';
}

/**
 * Wrapper for mutation error handlers that provides user-friendly permission messages
 */
export function createPermissionAwareErrorHandler(
  context: {
    action: 'add' | 'edit' | 'delete';
    contentType: string;
    isModuleAdmin?: boolean;
    isTopicAdmin?: boolean;
    isChapterAdmin?: boolean;
  },
  showToast: (message: string) => void
) {
  return (error: Error | unknown) => {
    const message = getPermissionErrorMessage(error, context);
    showToast(message);
  };
}
