import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContentAdmin {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

function normalizeAdmins(data: any[] | null | undefined): ContentAdmin[] {
  if (!data) return [];

  const seen = new Set<string>();
  const admins: ContentAdmin[] = [];

  for (const row of data) {
    if (!row?.id || seen.has(row.id)) continue;
    seen.add(row.id);
    admins.push({
      id: row.id,
      full_name: row.full_name ?? null,
      avatar_url: row.avatar_url ?? null,
      email: row.email ?? null,
    });
  }

  return admins;
}

async function fetchModuleAdmins(moduleId: string): Promise<ContentAdmin[]> {
  const { data, error } = await supabase.rpc('get_module_leads' as any, {
    _module_id: moduleId,
  });

  if (error) return [];

  return normalizeAdmins(data as any[] | null | undefined);
}

export function useModuleAdmins(moduleId: string | undefined) {
  return useQuery({
    queryKey: ['content-admins', 'module', moduleId],
    queryFn: () => fetchModuleAdmins(moduleId!),
    enabled: !!moduleId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useChapterAdmins(chapterId: string | undefined, moduleId: string | undefined) {
  return useQuery({
    queryKey: ['content-admins', 'chapter', chapterId, moduleId],
    queryFn: async (): Promise<{ admins: ContentAdmin[]; source: 'chapter' | 'module' }> => {
      const { data: chapterData, error: chapterError } = await supabase.rpc('get_chapter_leads' as any, {
        _chapter_id: chapterId!,
      });

      const chapterAdmins = chapterError
        ? []
        : normalizeAdmins(data as any[] | null | undefined);

      if (chapterAdmins.length > 0) {
        return { admins: chapterAdmins, source: 'chapter' };
      }

      // Fallback to module admins
      if (moduleId) {
        const moduleAdmins = await fetchModuleAdmins(moduleId);
        return { admins: moduleAdmins, source: 'module' };
      }

      return { admins: [], source: 'module' };
    },
    enabled: !!chapterId,
    staleTime: 5 * 60 * 1000,
  });
}
