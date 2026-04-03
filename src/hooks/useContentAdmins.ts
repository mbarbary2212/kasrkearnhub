import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContentAdmin {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

async function fetchModuleAdmins(moduleId: string): Promise<ContentAdmin[]> {
  const { data, error } = await supabase
    .from('module_admins')
    .select('user_id, profiles!module_admins_user_id_fkey(id, full_name, avatar_url, email)')
    .eq('module_id', moduleId);

  if (error || !data) return [];

  const seen = new Set<string>();
  const admins: ContentAdmin[] = [];
  for (const row of data) {
    const p = row.profiles as any;
    if (!p || seen.has(p.id)) continue;
    seen.add(p.id);
    admins.push({
      id: p.id,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      email: p.email,
    });
  }
  return admins;
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
      // Try chapter-level topic_admins first
      const { data: topicData } = await supabase
        .from('topic_admins')
        .select('user_id, profiles!topic_admins_user_id_fkey(id, full_name, avatar_url, email)')
        .eq('chapter_id', chapterId!);

      const seen = new Set<string>();
      const chapterAdmins: ContentAdmin[] = [];
      if (topicData) {
        for (const row of topicData) {
          const p = row.profiles as any;
          if (!p || seen.has(p.id)) continue;
          seen.add(p.id);
          chapterAdmins.push({
            id: p.id,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            email: p.email,
          });
        }
      }

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
