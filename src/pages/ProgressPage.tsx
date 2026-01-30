import MainLayout from '@/components/layout/MainLayout';
import { StudentDashboard } from '@/components/dashboard';
import { useAuthContext } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function ProgressPage() {
  const { user, isAdmin } = useAuthContext();

  // Redirect to home if not logged in
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Redirect admins to admin panel
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <MainLayout>
      <StudentDashboard />
    </MainLayout>
  );
}
