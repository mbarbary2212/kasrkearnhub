import MainLayout from '@/components/layout/MainLayout';
import { StudentDashboard } from '@/components/dashboard';
import { useAuthContext } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function ProgressPage() {
  const { user } = useAuthContext();

  // Redirect to home if not logged in
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout>
      <StudentDashboard />
    </MainLayout>
  );
}
