import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useModule } from '@/hooks/useModules';
import { useChapter } from '@/hooks/useChapters';
import { useAuthContext } from '@/contexts/AuthContext';
import { AdminContentActions } from '@/components/admin/AdminContentActions';
import VideoList from '@/components/content/VideoList';
import ResourceList from '@/components/content/ResourceList';
import { StudyResourcesSection } from '@/components/study/StudyResourcesSection';
import { McqList } from '@/components/content/McqList';
import PracticalList from '@/components/content/PracticalList';
import EssayList from '@/components/content/EssayList';
import { 
  useChapterLectures, 
  useChapterResources, 
  useChapterEssays, 
  useChapterPracticals
} from '@/hooks/useChapterContent';
import { useChapterMcqs } from '@/hooks/useMcqs';
import { 
  ArrowLeft, 
  Video, 
  FileText, 
  HelpCircle, 
  PenTool, 
  FlaskConical,
  Layers,
} from 'lucide-react';

export default function ChapterPage() {
  const { moduleId, chapterId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isTeacher, isSuperAdmin } = useAuthContext();

  const canManageContent = isAdmin || isTeacher;

  const { data: module, isLoading: moduleLoading } = useModule(moduleId || '');
  const { data: chapter, isLoading: chapterLoading } = useChapter(chapterId);
  const { data: lectures, isLoading: lecturesLoading } = useChapterLectures(chapterId);
  const { data: resources, isLoading: resourcesLoading } = useChapterResources(chapterId);
  const { data: mcqs, isLoading: mcqsLoading } = useChapterMcqs(chapterId);
  const { data: essays, isLoading: essaysLoading } = useChapterEssays(chapterId);
  const { data: practicals, isLoading: practicalsLoading } = useChapterPracticals(chapterId);

  if (!chapterLoading && !chapter) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Chapter not found.</p>
          <Button onClick={() => navigate(`/module/${moduleId}`)} className="mt-4">
            Back to Module
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/module/${moduleId}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            {(moduleLoading || chapterLoading) ? (
              <>
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-8 w-96" />
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{module?.name}</p>
                <h1 className="text-2xl font-heading font-semibold">
                  Chapter {chapter?.chapter_number}: {chapter?.title}
                </h1>
              </>
            )}
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-auto">
            <TabsTrigger value="videos" className="flex flex-col gap-1 py-3">
              <Video className="w-4 h-4" />
              <span className="text-xs">Videos</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex flex-col gap-1 py-3">
              <FileText className="w-4 h-4" />
              <span className="text-xs">Resources</span>
            </TabsTrigger>
            <TabsTrigger value="mcqs" className="flex flex-col gap-1 py-3">
              <HelpCircle className="w-4 h-4" />
              <span className="text-xs">MCQs</span>
            </TabsTrigger>
            <TabsTrigger value="practical" className="flex flex-col gap-1 py-3">
              <FlaskConical className="w-4 h-4" />
              <span className="text-xs">Practical</span>
            </TabsTrigger>
            <TabsTrigger value="saqs" className="flex flex-col gap-1 py-3">
              <PenTool className="w-4 h-4" />
              <span className="text-xs">Short Qs</span>
            </TabsTrigger>
          </TabsList>

          {/* Videos Tab */}
          <TabsContent value="videos" className="mt-6">
            {canManageContent && chapterId && moduleId && (
              <div className="mb-4">
                <AdminContentActions chapterId={chapterId} moduleId={moduleId} contentType="lecture" />
              </div>
            )}
            {lecturesLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="aspect-video" />)}
              </div>
            ) : (
              <VideoList 
                videos={lectures || []} 
                moduleId={moduleId}
                chapterId={chapterId}
                canEdit={canManageContent}
                canDelete={canManageContent}
                showFeedback={true}
              />
            )}
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="mt-6 space-y-6">
            {/* Documents Section - no accordion header */}
            <div>
              {canManageContent && chapterId && moduleId && (
                <div className="mb-4">
                  <AdminContentActions chapterId={chapterId} moduleId={moduleId} contentType="resource" />
                </div>
              )}
              {resourcesLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : (
                <ResourceList
                  resources={resources || []}
                  moduleId={moduleId}
                  chapterId={chapterId}
                  canEdit={canManageContent}
                  canDelete={canManageContent}
                  showFeedback={true}
                />
              )}
            </div>

            {/* Study Resources Section */}
            {chapterId && moduleId && (
              <StudyResourcesSection
                chapterId={chapterId}
                moduleId={moduleId}
                canManage={canManageContent}
                isSuperAdmin={isSuperAdmin}
              />
            )}
          </TabsContent>

          {/* MCQs Tab */}
          <TabsContent value="mcqs" className="mt-6">
            {mcqsLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : (
              <McqList
                mcqs={mcqs || []}
                moduleId={moduleId || ''}
                chapterId={chapterId}
                isAdmin={canManageContent}
              />
            )}
          </TabsContent>

          {/* Practical Tab */}
          <TabsContent value="practical" className="mt-6">
            {canManageContent && chapterId && moduleId && (
              <div className="mb-4">
                <AdminContentActions chapterId={chapterId} moduleId={moduleId} contentType="practical" />
              </div>
            )}
            {practicalsLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : (
              <PracticalList
                practicals={practicals || []}
                moduleId={moduleId}
                chapterId={chapterId}
                canEdit={canManageContent}
                canDelete={canManageContent}
                showFeedback={true}
              />
            )}
          </TabsContent>

          {/* Short Questions Tab */}
          <TabsContent value="saqs" className="mt-6">
            {canManageContent && chapterId && moduleId && (
              <div className="mb-4">
                <AdminContentActions chapterId={chapterId} moduleId={moduleId} contentType="essay" />
              </div>
            )}
            {essaysLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : (
              <EssayList
                essays={essays || []}
                moduleId={moduleId}
                chapterId={chapterId}
                canEdit={canManageContent}
                canDelete={canManageContent}
                showFeedback={true}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
