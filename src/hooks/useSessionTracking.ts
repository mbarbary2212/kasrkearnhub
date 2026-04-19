import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const CLIENT_ID_KEY = 'session_client_id';
const SESSION_ID_KEY = 'current_session_id';
const HEARTBEAT_INTERVAL = 60000; // 60 seconds

function getOrCreateClientId(): string {
  let clientId = localStorage.getItem(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }
  return clientId;
}

export function useSessionTracking(userId: string | null | undefined) {
  const sessionIdRef = useRef<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSession = useCallback(async () => {
    if (!userId) return;

    try {
      const clientId = getOrCreateClientId();
      const userAgent = navigator.userAgent;

      // Check if there's an existing active session for this client
      const existingSessionId = localStorage.getItem(SESSION_ID_KEY);
      if (existingSessionId) {
        // Try to resume existing session
        const { data: existingSession } = await supabase
          .from('user_sessions')
          .select('id, session_end')
          .eq('id', existingSessionId)
          .eq('user_id', userId)
          .maybeSingle();

        // Defensive cleanup: remove dead session ID from localStorage
        if (!existingSession || existingSession.session_end) {
          localStorage.removeItem(SESSION_ID_KEY);
        }

        if (existingSession && !existingSession.session_end) {
          // Resume existing session
          sessionIdRef.current = existingSessionId;
          await updateHeartbeat();
          return;
        }
      }

      // Create new session
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          client_id: clientId,
          user_agent: userAgent,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to start session:', error);
        return;
      }

      sessionIdRef.current = data.id;
      localStorage.setItem(SESSION_ID_KEY, data.id);
    } catch (err) {
      console.error('Session tracking error:', err);
    }
  }, [userId]);

  const updateHeartbeat = useCallback(async () => {
    if (!sessionIdRef.current || !userId) return;

    try {
      await supabase
        .from('user_sessions')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', sessionIdRef.current)
        .eq('user_id', userId);
    } catch (err) {
      console.error('Heartbeat update error:', err);
    }
  }, [userId]);

  const endSession = useCallback(async () => {
    if (!sessionIdRef.current || !userId) return;

    try {
      const { data: session } = await supabase
        .from('user_sessions')
        .select('session_start')
        .eq('id', sessionIdRef.current)
        .single();

      if (session) {
        const sessionStart = new Date(session.session_start);
        const now = new Date();
        const durationSeconds = Math.floor((now.getTime() - sessionStart.getTime()) / 1000);

        await supabase
          .from('user_sessions')
          .update({
            session_end: now.toISOString(),
            last_seen_at: now.toISOString(),
            duration_seconds: durationSeconds,
          })
          .eq('id', sessionIdRef.current);
      }

      localStorage.removeItem(SESSION_ID_KEY);
      sessionIdRef.current = null;
    } catch (err) {
      console.error('End session error:', err);
    }
  }, [userId]);

  // Keep access token ref in sync for synchronous reads in unload handler
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      accessTokenRef.current = session?.access_token ?? null;
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (userId) {
      startSession();

      // Start heartbeat interval
      heartbeatIntervalRef.current = setInterval(updateHeartbeat, HEARTBEAT_INTERVAL);

      // Handle page visibility changes
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          updateHeartbeat();
        }
      };

      // Handle beforeunload — use keepalive fetch with auth headers
      const handleBeforeUnload = () => {
        const token = accessTokenRef.current;
        if (sessionIdRef.current && token) {
          fetch(`${SUPABASE_URL}/rest/v1/user_sessions?id=eq.${sessionIdRef.current}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ last_seen_at: new Date().toISOString() }),
            keepalive: true,
          });
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    } else {
      // User logged out
      if (sessionIdRef.current) {
        endSession();
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    }
  }, [userId, startSession, updateHeartbeat, endSession]);

  return { endSession };
}
