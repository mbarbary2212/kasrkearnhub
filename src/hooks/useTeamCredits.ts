import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamCredit {
  id: string;
  name: string;
  role: string;
  email: string | null;
  photo_url: string | null;
  display_order: number;
  is_active: boolean;
  /** Linked profile id (when team_credits.email matches a real user). */
  linked_user_id?: string | null;
}

/**
 * Enrich a list of team credits with the matching profile by email:
 *  - If a profile shares the same (case-insensitive) email, prefer that
 *    profile's avatar_url and full_name for display.
 *  - Stored role / display_order / is_active stay as the source of truth.
 */
async function enrichWithProfiles(rows: TeamCredit[]): Promise<TeamCredit[]> {
  const emails = Array.from(
    new Set(
      rows
        .map((r) => (r.email ?? '').trim().toLowerCase())
        .filter((e) => e.length > 0),
    ),
  );
  if (emails.length === 0) return rows;

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url')
    .in('email', emails);

  // If profiles select fails (e.g., RLS), silently fall back to stored values.
  if (error || !profiles) return rows;

  const byEmail = new Map<string, { id: string; full_name: string | null; avatar_url: string | null }>();
  for (const p of profiles) {
    const key = (p.email ?? '').trim().toLowerCase();
    if (key) byEmail.set(key, { id: p.id, full_name: p.full_name, avatar_url: p.avatar_url });
  }

  return rows.map((r) => {
    const key = (r.email ?? '').trim().toLowerCase();
    const match = key ? byEmail.get(key) : undefined;
    if (!match) return { ...r, linked_user_id: null };
    return {
      ...r,
      linked_user_id: match.id,
      // Prefer real profile photo if no explicit team-credit photo is set.
      photo_url: r.photo_url || match.avatar_url || null,
      // Prefer real profile name if no explicit team-credit name is set.
      name: r.name || match.full_name || r.name,
    };
  });
}

export function useTeamCredits() {
  return useQuery({
    queryKey: ['team-credits', 'active'],
    queryFn: async (): Promise<TeamCredit[]> => {
      const { data, error } = await supabase
        .from('team_credits')
        .select('id, name, role, email, photo_url, display_order, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return enrichWithProfiles((data ?? []) as TeamCredit[]);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllTeamCredits() {
  return useQuery({
    queryKey: ['team-credits', 'all'],
    queryFn: async (): Promise<TeamCredit[]> => {
      const { data, error } = await supabase
        .from('team_credits')
        .select('id, name, role, email, photo_url, display_order, is_active')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return enrichWithProfiles((data ?? []) as TeamCredit[]);
    },
  });
}
