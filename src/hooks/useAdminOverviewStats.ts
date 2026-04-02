import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { computeContentQualityFlag } from '@/lib/contentQualityScoring';
import type { QualitySignals } from '@/hooks/useContentQualitySignals';

export interface AdminOverviewStats {
  unansweredQuestions: number;
  unansweredOver24h: number;
  unansweredOver48h: number;
  newQuestionsToday: number;
  pendingFeedback: number;
  feedbackLast7Days: number;
  topFeedbackCategory: string | null;
  helpfulPercent: number;
  unhelpfulPercent: number;
  flaggedItems: number;
  itemsNeedingReview: number;
  needsReviewCount: number;
  highPriorityCount: number;
  totalReactions: number;
  recentActivity: Array<{
    id: string;
    type: 'question' | 'feedback' | 'activity';
    summary: string;
    created_at: string;
  }>;
  modules: Array<{
    id: string;
    name: string;
    slug: string;
    contentCount: number;
    unansweredQuestions: number;
    flaggedItems: number;
  }>;
}

export function useAdminOverviewStats() {
  const { user, isAdmin } = useAuthContext();

  return useQuery({
    queryKey: ['admin-overview-stats', user?.id],
    queryFn: async (): Promise<AdminOverviewStats> => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      // Run all queries in parallel
      const [
        unansweredRes,
        unanswered24hRes,
        unanswered48hRes,
        newTodayRes,
        feedbackPendingRes,
        feedback7dRes,
        feedbackCategoriesRes,
        reactionsRes,
        reviewNotesRes,
        recentActivityRes,
        recentQuestionsRes,
        recentFeedbackRes,
        modulesRes,
      ] = await Promise.all([
        // Unanswered questions total
        supabase.from('chapter_questions').select('id', { count: 'exact', head: true }).eq('is_answered', false).eq('is_hidden', false),
        // Unanswered > 24h
        supabase.from('chapter_questions').select('id', { count: 'exact', head: true }).eq('is_answered', false).eq('is_hidden', false).lt('created_at', oneDayAgo),
        // Unanswered > 48h
        supabase.from('chapter_questions').select('id', { count: 'exact', head: true }).eq('is_answered', false).eq('is_hidden', false).lt('created_at', twoDaysAgo),
        // New questions today
        supabase.from('chapter_questions').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
        // Pending feedback (not reviewed)
        supabase.from('material_feedback' as any).select('id', { count: 'exact', head: true }),
        // Feedback last 7 days
        supabase.from('material_feedback' as any).select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
        // Top feedback category
        supabase.from('material_feedback' as any).select('material_id, feedback_type').limit(100),
        // Reactions totals
        supabase.from('material_reactions' as any).select('material_id, reaction_type').limit(1000),
        // Items needing review
        supabase.from('content_review_notes').select('id', { count: 'exact', head: true }).neq('review_status', 'resolved'),
        // Recent activity logs
        supabase.from('activity_logs').select('id, action, entity_type, created_at').order('created_at', { ascending: false }).limit(5),
        // Recent questions
        supabase.from('chapter_questions').select('id, question_text, created_at').order('created_at', { ascending: false }).limit(3),
        // Recent feedback
        supabase.from('material_feedback' as any).select('id, feedback_type, created_at').order('created_at', { ascending: false }).limit(3),
        // Modules
        supabase.from('modules').select('id, name, slug'),
      ]);

      // Calculate reaction percentages and quality flags
      const reactions = (reactionsRes.data || []) as any[];
      const totalReactions = reactions.length;
      const helpful = reactions.filter((r: any) => r.reaction_type === 'up').length;
      const unhelpful = reactions.filter((r: any) => r.reaction_type === 'down').length;
      const helpfulPercent = totalReactions > 0 ? Math.round((helpful / totalReactions) * 100) : 0;
      const unhelpfulPercent = totalReactions > 0 ? Math.round((unhelpful / totalReactions) * 100) : 0;

      // Top feedback category
      const feedbackCategories = (feedbackCategoriesRes.data || []) as any[];
      const categoryCounts: Record<string, number> = {};
      feedbackCategories.forEach((f: any) => {
        const cat = f.feedback_type || 'unknown';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
      const topCategory = Object.entries(categoryCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || null;

      // Compute quality flags per material_id
      const perItem: Record<string, QualitySignals> = {};
      for (const r of reactions) {
        const mid = (r as any).material_id;
        if (!mid) continue;
        if (!perItem[mid]) perItem[mid] = { material_id: mid, helpful_count: 0, unhelpful_count: 0, feedback_count: 0, feedback_types: {} };
        if (r.reaction_type === 'up') perItem[mid].helpful_count++;
        else perItem[mid].unhelpful_count++;
      }
      for (const f of feedbackCategories) {
        const mid = (f as any).material_id;
        if (!mid) continue;
        if (!perItem[mid]) perItem[mid] = { material_id: mid, helpful_count: 0, unhelpful_count: 0, feedback_count: 0, feedback_types: {} };
        perItem[mid].feedback_count++;
        const ft = f.feedback_type || 'unknown';
        perItem[mid].feedback_types[ft] = (perItem[mid].feedback_types[ft] || 0) + 1;
      }
      let needsReviewCount = 0;
      let highPriorityCount = 0;
      for (const sig of Object.values(perItem)) {
        const { flag } = computeContentQualityFlag(sig);
        if (flag === 'needs_review') needsReviewCount++;
        else if (flag === 'high_priority') highPriorityCount++;
      }

      // Build recent activity feed
      const recentActivity: AdminOverviewStats['recentActivity'] = [];
      (recentActivityRes.data || []).forEach((a: any) => {
        recentActivity.push({
          id: a.id,
          type: 'activity',
          summary: `${a.action} (${a.entity_type})`,
          created_at: a.created_at,
        });
      });
      (recentQuestionsRes.data || []).forEach((q: any) => {
        recentActivity.push({
          id: q.id,
          type: 'question',
          summary: q.question_text?.slice(0, 80) || 'New question',
          created_at: q.created_at,
        });
      });
      (recentFeedbackRes.data || []).forEach((f: any) => {
        recentActivity.push({
          id: f.id,
          type: 'feedback',
          summary: `Feedback: ${f.feedback_type || 'general'}`,
          created_at: f.created_at,
        });
      });
      recentActivity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Module summaries (basic)
      const modules: AdminOverviewStats['modules'] = (modulesRes.data || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        slug: m.slug || '',
        contentCount: 0,
        unansweredQuestions: 0,
        flaggedItems: 0,
      }));

      return {
        unansweredQuestions: unansweredRes.count || 0,
        unansweredOver24h: unanswered24hRes.count || 0,
        unansweredOver48h: unanswered48hRes.count || 0,
        newQuestionsToday: newTodayRes.count || 0,
        pendingFeedback: feedbackPendingRes.count || 0,
        feedbackLast7Days: feedback7dRes.count || 0,
        topFeedbackCategory: topCategory,
        helpfulPercent,
        unhelpfulPercent,
        flaggedItems: unhelpful,
        itemsNeedingReview: reviewNotesRes.count || 0,
        needsReviewCount,
        highPriorityCount,
        totalReactions,
        recentActivity: recentActivity.slice(0, 10),
        modules,
      };
    },
    enabled: !!user?.id && isAdmin,
    staleTime: 60000,
  });
}
