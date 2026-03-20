import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface PresenceUserState {
  user_id: string;
  role: string;
  year_id?: string;
  module_name?: string;
  topic_name?: string;
  page: string;
  section_mode?: string;
  active_tab?: string;
}

export interface OnlineUser {
  presence_ref: string;
  state: PresenceUserState;
}

interface PresenceContextType {
  updatePresence: (pageState: Omit<PresenceUserState, 'user_id' | 'role'>) => void;
  onlineUsers: OnlineUser[];
  onlineCount: number;
  wsCount: number;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

const CHANNEL_NAME = 'platform-presence';

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user, profile, role } = useAuthContext();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const baseStateRef = useRef<Pick<PresenceUserState, 'user_id' | 'role' | 'year_id'> | null>(null);
  const currentStateRef = useRef<PresenceUserState | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [wsCount, setWsCount] = useState(0);

  const updatePresence = useCallback((pageState: Omit<PresenceUserState, 'user_id' | 'role'>) => {
    if (!channelRef.current || !baseStateRef.current) return;
    currentStateRef.current = {
      ...baseStateRef.current,
      ...pageState,
    };
    channelRef.current.track(currentStateRef.current);
  }, []);

  // Channel lifecycle: create/destroy on user login/logout
  useEffect(() => {
    if (!user?.id) {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        currentStateRef.current = null;
        baseStateRef.current = null;
      }
      setOnlineUsers([]);
      return;
    }

    const initialBase = {
      user_id: user.id,
      role: role || 'student',
      year_id: profile?.preferred_year_id ?? undefined,
    };
    baseStateRef.current = initialBase;
    currentStateRef.current = { ...initialBase, page: 'home' };

    const channel = supabase.channel(CHANNEL_NAME, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUserState>();
        const users: OnlineUser[] = [];
        let totalConnections = 0;
        for (const [, presences] of Object.entries(state)) {
          totalConnections += presences.length;
          // Use the most recent presence (last in array) to represent this user
          const latest = presences[presences.length - 1] as unknown as PresenceUserState & { presence_ref: string };
          users.push({ presence_ref: latest.presence_ref, state: latest });
        }
        setOnlineUsers(users);
        setWsCount(totalConnections);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && currentStateRef.current) {
          await channel.track(currentStateRef.current);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Update base state when role or preferred year loads after channel creation
  useEffect(() => {
    if (!user?.id || !channelRef.current) return;
    const newBase = {
      user_id: user.id,
      role: role || 'student',
      year_id: profile?.preferred_year_id ?? undefined,
    };
    baseStateRef.current = newBase;
    if (currentStateRef.current) {
      currentStateRef.current = { ...currentStateRef.current, ...newBase };
      channelRef.current.track(currentStateRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, profile?.preferred_year_id]);

  return (
    <PresenceContext.Provider value={{ updatePresence, onlineUsers, onlineCount: onlineUsers.length, wsCount }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error('usePresence must be used within a PresenceProvider');
  }
  return context;
}
