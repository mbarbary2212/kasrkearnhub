import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface ChapterStatus {
  id: string;
  title: string;
  chapterNumber: number;
  bookLabel: string | null;
  moduleId: string;
  moduleName: string;
  status: 'completed' | 'in_progress' | 'not_started';
  progress: number;
  totalItems: number;
  completedItems: number;
}

export interface DashboardInsight {
  type: 'strong' | 'attention' | 'missed';
  label: string;
  detail?: string;
}

export interface SuggestedItem {
  type: 'read' | 'mcq' | 'video' | 'essay';
  title: string;
  chapterTitle?: string;
  estimatedMinutes?: number;
  chapterId?: string;
  moduleId?: string;
}

export interface DashboardData {
  // Core metrics
  examReadiness: number;
  coverageCompleted: number;
  coverageTotal: number;
  studyStreak: number;
  
  // Weekly stats
  weeklyTimeMinutes: number;
  weeklyAccuracyTrend: number; // positive or negative percentage change
  weeklyChaptersAdvanced: number;
  
  // Chapters
  chapters: ChapterStatus[];
  
  // Insights
  insights: DashboardInsight[];
  
  // Today's suggestions
  suggestions: SuggestedItem[];
}

export function useStudentDashboard() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['student-dashboard', user?.id],
    queryFn: async (): Promise<DashboardData> => {
      if (!user?.id) {
        return getEmptyDashboard();
      }

      // Fetch all data in parallel
      const [
        chaptersRes,
        modulesRes,
        userProgressRes,
        mcqsRes,
        essaysRes,
        practicalsRes,
        caseScenariosRes,
        lecturesRes,
      ] = await Promise.all([
        supabase.from('module_chapters').select('id, title, chapter_number, book_label, module_id').order('order_index'),
        supabase.from('modules').select('id, name').eq('is_published', true),
        supabase.from('user_progress').select('*').eq('user_id', user.id),
        supabase.from('mcqs').select('id, chapter_id').eq('is_deleted', false),
        supabase.from('essays').select('id, chapter_id').eq('is_deleted', false),
        supabase.from('practicals').select('id, chapter_id').eq('is_deleted', false),
        supabase.from('case_scenarios').select('id, chapter_id').eq('is_deleted', false),
        supabase.from('lectures').select('id, chapter_id, title').eq('is_deleted', false),
      ]);

      const chapters = chaptersRes.data || [];
      const modules = modulesRes.data || [];
      const userProgress = userProgressRes.data || [];
      const mcqs = mcqsRes.data || [];
      const essays = essaysRes.data || [];
      const practicals = practicalsRes.data || [];
      const caseScenarios = caseScenariosRes.data || [];
      const lectures = lecturesRes.data || [];

      // Create module lookup
      const moduleMap = new Map(modules.map(m => [m.id, m.name]));

      // Create completed content set
      const completedIds = new Set(
        userProgress.filter(p => p.completed).map(p => p.content_id)
      );

      // Calculate chapter statuses
      const chapterStatuses: ChapterStatus[] = chapters.map(chapter => {
        const chapterMcqs = mcqs.filter(m => m.chapter_id === chapter.id);
        const chapterEssays = essays.filter(e => e.chapter_id === chapter.id);
        const chapterPracticals = practicals.filter(p => p.chapter_id === chapter.id);
        const chapterCases = caseScenarios.filter(c => c.chapter_id === chapter.id);

        const practiceIds = [
          ...chapterMcqs.map(m => m.id),
          ...chapterEssays.map(e => e.id),
          ...chapterPracticals.map(p => p.id),
          ...chapterCases.map(c => c.id),
        ];

        const totalItems = practiceIds.length;
        const completedItems = practiceIds.filter(id => completedIds.has(id)).length;
        const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        let status: 'completed' | 'in_progress' | 'not_started' = 'not_started';
        if (progress === 100 && totalItems > 0) {
          status = 'completed';
        } else if (completedItems > 0) {
          status = 'in_progress';
        }

        return {
          id: chapter.id,
          title: chapter.title,
          chapterNumber: chapter.chapter_number,
          bookLabel: chapter.book_label,
          moduleId: chapter.module_id,
          moduleName: moduleMap.get(chapter.module_id) || 'Unknown Module',
          status,
          progress,
          totalItems,
          completedItems,
        };
      });

      // Calculate overall metrics
      const chaptersWithContent = chapterStatuses.filter(c => c.totalItems > 0);
      const completedChapters = chaptersWithContent.filter(c => c.status === 'completed').length;
      const totalChapters = chaptersWithContent.length;

      // Exam readiness: weighted average of completed chapters
      const examReadiness = totalChapters > 0 
        ? Math.round((completedChapters / totalChapters) * 100) 
        : 0;

      // Calculate study streak (days with activity in user_progress)
      const studyStreak = calculateStudyStreak(userProgress);

      // Calculate weekly stats
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklyProgress = userProgress.filter(p => 
        p.completed_at && new Date(p.completed_at) >= weekAgo
      );
      
      // Estimate time based on completed items (rough estimate: 5 min per item)
      const weeklyTimeMinutes = weeklyProgress.length * 5;
      
      // Count unique chapters advanced this week
      const weeklyChaptersAdvanced = new Set(
        weeklyProgress
          .map(p => {
            const mcq = mcqs.find(m => m.id === p.content_id);
            if (mcq) return mcq.chapter_id;
            const essay = essays.find(e => e.id === p.content_id);
            if (essay) return essay.chapter_id;
            const practical = practicals.find(pr => pr.id === p.content_id);
            if (practical) return practical.chapter_id;
            const cs = caseScenarios.find(c => c.id === p.content_id);
            if (cs) return cs.chapter_id;
            return null;
          })
          .filter(Boolean)
      ).size;

      // Generate insights
      const insights = generateInsights(chapterStatuses);

      // Generate suggestions (book-first approach)
      const suggestions = generateSuggestions(chapterStatuses, lectures);

      return {
        examReadiness,
        coverageCompleted: completedChapters,
        coverageTotal: totalChapters,
        studyStreak,
        weeklyTimeMinutes,
        weeklyAccuracyTrend: 0, // Would need MCQ attempt data for real accuracy
        weeklyChaptersAdvanced,
        chapters: chapterStatuses,
        insights,
        suggestions,
      };
    },
    enabled: !!user?.id,
    staleTime: 60000, // Cache for 1 minute
  });
}

