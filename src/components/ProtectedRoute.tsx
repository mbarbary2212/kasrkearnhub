import { ReactNode, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import type { AppRole } from '@/types/database';

interface ProtectedRouteProps {
  requiredRole?: AppRole;
  children: ReactNode;
}

export function ProtectedRoute({ requiredRole, children }: ProtectedRouteProps) {
  const { initialLoading, user, hasRole, isLoading } = useAuthContext();
  const hasShownToast = useRef(false);

  const shouldDeny = !isLoading && !initialLoading && user && requiredRole && !hasRole(requiredRole);

  useEffect(() => {
    if (shouldDeny && !hasShownToast.current) {
      hasShownToast.current = true;
      toast.error("You don't have permission to access this page");
    }
  }, [shouldDeny]);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate replace to="/auth" />;
  }

  if (shouldDeny) {
    return <Navigate replace to="/" />;
  }

  return <>{children}</>;
}
