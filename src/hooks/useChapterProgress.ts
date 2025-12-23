import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

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

      // Fetch all content items for this chapter
      const [
        lecturesRes,
        resourcesRes,
        mcqsRes,
        essaysRes,
        practicalsRes,
        caseScenariosRes,
        userProgressRes,
      ] = await Promise.all([
        supabase.from('lectures').select('id').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('resources').select('id').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('mcqs').select('id').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('essays').select('id').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('practicals').select('id').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('case_scenarios').select('id').eq('chapter_id', chapterId).eq('is_deleted', false),
        supabase.from('user_progress').select('content_id, content_type, completed').eq('user_id', user.id),
      ]);

      // Count items by category
      const lectureIds = lecturesRes.data?.map(l => l.id) || [];
      const resourceIds = resourcesRes.data?.map(r => r.id) || [];
      const mcqIds = mcqsRes.data?.map(m => m.id) || [];
      const essayIds = essaysRes.data?.map(e => e.id) || [];
      const practicalIds = practicalsRes.data?.map(p => p.id) || [];
      const caseIds = caseScenariosRes.data?.map(c => c.id) || [];

      // Resources = lectures + documents
      const allResourceIds = [...lectureIds, ...resourceIds];
      // Practice = mcqs + essays + practicals + cases
      const allPracticeIds = [...mcqIds, ...essayIds, ...practicalIds, ...caseIds];

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
      
      // Phase 1: Use practice progress as the main chapter progress driver
      // Resources are informational only and don't affect the main progress score
      const totalProgress = practiceProgress;

      return {
        totalProgress,
        resourcesProgress,
        practiceProgress,
        completedItems: practiceCompleted, // Focus on practice completions
        totalItems: practiceTotal, // Focus on practice items
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

// Hook to mark an item as completed
export function useMarkItemComplete() {
  const { user } = useAuthContext();

  const markComplete = async (contentId: string, contentType: 'lecture' | 'resource' | 'mcq' | 'essay' | 'practical') => {
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
    }
  };

  return { markComplete };
}
