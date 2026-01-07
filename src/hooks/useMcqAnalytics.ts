import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface McqAnalytics {
  id: string;
  mcq_id: string;
  module_id: string;
  chapter_id: string | null;
  total_attempts: number;
  correct_count: number;
  facility_index: number | null;
  discrimination_index: number | null;
  distractor_analysis: Record<string, number>;
  avg_time_seconds: number | null;
  min_time_seconds: number | null;
  max_time_seconds: number | null;
  is_flagged: boolean;
  flag_reasons: string[];
  flag_severity: 'low' | 'medium' | 'high' | 'critical' | null;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface McqWithAnalytics extends McqAnalytics {
  mcq?: {
    id: string;
    stem: string;
    choices: Array<{ key: string; text: string }>;
    correct_key: string;
    difficulty: string | null;
    chapter_id: string | null;
  };
  chapter?: {
    id: string;
    title: string;
    chapter_number: number;
  };
}

export function useModuleMcqAnalytics(moduleId?: string) {
  return useQuery({
    queryKey: ["mcq-analytics", "module", moduleId],
    queryFn: async () => {
      if (!moduleId) return [];

      const { data, error } = await supabase
        .from("mcq_analytics")
        .select(`
          *,
          mcq:mcqs!mcq_id (
            id,
            stem,
            choices,
            correct_key,
            difficulty,
            chapter_id
          ),
          chapter:module_chapters!chapter_id (
            id,
            title,
            chapter_number
          )
        `)
        .eq("module_id", moduleId)
        .order("is_flagged", { ascending: false })
        .order("facility_index", { ascending: true });

      if (error) throw error;
      return (data || []) as McqWithAnalytics[];
    },
    enabled: !!moduleId,
  });
}

export function useMcqAnalyticsById(mcqId?: string) {
  return useQuery({
    queryKey: ["mcq-analytics", "mcq", mcqId],
    queryFn: async () => {
      if (!mcqId) return null;

      const { data, error } = await supabase
        .from("mcq_analytics")
        .select(`
          *,
          mcq:mcqs!mcq_id (
            id,
            stem,
            choices,
            correct_key,
            difficulty,
            chapter_id
          ),
          chapter:module_chapters!chapter_id (
            id,
            title,
            chapter_number
          )
        `)
        .eq("mcq_id", mcqId)
        .maybeSingle();

      if (error) throw error;
      return data as McqWithAnalytics | null;
    },
    enabled: !!mcqId,
  });
}

export function useModuleAnalyticsSummary(moduleId?: string) {
  return useQuery({
    queryKey: ["mcq-analytics", "summary", moduleId],
    queryFn: async () => {
      if (!moduleId) return null;

      const { data, error } = await supabase
        .from("mcq_analytics")
        .select("facility_index, is_flagged, flag_severity, total_attempts")
        .eq("module_id", moduleId);

      if (error) throw error;

      const analytics = data || [];
      const totalMcqs = analytics.length;
      const flaggedCount = analytics.filter(a => a.is_flagged).length;
      const criticalCount = analytics.filter(a => a.flag_severity === 'critical').length;
      const highCount = analytics.filter(a => a.flag_severity === 'high').length;
      
      const facilitiesWithData = analytics
        .filter(a => a.facility_index !== null)
        .map(a => a.facility_index as number);
      
      const avgFacility = facilitiesWithData.length > 0
        ? facilitiesWithData.reduce((a, b) => a + b, 0) / facilitiesWithData.length
        : null;

      const totalAttempts = analytics.reduce((sum, a) => sum + a.total_attempts, 0);

      // Health score: 100 - (critical * 10 + high * 5 + flagged * 2) / totalMcqs * 100
      const healthScore = totalMcqs > 0
        ? Math.max(0, Math.min(100, Math.round(
            100 - ((criticalCount * 10 + highCount * 5 + (flaggedCount - criticalCount - highCount) * 2) / totalMcqs * 100)
          )))
        : 100;

      return {
        totalMcqs,
        flaggedCount,
        criticalCount,
        highCount,
        avgFacility,
        totalAttempts,
        healthScore,
        analyzedCount: analytics.filter(a => a.total_attempts >= 10).length,
      };
    },
    enabled: !!moduleId,
  });
}

export function useCalculateMcqAnalytics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ moduleId, mcqId }: { moduleId?: string; mcqId?: string }) => {
      const { data, error } = await supabase.functions.invoke("calculate-mcq-analytics", {
        body: { module_id: moduleId, mcq_id: mcqId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["mcq-analytics"] });
      if (variables.moduleId) {
        queryClient.invalidateQueries({ queryKey: ["mcq-analytics", "module", variables.moduleId] });
        queryClient.invalidateQueries({ queryKey: ["mcq-analytics", "summary", variables.moduleId] });
      }
      if (variables.mcqId) {
        queryClient.invalidateQueries({ queryKey: ["mcq-analytics", "mcq", variables.mcqId] });
      }
    },
  });
}

// Helper functions for UI display
export function getFacilityStatus(facility: number | null): { label: string; color: string } {
  if (facility === null) return { label: "No data", color: "text-muted-foreground" };
  if (facility === 0) return { label: "Critical", color: "text-destructive" };
  if (facility < 0.2) return { label: "Too Hard", color: "text-destructive" };
  if (facility < 0.3) return { label: "Hard", color: "text-orange-500" };
  if (facility > 0.85) return { label: "Too Easy", color: "text-orange-500" };
  if (facility > 0.7) return { label: "Easy", color: "text-blue-500" };
  return { label: "Good", color: "text-green-500" };
}

export function getDiscriminationStatus(disc: number | null): { label: string; color: string } {
  if (disc === null) return { label: "No data", color: "text-muted-foreground" };
  if (disc < 0) return { label: "Negative", color: "text-destructive" };
  if (disc < 0.1) return { label: "Very Poor", color: "text-destructive" };
  if (disc < 0.2) return { label: "Poor", color: "text-orange-500" };
  if (disc < 0.4) return { label: "Good", color: "text-green-500" };
  return { label: "Excellent", color: "text-green-600" };
}

export function getSeverityBadgeColor(severity: string | null): string {
  switch (severity) {
    case 'critical': return 'bg-destructive text-destructive-foreground';
    case 'high': return 'bg-orange-500 text-white';
    case 'medium': return 'bg-yellow-500 text-black';
    case 'low': return 'bg-blue-500 text-white';
    default: return 'bg-muted text-muted-foreground';
  }
}
