import { supabase } from '@/integrations/supabase/client';

interface McqMetricsUpdate {
  type: 'mcq';
  studentId: string;
  moduleId: string;
  chapterId: string;
  isCorrect: boolean;
}

interface VideoMetricsUpdate {
  type: 'video';
  studentId: string;
  moduleId: string;
  chapterId: string;
  videosCompleted: number;
  videosTotal: number;
}

interface FlashcardMetricsUpdate {
  type: 'flashcard';
  studentId: string;
  moduleId: string;
  chapterId: string;
  flashcardsDue: number;
  flashcardsOverdue: number;
}

type MetricsUpdate = McqMetricsUpdate | VideoMetricsUpdate | FlashcardMetricsUpdate;

/**
 * Fire-and-forget update to student_chapter_metrics after activity.
 * Uses the server-side upsert_student_chapter_metrics function.
 */
export async function updateChapterMetrics(update: MetricsUpdate): Promise<void> {
  try {
    const now = new Date().toISOString();

    if (update.type === 'mcq') {
      // Fetch current metrics to compute incremental values
      const { data: existing } = await supabase
        .from('student_chapter_metrics' as any)
        .select('mcq_attempts, mcq_correct, mcq_wrong')
        .eq('student_id', update.studentId)
        .eq('chapter_id', update.chapterId)
        .maybeSingle();

      const prev = existing as { mcq_attempts: number; mcq_correct: number; mcq_wrong: number } | null;
      const newAttempts = (prev?.mcq_attempts ?? 0) + 1;
      const newCorrect = (prev?.mcq_correct ?? 0) + (update.isCorrect ? 1 : 0);
      const newWrong = (prev?.mcq_wrong ?? 0) + (update.isCorrect ? 0 : 1);
      const newAccuracy = newAttempts > 0 ? Math.round((newCorrect / newAttempts) * 100) : 0;

      // Recent accuracy: use last 10 attempts from question_attempts
      const { data: recentAttempts } = await supabase
        .from('question_attempts')
        .select('is_correct')
        .eq('user_id', update.studentId)
        .eq('chapter_id', update.chapterId)
        .eq('question_type', 'mcq')
        .order('created_at', { ascending: false })
        .limit(10);

      let recentAccuracy = newAccuracy;
      if (recentAttempts && recentAttempts.length > 0) {
        const recentCorrect = recentAttempts.filter(a => a.is_correct).length;
        recentAccuracy = Math.round((recentCorrect / recentAttempts.length) * 100);
      }

      await supabase.rpc('upsert_student_chapter_metrics' as any, {
        p_student_id: update.studentId,
        p_module_id: update.moduleId,
        p_chapter_id: update.chapterId,
        p_mcq_attempts: newAttempts,
        p_mcq_correct: newCorrect,
        p_mcq_wrong: newWrong,
        p_mcq_accuracy: newAccuracy,
        p_recent_mcq_accuracy: recentAccuracy,
        p_last_mcq_attempt_at: now,
        p_last_activity_at: now,
      });
    } else if (update.type === 'video') {
      const coveragePercent = update.videosTotal > 0
        ? Math.round((update.videosCompleted / update.videosTotal) * 100)
        : 0;

      await supabase.rpc('upsert_student_chapter_metrics' as any, {
        p_student_id: update.studentId,
        p_module_id: update.moduleId,
        p_chapter_id: update.chapterId,
        p_videos_completed: update.videosCompleted,
        p_videos_total: update.videosTotal,
        p_coverage_percent: coveragePercent,
        p_last_video_at: now,
        p_last_activity_at: now,
      });
    } else if (update.type === 'flashcard') {
      await supabase.rpc('upsert_student_chapter_metrics' as any, {
        p_student_id: update.studentId,
        p_module_id: update.moduleId,
        p_chapter_id: update.chapterId,
        p_flashcards_due: update.flashcardsDue,
        p_flashcards_overdue: update.flashcardsOverdue,
        p_last_flashcard_review_at: now,
        p_last_activity_at: now,
      });
    }
  } catch (err) {
    // Fire-and-forget: log but don't throw
    console.error('[updateChapterMetrics] Error:', err);
  }
}
