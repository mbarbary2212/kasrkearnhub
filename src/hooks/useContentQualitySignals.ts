import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface QualitySignals {
  material_id: string;
  helpful_count: number;
  unhelpful_count: number;
  feedback_count: number;
  feedback_types: Record<string, number>;
}

export interface ContentReviewNote {
  id: string;
  material_type: string;
  material_id: string;
  chapter_id: string | null;
  review_status: string;
  admin_note: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QualitySummary {
  totalFlagged: number;
  helpfulRate: number;
  negativeFeedback: number;
  needsReview: number;
}

// Fetch quality signals for a list of material IDs
export function useQualitySignals(materialType: string, materialIds: string[]) {
  return useQuery({
    queryKey: ['quality-signals', materialType, materialIds],
    queryFn: async () => {
      if (!materialIds.length) return {};

      // Fetch reactions
      const { data: reactions, error: rErr } = await supabase
        .from('material_reactions')
        .select('material_id, reaction_type')
        .eq('material_type', materialType)
        .in('material_id', materialIds);

      if (rErr) throw rErr;

      // Fetch feedback
      const { data: feedback, error: fErr } = await supabase
        .from('material_feedback')
        .select('material_id, feedback_type')
        .eq('material_type', materialType)
        .in('material_id', materialIds);

      if (fErr) throw fErr;

      // Aggregate per material_id
      const map: Record<string, QualitySignals> = {};

      for (const id of materialIds) {
        map[id] = {
          material_id: id,
          helpful_count: 0,
          unhelpful_count: 0,
          feedback_count: 0,
          feedback_types: {},
        };
      }

      for (const r of reactions || []) {
        if (!map[r.material_id]) continue;
        if (r.reaction_type === 'up') map[r.material_id].helpful_count++;
        else map[r.material_id].unhelpful_count++;
      }

      for (const f of feedback || []) {
        if (!map[f.material_id]) continue;
        map[f.material_id].feedback_count++;
        map[f.material_id].feedback_types[f.feedback_type] =
          (map[f.material_id].feedback_types[f.feedback_type] || 0) + 1;
      }

      return map;
    },
    enabled: materialIds.length > 0,
  });
}

// Fetch quality summary for module-level summary cards
export function useModuleQualitySummary(moduleId: string | undefined, materialType: string) {
  return useQuery({
    queryKey: ['quality-summary', moduleId, materialType],
    queryFn: async (): Promise<QualitySummary> => {
      if (!moduleId) return { totalFlagged: 0, helpfulRate: 0, negativeFeedback: 0, needsReview: 0 };

      // Get all material IDs for this module from reactions/feedback
      const { data: reactions, error: rErr } = await supabase
        .from('material_reactions')
        .select('material_id, reaction_type')
        .eq('material_type', materialType);

      if (rErr) throw rErr;

      const { data: feedback, error: fErr } = await supabase
        .from('material_feedback')
        .select('material_id, feedback_type, status')
        .eq('material_type', materialType);

      if (fErr) throw fErr;

      // Count review notes
      const { data: reviews, error: revErr } = await supabase
        .from('content_review_notes')
        .select('material_id, review_status')
        .eq('material_type', materialType)
        .neq('review_status', 'resolved');

      if (revErr) throw revErr;

      const upCount = (reactions || []).filter(r => r.reaction_type === 'up').length;
      const downCount = (reactions || []).filter(r => r.reaction_type === 'down').length;
      const totalReactions = upCount + downCount;

      // Items with 2+ negative feedback = flagged
      const feedbackByItem: Record<string, number> = {};
      for (const f of feedback || []) {
        feedbackByItem[f.material_id] = (feedbackByItem[f.material_id] || 0) + 1;
      }
      const flaggedItems = Object.values(feedbackByItem).filter(c => c >= 2).length;

      return {
        totalFlagged: flaggedItems,
        helpfulRate: totalReactions > 0 ? Math.round((upCount / totalReactions) * 100) : 0,
        negativeFeedback: (feedback || []).length,
        needsReview: (reviews || []).length,
      };
    },
    enabled: !!moduleId,
  });
}

// Fetch feedback details for a specific material
export function useMaterialFeedbackDetails(materialType: string, materialId: string | undefined) {
  return useQuery({
    queryKey: ['material-feedback-details', materialType, materialId],
    queryFn: async () => {
      if (!materialId) return { reactions: [], feedback: [], reviewNote: null };

      const [reactionsRes, feedbackRes, reviewRes] = await Promise.all([
        supabase
          .from('material_reactions')
          .select('id, reaction_type, updated_at')
          .eq('material_type', materialType)
          .eq('material_id', materialId),
        supabase
          .from('material_feedback')
          .select('id, feedback_type, message, status, created_at')
          .eq('material_type', materialType)
          .eq('material_id', materialId)
          .order('created_at', { ascending: false }),
        supabase
          .from('content_review_notes')
          .select('*')
          .eq('material_type', materialType)
          .eq('material_id', materialId)
          .maybeSingle(),
      ]);

      if (reactionsRes.error) throw reactionsRes.error;
      if (feedbackRes.error) throw feedbackRes.error;

      return {
        reactions: reactionsRes.data || [],
        feedback: feedbackRes.data || [],
        reviewNote: reviewRes.data as ContentReviewNote | null,
      };
    },
    enabled: !!materialId,
  });
}

// Upsert review note
export function useUpsertReviewNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      materialType,
      materialId,
      chapterId,
      reviewStatus,
      adminNote,
    }: {
      materialType: string;
      materialId: string;
      chapterId?: string | null;
      reviewStatus: string;
      adminNote?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('content_review_notes')
        .upsert(
          {
            material_type: materialType,
            material_id: materialId,
            chapter_id: chapterId || null,
            review_status: reviewStatus,
            admin_note: adminNote || null,
            reviewed_by: user.id,
          },
          { onConflict: 'material_type,material_id' }
        );

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['material-feedback-details', vars.materialType, vars.materialId] });
      queryClient.invalidateQueries({ queryKey: ['quality-summary'] });
    },
  });
}
