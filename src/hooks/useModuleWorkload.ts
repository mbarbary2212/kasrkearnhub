import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WorkloadLevel } from '@/types/curriculum';

interface ModulePageCount {
  moduleId: string;
  pageCount: number;
}

// Fetch page counts for all modules in a year to calculate quartiles
export function useModulePageCounts(yearId: string | null) {
  return useQuery({
    queryKey: ['module-page-counts', yearId],
    queryFn: async () => {
      if (!yearId) return [];

      // Get modules for this year with their page counts
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('id, page_count')
        .eq('year_id', yearId);

      if (modulesError) throw modulesError;
      if (!modules || modules.length === 0) return [];

      // Map to page counts (default to 0 if not set)
      const counts: ModulePageCount[] = modules.map(m => ({
        moduleId: m.id,
        pageCount: m.page_count || 0,
      }));

      return counts;
    },
    enabled: !!yearId,
  });
}

// Legacy: Keep for backward compatibility during transition
interface ModuleContentCount {
  moduleId: string;
  chapterCount: number;
  mcqCount: number;
  essayCount: number;
  practicalCount: number;
  caseScenarioCount: number;
  lectureCount: number;
  totalItems: number;
}

// Legacy function - kept for backward compatibility
export function useModuleContentCounts(yearId: string | null) {
  return useQuery({
    queryKey: ['module-content-counts', yearId],
    queryFn: async () => {
      if (!yearId) return [];

      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('id')
        .eq('year_id', yearId);

      if (modulesError) throw modulesError;
      if (!modules || modules.length === 0) return [];

      const moduleIds = modules.map(m => m.id);

      const [chapters, mcqs, essays, practicals, caseScenarios, lectures] = await Promise.all([
        supabase
          .from('module_chapters')
          .select('id, module_id')
          .in('module_id', moduleIds),
        supabase
          .from('mcqs')
          .select('id, module_id')
          .in('module_id', moduleIds)
          .eq('is_deleted', false),
        supabase
          .from('essays')
          .select('id, module_id')
          .in('module_id', moduleIds)
          .eq('is_deleted', false),
        supabase
          .from('practicals')
          .select('id, module_id')
          .in('module_id', moduleIds)
          .eq('is_deleted', false),
        supabase
          .from('virtual_patient_cases')
          .select('id, module_id')
          .in('module_id', moduleIds)
          .eq('is_deleted', false),
        supabase
          .from('lectures')
          .select('id, module_id')
          .in('module_id', moduleIds)
          .eq('is_deleted', false),
      ]);

      const counts: ModuleContentCount[] = moduleIds.map(moduleId => {
        const chapterCount = chapters.data?.filter(c => c.module_id === moduleId).length || 0;
        const mcqCount = mcqs.data?.filter(m => m.module_id === moduleId).length || 0;
        const essayCount = essays.data?.filter(e => e.module_id === moduleId).length || 0;
        const practicalCount = practicals.data?.filter(p => p.module_id === moduleId).length || 0;
        const caseScenarioCount = caseScenarios.data?.filter(c => c.module_id === moduleId).length || 0;
        const lectureCount = lectures.data?.filter(l => l.module_id === moduleId).length || 0;

        const totalItems = 
          chapterCount * 3 + 
          mcqCount * 0.1 + 
          essayCount * 1 + 
          practicalCount * 2 + 
          caseScenarioCount * 1.5 + 
          lectureCount * 1.5;

        return {
          moduleId,
          chapterCount,
          mcqCount,
          essayCount,
          practicalCount,
          caseScenarioCount,
          lectureCount,
          totalItems,
        };
      });

      return counts;
    },
    enabled: !!yearId,
  });
}

// Calculate workload level based on page count quartiles within the year
export function calculateAutoWorkloadFromPages(
  moduleId: string, 
  pageCounts: ModulePageCount[]
): WorkloadLevel {
  if (!pageCounts || pageCounts.length === 0) return 'medium';
  
  const modulePageCount = pageCounts.find(c => c.moduleId === moduleId);
  if (!modulePageCount || modulePageCount.pageCount === 0) return 'medium';

  // Sort by page count to determine quartiles (highest first)
  const sortedCounts = [...pageCounts].sort((a, b) => b.pageCount - a.pageCount);
  const position = sortedCounts.findIndex(c => c.moduleId === moduleId);
  const percentile = (position / sortedCounts.length) * 100;

  // Top 25% = heavy+, next 25% = heavy, next 25% = medium, bottom 25% = light
  if (percentile < 25) return 'heavy_plus';
  if (percentile < 50) return 'heavy';
  if (percentile < 75) return 'medium';
  return 'light';
}

// Legacy: Calculate workload from content counts (deprecated, use page counts)
export function calculateAutoWorkload(
  moduleId: string, 
  contentCounts: ModuleContentCount[]
): WorkloadLevel {
  if (!contentCounts || contentCounts.length === 0) return 'medium';
  
  const moduleCount = contentCounts.find(c => c.moduleId === moduleId);
  if (!moduleCount) return 'medium';

  const sortedCounts = [...contentCounts].sort((a, b) => b.totalItems - a.totalItems);
  const position = sortedCounts.findIndex(c => c.moduleId === moduleId);
  const percentile = (position / sortedCounts.length) * 100;

  if (percentile < 25) return 'heavy_plus';
  if (percentile < 50) return 'heavy';
  if (percentile < 75) return 'medium';
  return 'light';
}

// Get effective workload level (override if set, otherwise auto-calculate from pages)
export function getEffectiveWorkloadFromPages(
  moduleWorkloadLevel: WorkloadLevel | null,
  moduleId: string,
  pageCounts: ModulePageCount[]
): WorkloadLevel {
  if (moduleWorkloadLevel) return moduleWorkloadLevel;
  return calculateAutoWorkloadFromPages(moduleId, pageCounts);
}

// Legacy: Get effective workload from content counts
export function getEffectiveWorkload(
  moduleWorkloadLevel: WorkloadLevel | null,
  moduleId: string,
  contentCounts: ModuleContentCount[]
): WorkloadLevel {
  if (moduleWorkloadLevel) return moduleWorkloadLevel;
  return calculateAutoWorkload(moduleId, contentCounts);
}

// Convert workload level to numeric weight for study plan calculations
export function workloadToWeight(level: WorkloadLevel): number {
  switch (level) {
    case 'heavy_plus': return 3.5;
    case 'heavy': return 3;
    case 'medium': return 2;
    case 'light': return 1;
    default: return 1;
  }
}

// Format workload level for display
export function formatWorkloadLevel(level: WorkloadLevel): string {
  switch (level) {
    case 'heavy_plus': return 'Heavy+';
    case 'heavy': return 'Heavy';
    case 'medium': return 'Medium';
    case 'light': return 'Light';
    default: return level;
  }
}
