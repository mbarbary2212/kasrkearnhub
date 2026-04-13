import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Constants ────────────────────────────────────────────────

export const REASONING_DOMAINS = [
  'diagnosis',
  'investigation',
  'interpretation',
  'management',
  'complications',
  'prioritization',
  'emergency_action',
  'follow_up',
] as const;

export type ReasoningDomain = (typeof REASONING_DOMAINS)[number];

export const REASONING_DOMAIN_LABELS: Record<string, string> = {
  diagnosis: 'Diagnosis',
  investigation: 'Investigation',
  interpretation: 'Interpretation',
  management: 'Management',
  complications: 'Complications',
  prioritization: 'Prioritization',
  emergency_action: 'Emergency Action',
  follow_up: 'Follow-up',
};

// ─── Types ────────────────────────────────────────────────────

export interface ReasoningDomainScore {
  domain: string;
  label: string;
  avgPercentage: number;
  attemptCount: number;
  criticalMissRate: number;
  /** Only computed when attemptCount >= 10 */
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
}

export interface CaseReasoningProfile {
  domains: ReasoningDomainScore[];
  totalAttempts: number;
  overallAvgPercentage: number;
}

// ─── Hook ─────────────────────────────────────────────────────

export function useCaseReasoningProfile(userId?: string, moduleId?: string) {
  return useQuery({
    queryKey: ['case-reasoning-profile', userId, moduleId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CaseReasoningProfile> => {
      let query = supabase
        .from('case_attempt_details')
        .select('reasoning_domain, score, max_score, percentage, missing_critical_points, completed_at')
        .eq('user_id', userId!)
        .order('completed_at', { ascending: true });

      if (moduleId) {
        query = query.eq('module_id', moduleId);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        return { domains: [], totalAttempts: 0, overallAvgPercentage: 0 };
      }

      // Group by domain
      const domainMap = new Map<string, typeof data>();
      for (const row of data) {
        const domain = row.reasoning_domain || 'unknown';
        if (!domainMap.has(domain)) domainMap.set(domain, []);
        domainMap.get(domain)!.push(row);
      }

      const domains: ReasoningDomainScore[] = [];
      for (const [domain, rows] of domainMap) {
        if (domain === 'unknown') continue;

        const avgPercentage = rows.reduce((s, r) => s + Number(r.percentage), 0) / rows.length;

        // Critical miss rate: attempts with any critical misses / total
        const withCriticalMiss = rows.filter(r => {
          const misses = r.missing_critical_points as unknown[];
          return Array.isArray(misses) && misses.length > 0;
        }).length;
        const criticalMissRate = Math.round((withCriticalMiss / rows.length) * 100);

        // Trend: only if >= 10 attempts
        let trend: ReasoningDomainScore['trend'] = 'insufficient_data';
        if (rows.length >= 10) {
          const half = Math.floor(rows.length / 2);
          const olderAvg = rows.slice(0, half).reduce((s, r) => s + Number(r.percentage), 0) / half;
          const newerAvg = rows.slice(half).reduce((s, r) => s + Number(r.percentage), 0) / (rows.length - half);
          const delta = newerAvg - olderAvg;
          if (delta >= 10) trend = 'improving';
          else if (delta <= -10) trend = 'declining';
          else trend = 'stable';
        }

        domains.push({
          domain,
          label: REASONING_DOMAIN_LABELS[domain] || domain,
          avgPercentage: Math.round(avgPercentage),
          attemptCount: rows.length,
          criticalMissRate,
          trend,
        });
      }

      // Sort by avgPercentage ascending (weakest first)
      domains.sort((a, b) => a.avgPercentage - b.avgPercentage);

      const totalAttempts = data.length;
      const overallAvgPercentage = Math.round(data.reduce((s, r) => s + Number(r.percentage), 0) / data.length);

      return { domains, totalAttempts, overallAvgPercentage };
    },
  });
}
