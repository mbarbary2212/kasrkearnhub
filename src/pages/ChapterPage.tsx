import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useModule } from '@/hooks/useModules';
import { useChapter } from '@/hooks/useChapters';
import { useAuthContext } from '@/contexts/AuthContext';
import { AdminContentActions } from '@/components/admin/AdminContentActions';
import { LectureList } from '@/components/content/LectureList';
import { ResourcesTabContent } from '@/components/content/ResourcesTabContent';
import { McqList } from '@/components/content/McqList';
import PracticalList from '@/components/content/PracticalList';
import EssayList from '@/components/content/EssayList';
import CaseScenarioList from '@/components/content/CaseScenarioList';
import { CaseScenarioFormModal } from '@/components/content/CaseScenarioFormModal';
import { CaseScenarioBulkUploadModal } from '@/components/content/CaseScenarioBulkUploadModal';
import { 
  useChapterLectures, 
  useChapterResources, 
  useChapterEssays, 
  useChapterPracticals
} from '@/hooks/useChapterContent';
import { FlashcardsTab } from '@/components/study/FlashcardsTab';
import { StudyResourceFormModal } from '@/components/study/StudyResourceFormModal';
import { StudyBulkUploadModal } from '@/components/study/StudyBulkUploadModal';
import { useChapterStudyResources, StudyResource } from '@/hooks/useStudyResources';
import { useChapterCaseScenarios } from '@/hooks/useCaseScenarios';
import { useChapterMcqs } from '@/hooks/useMcqs';
import { 
  ArrowLeft, 
  Video, 
  FileText, 
  HelpCircle, 
  PenTool, 
  FlaskConical,
  Stethoscope,
  Plus,
  Upload,
  Layers,
  Image,
  FolderOpen,
  GraduationCap,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function ChapterPage() {
  const { moduleId, chapterId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isTeacher, isSuperAdmin } = useAuthContext();

  const canManageContent = isAdmin || isTeacher;

  // State for active tab and reset key for lectures
  const [activeTab, setActiveTab] = useState("lectures");
  const [lecturesResetKey, setLecturesResetKey] = useState(0);

  // State for Case Scenarios modals
  const [caseFormOpen, setCaseFormOpen] = useState(false);
  const [caseBulkUploadOpen, setCaseBulkUploadOpen] = useState(false);

  // State for Flashcard modals
  const [flashcardFormOpen, setFlashcardFormOpen] = useState(false);
  const [flashcardBulkOpen, setFlashcardBulkOpen] = useState(false);
  const [editingFlashcard, setEditingFlashcard] = useState<StudyResource | null>(null);

  // Clicking the Lectures tab always resets to list view
  const handleTabChange = (value: string) => {
    if (value === "lectures") {
      setLecturesResetKey((k) => k + 1);
    }
    setActiveTab(value);
  };

  const { data: module, isLoading: moduleLoading } = useModule(moduleId || '');
  const { data: chapter, isLoading: chapterLoading } = useChapter(chapterId);
  const { data: lectures, isLoading: lecturesLoading } = useChapterLectures(chapterId);
  const { data: resources, isLoading: resourcesLoading } = useChapterResources(chapterId);
  const { data: mcqs, isLoading: mcqsLoading } = useChapterMcqs(chapterId);
  const { data: essays, isLoading: essaysLoading } = useChapterEssays(chapterId);
  const { data: practicals, isLoading: practicalsLoading } = useChapterPracticals(chapterId);
  const { data: caseScenarios, isLoading: caseScenariosLoading } = useChapterCaseScenarios(chapterId);
  const { data: studyResources, isLoading: studyResourcesLoading } = useChapterStudyResources(chapterId);

  // Filter flashcards from study resources
  const flashcards = studyResources?.filter(r => r.resource_type === 'flashcard') || [];

  const handleEditFlashcard = (resource: StudyResource) => {
    setEditingFlashcard(resource);
    setFlashcardFormOpen(true);
  };

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

        {/* Resources Section Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FolderOpen className="w-4 h-4" />
            <span>Resources</span>
          </div>
          
          {/* Resources Tabs: Lectures, Flashcards, Documents */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TooltipProvider delayDuration={300}>
              <TabsList className="grid w-full grid-cols-3 h-auto mb-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="lectures" className="flex flex-col items-center gap-1 py-2 md:py-3">
                      <Video className="w-5 h-5 md:w-4 md:h-4" />
                      <div className="flex items-center gap-1">
                        <span className="text-xs hidden md:inline">Lectures</span>
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">{lectures?.length || 0}</Badge>
                      </div>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent className="md:hidden">Lectures</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="flashcards" className="flex flex-col items-center gap-1 py-2 md:py-3">
                      <Layers className="w-5 h-5 md:w-4 md:h-4" />
                      <div className="flex items-center gap-1">
                        <span className="text-xs hidden md:inline">Flashcards</span>
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">{flashcards.length}</Badge>
                      </div>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent className="md:hidden">Flashcards</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="documents" className="flex flex-col items-center gap-1 py-2 md:py-3">
                      <FileText className="w-5 h-5 md:w-4 md:h-4" />
                      <div className="flex items-center gap-1">
                        <span className="text-xs hidden md:inline">Documents</span>
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">{resources?.length || 0}</Badge>
                      </div>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent className="md:hidden">Documents</TooltipContent>
                </Tooltip>
              </TabsList>
            </TooltipProvider>

            {/* Lectures Tab */}
            <TabsContent value="lectures" className="mt-4">
              {canManageContent && chapterId && moduleId && (
                <div className="mb-4">
                  <AdminContentActions chapterId={chapterId} moduleId={moduleId} contentType="lecture" />
                </div>
              )}
              {lecturesLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : (
                <LectureList 
                  key={lecturesResetKey}
                  lectures={lectures || []} 
                  moduleId={moduleId}
                  chapterId={chapterId}
                  canEdit={canManageContent}
                  canDelete={canManageContent}
                  showFeedback={true}
                />
              )}
            </TabsContent>

            {/* Flashcards Tab - using existing FlashcardsTab component */}
            <TabsContent value="flashcards" className="mt-4">
              {canManageContent && chapterId && moduleId && (
                <div className="flex gap-2 mb-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingFlashcard(null);
                      setFlashcardFormOpen(true);
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Flashcard
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFlashcardBulkOpen(true)}
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    Bulk Upload
                  </Button>
                </div>
              )}
              {studyResourcesLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : (
                <FlashcardsTab
                  resources={flashcards}
                  canManage={canManageContent}
                  onEdit={handleEditFlashcard}
                />
              )}
            </TabsContent>

            {/* Documents Tab (formerly Resources) */}
            <TabsContent value="documents" className="mt-4">
              {chapterId && moduleId && (
                <ResourcesTabContent
                  chapterId={chapterId}
                  moduleId={moduleId}
                  resources={resources || []}
                  resourcesLoading={resourcesLoading}
                  canManageContent={canManageContent}
                  isSuperAdmin={isSuperAdmin}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Practice Section Header */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <GraduationCap className="w-4 h-4" />
            <span>Practice</span>
          </div>
          
          {/* Practice Tabs: MCQ, Short Essays, Cases, OSCE/Practical, Image Questions */}
          <Tabs defaultValue="mcqs" className="w-full">
            <TooltipProvider delayDuration={300}>
              <TabsList className="grid w-full grid-cols-5 h-auto mb-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="mcqs" className="flex flex-col items-center gap-1 py-2 md:py-3">
                      <HelpCircle className="w-5 h-5 md:w-4 md:h-4" />
                      <div className="flex items-center gap-1">
                        <span className="text-xs hidden md:inline">MCQ</span>
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">{mcqs?.length || 0}</Badge>
                      </div>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent className="md:hidden">MCQs</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="essays" className="flex flex-col items-center gap-1 py-2 md:py-3">
                      <PenTool className="w-5 h-5 md:w-4 md:h-4" />
                      <div className="flex items-center gap-1">
                        <span className="text-xs hidden md:inline">Short Essays</span>
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">{essays?.length || 0}</Badge>
                      </div>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent className="md:hidden">Short Essays</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="cases" className="flex flex-col items-center gap-1 py-2 md:py-3">
                      <Stethoscope className="w-5 h-5 md:w-4 md:h-4" />
                      <div className="flex items-center gap-1">
                        <span className="text-xs hidden md:inline">Cases</span>
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">{caseScenarios?.length || 0}</Badge>
                      </div>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent className="md:hidden">Cases</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="practical" className="flex flex-col items-center gap-1 py-2 md:py-3">
                      <FlaskConical className="w-5 h-5 md:w-4 md:h-4" />
                      <div className="flex items-center gap-1">
                        <span className="text-xs hidden md:inline">OSCE/Practical</span>
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">{practicals?.length || 0}</Badge>
                      </div>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent className="md:hidden">OSCE/Practical</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="images" className="flex flex-col items-center gap-1 py-2 md:py-3">
                      <Image className="w-5 h-5 md:w-4 md:h-4" />
                      <div className="flex items-center gap-1">
                        <span className="text-xs hidden md:inline">Images</span>
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">0</Badge>
                      </div>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent className="md:hidden">Image Questions</TooltipContent>
                </Tooltip>
              </TabsList>
            </TooltipProvider>

            {/* MCQs Tab */}
            <TabsContent value="mcqs" className="mt-4">
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

            {/* Short Essays Tab (renamed from Short Questions) */}
            <TabsContent value="essays" className="mt-4">
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

            {/* Case Scenarios Tab */}
            <TabsContent value="cases" className="mt-4">
              {canManageContent && chapterId && moduleId && (
                <div className="mb-4 flex gap-2">
                  <Button size="sm" onClick={() => setCaseFormOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Case
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setCaseBulkUploadOpen(true)}>
                    <Upload className="w-4 h-4 mr-1" />
                    Bulk Upload
                  </Button>
                </div>
              )}
              {caseScenariosLoading ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                </div>
              ) : (
                <CaseScenarioList
                  cases={caseScenarios || []}
                  moduleId={moduleId}
                  chapterId={chapterId}
                  canEdit={canManageContent}
                  canDelete={canManageContent}
                />
              )}
            </TabsContent>

            {/* OSCE/Practical Tab */}
            <TabsContent value="practical" className="mt-4">
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

            {/* Image Questions Tab (placeholder) */}
            <TabsContent value="images" className="mt-4">
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Image className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">Image questions coming soon.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Case Scenario Modals */}
        {chapterId && moduleId && (
          <>
            <CaseScenarioFormModal
              open={caseFormOpen}
              onOpenChange={setCaseFormOpen}
              moduleId={moduleId}
              chapterId={chapterId}
            />
            <CaseScenarioBulkUploadModal
              open={caseBulkUploadOpen}
              onOpenChange={setCaseBulkUploadOpen}
              moduleId={moduleId}
              chapterId={chapterId}
            />
          </>
        )}

        {/* Flashcard Modals */}
        {chapterId && moduleId && (
          <>
            <StudyResourceFormModal
              open={flashcardFormOpen}
              onOpenChange={setFlashcardFormOpen}
              chapterId={chapterId}
              moduleId={moduleId}
              resourceType="flashcard"
              resource={editingFlashcard}
            />
            <StudyBulkUploadModal
              open={flashcardBulkOpen}
              onOpenChange={setFlashcardBulkOpen}
              chapterId={chapterId}
              moduleId={moduleId}
              resourceType="flashcard"
            />
          </>
        )}
      </div>
    </MainLayout>
  );
}
