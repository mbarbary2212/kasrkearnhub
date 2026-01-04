import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

/**
 * Progress Tracking System
 * 
 * INTERNAL TERMINOLOGY:
 * - "Learning Unit" = Chapter or Lecture (never exposed to users)
 * - "Item" = Any practice-based interaction (MCQ, OSCE, Essay, Case Scenario, Matching)
 * 
 * COMPLETION RULES:
 * - MCQ: Answer submitted and feedback shown
 * - OSCE: All T/F statements submitted
 * - Short Answer (Essay): Model answer revealed OR marked as done
 * - Case Scenario: Full solution viewed
 * - Matching: Interaction completed
 * 
 * PROGRESS CALCULATION:
 * Progress (%) = (Completed Items / Total Items) × 100
 * This reflects COVERAGE only, not performance or grades.
 */

// Content types that can be tracked for progress
export type TrackableContentType = 
  | 'lecture' 
  | 'resource' 
  | 'mcq' 
  | 'essay' 
  | 'practical' 
  | 'osce' 
  | 'case_scenario' 
  | 'matching';

interface ChapterProgressData {
  totalProgress: number;
  resourcesProgress: number;
  practiceProgress: number;
  completedItems: number;
  totalItems: number;
  resourcesCompleted: number;
  resourcesTotal: number;
  practiceCompleted: number;
  practiceTotal: number;
}

export function useChapterProgress(chapterId?: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['chapter-progress', chapterId, user?.id],
    queryFn: async (): Promise<ChapterProgressData> => {
      if (!user?.id || !chapterId) {
        return {
          totalProgress: 0,
          resourcesProgress: 0,
          practiceProgress: 0,
          completedItems: 0,
          totalItems: 0,
          resourcesCompleted: 0,
          resourcesTotal: 0,
          practiceCompleted: 0,
          practiceTotal: 0,
        };
      }

      // Fetch all content items for this learning unit (chapter)
      const [
        lecturesRes,
        resourcesRes,
        mcqsRes,
        essaysRes,
        practicalsRes,
        caseScenariosRes,
        osceRes,
        matchingRes,
        userProgressRes,
      ] = await Promise.all([
        supabase.from('lectures').select('id').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('resources').select('id').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('mcqs').select('id').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('essays').select('id').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('practicals').select('id').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('case_scenarios').select('id').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('osce_questions').select('id').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('matching_questions').select('id').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('user_progress').select('content_id, content_type, completed').eq('user_id', user.id),
      ]);

      // Count items by category
      const lectureIds = lecturesRes.data?.map(l => l.id) || [];
      const resourceIds = resourcesRes.data?.map(r => r.id) || [];
      const mcqIds = mcqsRes.data?.map(m => m.id) || [];
      const essayIds = essaysRes.data?.map(e => e.id) || [];
      const practicalIds = practicalsRes.data?.map(p => p.id) || [];
      const caseIds = caseScenariosRes.data?.map(c => c.id) || [];
      const osceIds = osceRes.data?.map(o => o.id) || [];
      const matchingIds = matchingRes.data?.map(m => m.id) || [];

      // Resources = lectures + documents (informational, not tracked for progress)
      const allResourceIds = [...lectureIds, ...resourceIds];
      // Practice = all interactive items (MCQs, Essays, Practicals, Cases, OSCE, Matching)
      const allPracticeIds = [...mcqIds, ...essayIds, ...practicalIds, ...caseIds, ...osceIds, ...matchingIds];

      const resourcesTotal = allResourceIds.length;
      const practiceTotal = allPracticeIds.length;
      const totalItems = resourcesTotal + practiceTotal;

      // Count completed items
      const completedContentIds = new Set(
        userProgressRes.data?.filter(p => p.completed).map(p => p.content_id) || []
      );

      const resourcesCompleted = allResourceIds.filter(id => completedContentIds.has(id)).length;
      const practiceCompleted = allPracticeIds.filter(id => completedContentIds.has(id)).length;
      const completedItems = resourcesCompleted + practiceCompleted;

      // Calculate percentages
      const resourcesProgress = resourcesTotal > 0 ? Math.round((resourcesCompleted / resourcesTotal) * 100) : 0;
      const practiceProgress = practiceTotal > 0 ? Math.round((practiceCompleted / practiceTotal) * 100) : 0;
      
      // Progress is driven by practice items (coverage of completed interactions)
      // Resources are informational only and don't affect the main progress score
      const totalProgress = practiceProgress;

      return {
        totalProgress,
        resourcesProgress,
        practiceProgress,
        completedItems: practiceCompleted,
        totalItems: practiceTotal,
        resourcesCompleted,
        resourcesTotal,
        practiceCompleted,
        practiceTotal,
      };
    },
    enabled: !!chapterId && !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
  });
}

/**
 * Hook to mark an item as completed
 * 
 * Call this when:
 * - MCQ: After answer is submitted and feedback shown
 * - OSCE: After all T/F statements submitted
 * - Essay: When "Show Answer" clicked or "Mark as Done"
 * - Case Scenario: When full solution viewed
 * - Matching: When interaction completed
 */
export function useMarkItemComplete() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const markComplete = async (
    contentId: string, 
    contentType: TrackableContentType,
    chapterId?: string
  ) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: user.id,
        content_id: contentId,
        content_type: contentType,
        completed: true,
        completed_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,content_type,content_id',
      });

    if (error) {
      console.error('Failed to mark item complete:', error);
      return;
    }

    // Invalidate progress queries to update UI immediately
    if (chapterId) {
      queryClient.invalidateQueries({ queryKey: ['chapter-progress', chapterId] });
    }
    // Also invalidate the general progress query
    queryClient.invalidateQueries({ queryKey: ['chapter-progress'] });
  };

  return { markComplete };
}

/**
 * Hook to check if a specific item is completed
 */
export function useItemCompletionStatus(contentId?: string, contentType?: TrackableContentType) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['item-completion', contentId, contentType, user?.id],
    queryFn: async () => {
      if (!user?.id || !contentId || !contentType) return false;

      const { data, error } = await supabase
        .from('user_progress')
        .select('completed')
        .eq('user_id', user.id)
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .maybeSingle();

      if (error) {
        console.error('Failed to check completion status:', error);
        return false;
      }

      return data?.completed ?? false;
    },
    enabled: !!contentId && !!contentType && !!user?.id,
    staleTime: 30000,
  });
}
