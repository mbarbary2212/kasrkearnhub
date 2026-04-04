import MainLayout from '@/components/layout/MainLayout';
import { StudentDashboard } from '@/components/dashboard';
import { useAuthContext } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { ContextGuide } from '@/components/guidance/ContextGuide';

export default function ProgressPage() {
  const { user } = useAuthContext();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout>
      <ContextGuide
        title="Track your performance"
        description="Focus on weak areas and maintain your strengths."
        alwaysShow
        variant="info"
      />
      <StudentDashboard />
    </MainLayout>
  );
}
