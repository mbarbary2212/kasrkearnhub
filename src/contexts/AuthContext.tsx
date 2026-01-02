import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSessionTracking } from '@/hooks/useSessionTracking';
import { useUserStatus } from '@/hooks/useUserStatus';
import { BlockedUserScreen } from '@/components/auth/BlockedUserScreen';

type AuthContextType = ReturnType<typeof useAuth>;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  
  // Track user sessions (heartbeat updates)
  useSessionTracking(auth.user?.id);
  
  // Check if user is blocked
  const { isBlocked, blockMessage, loading: statusLoading } = useUserStatus(auth.user?.id);

  // Show blocked screen if user is banned/removed
  if (auth.user && !statusLoading && isBlocked) {
    return <BlockedUserScreen message={blockMessage} />;
  }

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

// Keep backwards compatibility
export { useAuthContext as useAuth };
