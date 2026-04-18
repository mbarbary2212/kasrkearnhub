import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import { useModule } from '@/hooks/useModules';
import { useModuleChapters } from '@/hooks/useChapters';
import { useModuleMcqs } from '@/hooks/useMcqs';
import { useMockExamSettings } from '@/hooks/useMockExam';
import { MockTimedExam } from '@/components/exam';
import { useAuthContext } from '@/contexts/AuthContext';
import { YearContextBanner } from '@/components/exam/YearContextBanner';

export default function MockExamPage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuthContext();

  const { data: module, isLoading: moduleLoading } = useModule(moduleId || '');
  const { data: chapters } = useModuleChapters(moduleId);
  const { data: mcqs, isLoading: mcqsLoading } = useModuleMcqs(moduleId);
  const { data: settings, isLoading: settingsLoading } = useMockExamSettings(moduleId);

  const isLoading = moduleLoading || mcqsLoading || settingsLoading;

  // Year context (admins bypass — they may legitimately view any year)
  const preferredYearId = profile?.preferred_year_id ?? null;
  const noYearSet = !isAdmin && !preferredYearId;
  const yearMismatch =
    !isAdmin && !!preferredYearId && !!module?.year_id && module.year_id !== preferredYearId;

  const handleBack = () => {
    navigate(`/module/${moduleId}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            {moduleLoading ? (
              <>
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-8 w-96" />
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{module?.name}</p>
                <h1 className="text-2xl font-heading font-semibold flex items-center gap-2">
                  <ClipboardCheck className="w-6 h-6" />
                  Mock Timed Exam
                </h1>
              </>
            )}
          </div>
        </div>

        {/* Year context notice (non-blocking, students only) */}
        {!isLoading && (
          <YearContextBanner noYearSet={noYearSet} yearMismatch={yearMismatch} />
        )}

        {/* Exam Content */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : settings && mcqs ? (
          <MockTimedExam
            moduleId={moduleId || ''}
            moduleName={module?.name || ''}
            mcqs={mcqs}
            settings={settings}
            chapters={chapters}
            onBack={handleBack}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Unable to load exam settings.</p>
            <Button variant="outline" className="mt-4" onClick={handleBack}>
              Go Back
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