function getEmptyDashboard(): DashboardData {
  return {
    examReadiness: 0,
    coverageCompleted: 0,
    coverageTotal: 0,
    studyStreak: 0,
    weeklyTimeMinutes: 0,
    weeklyAccuracyTrend: 0,
    weeklyChaptersAdvanced: 0,
    chapters: [],
    insights: [],
    suggestions: [],
  };
}

function calculateStudyStreak(userProgress: { completed_at: string | null }[]): number {
  if (userProgress.length === 0) return 0;

  // Get unique dates with activity
  const activityDates = new Set(
    userProgress
      .filter(p => p.completed_at)
      .map(p => new Date(p.completed_at!).toDateString())
  );

  if (activityDates.size === 0) return 0;

  // Count consecutive days from today backwards
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    
    if (activityDates.has(checkDate.toDateString())) {
      streak++;
    } else if (i > 0) {
      // Allow gap for today (user might not have studied yet today)
      break;
    }
  }

  return streak;
}

function generateInsights(chapters: ChapterStatus[]): DashboardInsight[] {
  const insights: DashboardInsight[] = [];

  // Strong areas: completed chapters
  const completedChapters = chapters.filter(c => c.status === 'completed');
  if (completedChapters.length > 0) {
    const recentCompleted = completedChapters.slice(0, 3);
    recentCompleted.forEach(ch => {
      insights.push({
        type: 'strong',
        label: ch.title,
        detail: ch.moduleName,
      });
    });
  }

  // Needs attention: in-progress chapters with low progress
  const needsAttention = chapters
    .filter(c => c.status === 'in_progress' && c.progress < 50)
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 3);
  
  needsAttention.forEach(ch => {
    insights.push({
      type: 'attention',
      label: ch.title,
      detail: `${ch.progress}% complete`,
    });
  });

  // If no insights, add encouraging message
  if (insights.length === 0) {
    insights.push({
      type: 'attention',
      label: 'Start your journey',
      detail: 'Begin with any chapter to track your progress',
    });
  }

  return insights;
}

function generateSuggestions(
  chapters: ChapterStatus[], 
  lectures: { id: string; chapter_id: string | null; title: string }[]
): SuggestedItem[] {
  const suggestions: SuggestedItem[] = [];

  // Find chapters to suggest (prioritize in-progress, then not started)
  const inProgressChapters = chapters
    .filter(c => c.status === 'in_progress' && c.totalItems > 0)
    .sort((a, b) => b.progress - a.progress);

  const notStartedChapters = chapters
    .filter(c => c.status === 'not_started' && c.totalItems > 0);

  const priorityChapters = [...inProgressChapters, ...notStartedChapters].slice(0, 2);

  priorityChapters.forEach(chapter => {
    // Primary suggestion: Book study
    suggestions.push({
      type: 'read',
      title: chapter.title,
      chapterTitle: chapter.moduleName,
      estimatedMinutes: 30,
      chapterId: chapter.id,
      moduleId: chapter.moduleId,
    });

    // Secondary: MCQs if available
    if (chapter.totalItems > 0) {
      suggestions.push({
        type: 'mcq',
        title: `Practice MCQs: ${chapter.title}`,
        estimatedMinutes: 15,
        chapterId: chapter.id,
        moduleId: chapter.moduleId,
      });
    }

    // Check for video lectures
    const chapterLectures = lectures.filter(l => l.chapter_id === chapter.id);
    if (chapterLectures.length > 0) {
      suggestions.push({
        type: 'video',
        title: chapterLectures[0].title,
        chapterTitle: chapter.title,
        estimatedMinutes: 20,
        chapterId: chapter.id,
        moduleId: chapter.moduleId,
      });
    }
  });

  // Limit suggestions
  return suggestions.slice(0, 5);
}
