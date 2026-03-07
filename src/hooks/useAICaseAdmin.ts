import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface AICaseAttemptRow {
  attempt_id: string;
  user_id: string;
  case_id: string;
  score: number;
  is_completed: boolean;
  flag_for_review: boolean | null;
  flag_reason: string | null;
  tokens_used: number | null;
  started_at: string;
  completed_at: string | null;
  total_stages: number;
  duration_seconds: number | null;
  case_title: string;
  case_difficulty: string;
  module_id: string | null;
  topic_id: string | null;
  max_turns: number;
  student_name: string | null;
  student_email: string | null;
  estimated_cost_usd: number;
  message_count: number;
  debrief_summary: string | null;
}

export interface AICaseFilters {
  caseId?: string;
  difficulty?: string;
  minScore?: number;
  maxScore?: number;
  flaggedOnly?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface AICaseSummaryStats {
  totalAttempts: number;
  avgScore: number;
  flaggedCount: number;
  totalCost: number;
}

export interface AICaseAggregate {
  totalAttempts: number;
  avgScore: number;
  completionRate: number;
  flaggedCount: number;
}

function useRoleScope() {
  const { isSuperAdmin, isPlatformAdmin, isModuleAdmin, isTopicAdmin, moduleAdminModuleIds, topicAssignments } = useAuthContext();
  return { isSuperAdmin, isPlatformAdmin, isModuleAdmin, isTopicAdmin, moduleAdminModuleIds, topicAssignments };
}

export function useAICaseAttempts(filters: AICaseFilters) {
  const scope = useRoleScope();

  return useQuery({
    queryKey: ['ai-case-attempts', filters, scope.moduleAdminModuleIds],
    queryFn: async () => {
      let query = supabase
        .from('ai_case_attempt_summary' as any)
        .select('*')
        .order('started_at', { ascending: false });

      // Role scoping
      if (scope.isModuleAdmin && !scope.isSuperAdmin && !scope.isPlatformAdmin) {
        if (scope.moduleAdminModuleIds.length > 0) {
          query = query.in('module_id', scope.moduleAdminModuleIds);
        } else {
          return [] as AICaseAttemptRow[];
        }
      } else if (scope.isTopicAdmin && !scope.isSuperAdmin && !scope.isPlatformAdmin && !scope.isModuleAdmin) {
        const topicIds = scope.topicAssignments.map(a => a.topic_id).filter(Boolean);
        if (topicIds.length > 0) {
          query = query.in('topic_id', topicIds);
        } else {
          return [] as AICaseAttemptRow[];
        }
      }

      // Filters
      if (filters.caseId) query = query.eq('case_id', filters.caseId);
      if (filters.difficulty) query = query.eq('case_difficulty', filters.difficulty);
      if (filters.minScore !== undefined) query = query.gte('score', filters.minScore);
      if (filters.maxScore !== undefined) query = query.lte('score', filters.maxScore);
      if (filters.flaggedOnly) query = query.eq('flag_for_review', true);
      if (filters.dateFrom) query = query.gte('started_at', filters.dateFrom.toISOString());
      if (filters.dateTo) query = query.lte('started_at', filters.dateTo.toISOString());
      if (filters.search) {
        query = query.or(`student_name.ilike.%${filters.search}%,student_email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as AICaseAttemptRow[];
    },
    enabled: scope.isSuperAdmin || scope.isPlatformAdmin || scope.isModuleAdmin || scope.isTopicAdmin,
  });
}

export function useAICaseSummaryStats(attempts: AICaseAttemptRow[] | undefined): AICaseSummaryStats {
  if (!attempts || attempts.length === 0) {
    return { totalAttempts: 0, avgScore: 0, flaggedCount: 0, totalCost: 0 };
  }
  const completedAttempts = attempts.filter(a => a.is_completed);
  const avgScore = completedAttempts.length > 0
    ? completedAttempts.reduce((sum, a) => sum + Number(a.score), 0) / completedAttempts.length
    : 0;
  const flaggedCount = attempts.filter(a => a.flag_for_review).length;
  const totalCost = attempts.reduce((sum, a) => sum + Number(a.estimated_cost_usd || 0), 0);

  return {
    totalAttempts: attempts.length,
    avgScore: Math.round(avgScore * 10) / 10,
    flaggedCount,
    totalCost: Math.round(totalCost * 100) / 100,
  };
}

export function useAICaseAggregates(attempts: AICaseAttemptRow[] | undefined): Map<string, AICaseAggregate> {
  return useMemo(() => {
    const map = new Map<string, AICaseAggregate>();
    if (!attempts) return map;

    const grouped = new Map<string, AICaseAttemptRow[]>();
    for (const a of attempts) {
      const arr = grouped.get(a.case_id) || [];
      arr.push(a);
      grouped.set(a.case_id, arr);
    }

    for (const [caseId, rows] of grouped) {
      const completed = rows.filter(r => r.is_completed);
      const avgScore = completed.length > 0
        ? Math.round(completed.reduce((s, r) => s + Number(r.score), 0) / completed.length * 10) / 10
        : 0;
      const completionRate = Math.round((completed.length / rows.length) * 100);
      const flaggedCount = rows.filter(r => r.flag_for_review).length;

      map.set(caseId, {
        totalAttempts: rows.length,
        avgScore,
        completionRate,
        flaggedCount,
      });
    }

    return map;
  }, [attempts]);
}

export function useAICaseSectionAnswers(attemptId: string | null) {
  return useQuery({
    queryKey: ['ai-case-section-answers', attemptId],
    queryFn: async () => {
      if (!attemptId) return [];
      const { data, error } = await supabase
        .from('case_section_answers')
        .select('id, section_type, student_answer, score, max_score, ai_feedback, is_scored')
        .eq('attempt_id', attemptId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!attemptId,
  });
}

export function useAICaseTranscript(attemptId: string | null) {
  return useQuery({
    queryKey: ['ai-case-transcript', attemptId],
    queryFn: async () => {
      if (!attemptId) return [];
      const { data, error } = await supabase
        .from('ai_case_messages')
        .select('*')
        .eq('attempt_id', attemptId)
        .order('turn_number', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!attemptId,
  });
}

export function useAICasesInScope() {
  const scope = useRoleScope();

  return useQuery({
    queryKey: ['ai-cases-in-scope', scope.moduleAdminModuleIds],
    queryFn: async () => {
      let query = supabase
        .from('virtual_patient_cases')
        .select('id, title, level, module_id, topic_id, chapter_id, is_ai_driven')
        .eq('is_deleted', false)
        .order('title');

      if (scope.isModuleAdmin && !scope.isSuperAdmin && !scope.isPlatformAdmin) {
        if (scope.moduleAdminModuleIds.length > 0) {
          query = query.in('module_id', scope.moduleAdminModuleIds);
        } else {
          return [];
        }
      } else if (scope.isTopicAdmin && !scope.isSuperAdmin && !scope.isPlatformAdmin && !scope.isModuleAdmin) {
        const topicIds = scope.topicAssignments.map(a => a.topic_id).filter(Boolean);
        if (topicIds.length > 0) {
          query = query.in('topic_id', topicIds);
        } else {
          return [];
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: scope.isSuperAdmin || scope.isPlatformAdmin || scope.isModuleAdmin || scope.isTopicAdmin,
  });
}

export function useFlagAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attemptId, flagReason }: { attemptId: string; flagReason: string }) => {
      const { error } = await supabase
        .from('virtual_patient_attempts')
        .update({ flag_for_review: true, flag_reason: flagReason })
        .eq('id', attemptId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-case-attempts'] });
    },
  });
}
