import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { useModule } from '@/hooks/useModules';
import { useModuleChapters } from '@/hooks/useChapters';
import { useModuleMcqs } from '@/hooks/useMcqs';
import { useMockExamSettings } from '@/hooks/useMockExam';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BlueprintExamRunner } from '@/components/exam/BlueprintExamRunner';
import { PaperConfig } from '@/components/exam/ExamPaperConfig';

export default function BlueprintExamPage() {
  const { moduleId, paperIndex } = useParams();
  const navigate = useNavigate();
  const idx = parseInt(paperIndex || '0', 10);

  const { data: module, isLoading: moduleLoading } = useModule(moduleId || '');
  const { data: chapters } = useModuleChapters(moduleId);
  const { data: mcqs, isLoading: mcqsLoading } = useModuleMcqs(moduleId);
  const { data: settings, isLoading: settingsLoading } = useMockExamSettings(moduleId);

  // Fetch essays for this module — STRICT ANSWER ISOLATION: no model_answer
  const { data: essays = [], isLoading: essaysLoading } = useQuery({
    queryKey: ['module-essays', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select('id, title, question, keywords, chapter_id, rubric_json, max_points, question_type')
        .eq('module_id', moduleId!)
        .eq('is_deleted', false);
      if (error) throw error;
      return data || [];
    },
    enabled: !!moduleId,
  });

  const isLoading = moduleLoading || mcqsLoading || settingsLoading || essaysLoading;

  // Extract blueprint config
  const bp = settings?.blueprint_config as {
    categories?: string[];
    papers?: PaperConfig[];
    essay_settings?: {
      handwriting_enabled?: boolean;
      revision_enabled?: boolean;
      max_revisions?: number;
    };
  } | null;

  const papers = bp?.papers || [];
  const paper = papers[idx];
  const essaySettings = {
    handwriting_enabled: bp?.essay_settings?.handwriting_enabled ?? true,
    revision_enabled: bp?.essay_settings?.revision_enabled ?? true,
    max_revisions: bp?.essay_settings?.max_revisions ?? 1,
  };

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
                  <GraduationCap className="w-6 h-6" />
                  Final Exam Simulator
                </h1>
              </>
            )}
          </div>
        </div>

        {/* Exam Content */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : paper && mcqs ? (
          <BlueprintExamRunner
            moduleId={moduleId || ''}
            moduleName={module?.name || ''}
            paper={paper}
            mcqs={mcqs}
            essays={essays as any}
            chapters={chapters || []}
            essaySettings={essaySettings}
            onBack={handleBack}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {!paper ? 'No exam paper configured. Ask your admin to set up the Final Exam Blueprint.' : 'Unable to load exam data.'}
            </p>
            <Button variant="outline" className="mt-4" onClick={handleBack}>
              Go Back
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
