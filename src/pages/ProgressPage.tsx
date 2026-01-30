import MainLayout from '@/components/layout/MainLayout';
import { StudentDashboard } from '@/components/dashboard';
import { useAuthContext } from '@/contexts/AuthContext';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { Navigate } from 'react-router-dom';

export default function ProgressPage() {
  const { user, isAdmin } = useAuthContext();
  const { isSupportMode } = useEffectiveUser();

  // Redirect to home if not logged in
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Only redirect admins if NOT in support mode (impersonation or preview)
  if (isAdmin && !isSupportMode) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <MainLayout>
      <StudentDashboard />
    </MainLayout>
  );
}
