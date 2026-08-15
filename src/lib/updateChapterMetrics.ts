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
 * Also recalculates confidence metrics from recent question_attempts.
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

      const prev = existing as unknown as { mcq_attempts: number; mcq_correct: number; mcq_wrong: number } | null;
      const newAttempts = (prev?.mcq_attempts ?? 0) + 1;
      const newCorrect = (prev?.mcq_correct ?? 0) + (update.isCorrect ? 1 : 0);
      const newWrong = (prev?.mcq_wrong ?? 0) + (update.isCorrect ? 0 : 1);
      const newAccuracy = newAttempts > 0 ? Math.round((newCorrect / newAttempts) * 100) : 0;

      // Recent accuracy + confidence: use last 20 attempts from question_attempts
      const { data: recentAttempts } = await supabase
        .from('question_attempts')
        .select('is_correct, confidence_level')
        .eq('user_id', update.studentId)
        .eq('chapter_id', update.chapterId)
        .eq('question_type', 'mcq')
        .order('created_at', { ascending: false })
        .limit(20);

      let recentAccuracy = newAccuracy;
      let confidenceAvg = 0;
      let confidenceMismatchRate = 0;
      let overconfidentErrorRate = 0;
      let underconfidentCorrectRate = 0;

      if (recentAttempts && recentAttempts.length > 0) {
        const recentCorrect = recentAttempts.filter(a => a.is_correct).length;
        recentAccuracy = Math.round((recentCorrect / recentAttempts.length) * 100);

        // Confidence metrics — only from attempts that have confidence_level
        const withConfidence = recentAttempts.filter(a => a.confidence_level != null);
        if (withConfidence.length >= 3) {
          const total = withConfidence.length;
          confidenceAvg = withConfidence.reduce((sum, a) => sum + (a.confidence_level ?? 0), 0) / total;

          // High confidence = 3, Low confidence = 1
          const highConfWrong = withConfidence.filter(a => (a.confidence_level ?? 0) >= 3 && !a.is_correct).length;
          const lowConfCorrect = withConfidence.filter(a => (a.confidence_level ?? 0) <= 1 && a.is_correct).length;
          const mismatch = highConfWrong + lowConfCorrect;

          confidenceMismatchRate = Math.round((mismatch / total) * 100);
          overconfidentErrorRate = Math.round((highConfWrong / total) * 100);
          underconfidentCorrectRate = Math.round((lowConfCorrect / total) * 100);
        }
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

      // Update confidence columns separately (direct update since upsert doesn't handle these)
      if (recentAttempts && recentAttempts.filter(a => a.confidence_level != null).length >= 3) {
        await supabase
          .from('student_chapter_metrics' as any)
          .update({
            confidence_avg: Math.round(confidenceAvg * 100) / 100,
            confidence_mismatch_rate: confidenceMismatchRate,
            overconfident_error_rate: overconfidentErrorRate,
            underconfident_correct_rate: underconfidentCorrectRate,
          })
          .eq('student_id', update.studentId)
          .eq('chapter_id', update.chapterId);
      }
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

// ─── Chapter-level sync helpers ───────────────────────────────
// The planner reads student_chapter_metrics. These helpers resolve the chapter
// a card/video belongs to, count the current video-coverage / flashcard-due
// state from the source tables, and feed it through updateChapterMetrics.
// Without them, coverage_percent and flashcards_due/overdue stayed 0 and the
// planner's coverage-based states + revision slot never fired.

/**
 * Recompute this chapter's flashcard due/overdue for a student and push it into
 * student_chapter_metrics. Call after a flashcard is rated. Fire-and-forget.
 */
export async function syncFlashcardMetricsForChapter(studentId: string, cardId: string): Promise<void> {
  try {
    // Which chapter/module does this card belong to?
    const { data: res } = await supabase
      .from('study_resources')
      .select('chapter_id, module_id')
      .eq('id', cardId)
      .maybeSingle();
    if (!res?.chapter_id || !res?.module_id) return;

    // All flashcard resources in this chapter (non-flashcard ids simply won't
    // match any flashcard_states rows below).
    const { data: chapterCards } = await supabase
      .from('study_resources')
      .select('id')
      .eq('chapter_id', res.chapter_id)
      .eq('is_deleted', false);
    const cardIds = (chapterCards ?? []).map((c: any) => c.id);
    if (cardIds.length === 0) return;

    // This student's scheduled review states for those cards
    const { data: states } = await supabase
      .from('flashcard_states' as any)
      .select('due')
      .eq('user_id', studentId)
      .in('card_id', cardIds);

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    let due = 0;
    let overdue = 0;
    for (const s of (states as any[]) ?? []) {
      const d = new Date(s.due);
      if (d < startOfDay) overdue++;
      else if (d <= now) due++;
    }

    await updateChapterMetrics({
      type: 'flashcard',
      studentId,
      moduleId: res.module_id,
      chapterId: res.chapter_id,
      flashcardsDue: due,
      flashcardsOverdue: overdue,
    });
  } catch (err) {
    console.error('[syncFlashcardMetricsForChapter] Error:', err);
  }
}

/**
 * Recompute this chapter's video coverage for a student and push it into
 * student_chapter_metrics. Call after a video is completed / marked / unmarked.
 * Fire-and-forget.
 */
export async function syncVideoMetricsForChapter(studentId: string, videoId: string): Promise<void> {
  try {
    // Which chapter/module does this video belong to?
    const { data: lecture } = await supabase
      .from('lectures')
      .select('chapter_id, module_id')
      .eq('id', videoId)
      .maybeSingle();
    if (!lecture?.chapter_id || !lecture?.module_id) return;

    // All real videos in this chapter
    const { data: lectures } = await supabase
      .from('lectures')
      .select('id')
      .eq('chapter_id', lecture.chapter_id)
      .eq('is_deleted', false)
      .not('video_url', 'is', null);
    const videoIds = (lectures ?? []).map((l: any) => l.id);
    if (videoIds.length === 0) return;

    // How many has this student completed (>= 95%)?
    const { data: vp } = await supabase
      .from('video_progress')
      .select('video_id, percent_watched')
      .eq('user_id', studentId)
      .in('video_id', videoIds);
    const completed = (vp ?? []).filter((v: any) => Number(v.percent_watched) >= 95).length;

    await updateChapterMetrics({
      type: 'video',
      studentId,
      moduleId: lecture.module_id,
      chapterId: lecture.chapter_id,
      videosCompleted: completed,
      videosTotal: videoIds.length,
    });
  } catch (err) {
    console.error('[syncVideoMetricsForChapter] Error:', err);
  }
}
