import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { ChapterProgressBar } from '@/components/content/ChapterProgressBar';
import { 
  useChapterLectures, 
  useChapterResources, 
  useChapterEssays, 
  useChapterPracticals
} from '@/hooks/useChapterContent';
import { useChapterProgress } from '@/hooks/useChapterProgress';
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
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SectionMode = 'resources' | 'practice' | 'connect';
type ResourcesTab = 'lectures' | 'flashcards' | 'documents';
type PracticeTab = 'mcqs' | 'essays' | 'cases' | 'practical' | 'images';

export default function ChapterPage() {
  const { moduleId, chapterId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isTeacher, isSuperAdmin } = useAuthContext();

  const canManageContent = isAdmin || isTeacher;

  // State for section mode and active tabs within sections
  const [activeSection, setActiveSection] = useState<SectionMode>('resources');
  const [resourcesTab, setResourcesTab] = useState<ResourcesTab>('lectures');
  const [practiceTab, setPracticeTab] = useState<PracticeTab>('mcqs');
  const [lecturesResetKey, setLecturesResetKey] = useState(0);

  // State for Case Scenarios modals
  const [caseFormOpen, setCaseFormOpen] = useState(false);
  const [caseBulkUploadOpen, setCaseBulkUploadOpen] = useState(false);

  // State for Flashcard modals
  const [flashcardFormOpen, setFlashcardFormOpen] = useState(false);
  const [flashcardBulkOpen, setFlashcardBulkOpen] = useState(false);
  const [editingFlashcard, setEditingFlashcard] = useState<StudyResource | null>(null);

  const { data: module, isLoading: moduleLoading } = useModule(moduleId || '');
  const { data: chapter, isLoading: chapterLoading } = useChapter(chapterId);
  const { data: lectures, isLoading: lecturesLoading } = useChapterLectures(chapterId);
  const { data: resources, isLoading: resourcesLoading } = useChapterResources(chapterId);
  const { data: mcqs, isLoading: mcqsLoading } = useChapterMcqs(chapterId);
  const { data: essays, isLoading: essaysLoading } = useChapterEssays(chapterId);
  const { data: practicals, isLoading: practicalsLoading } = useChapterPracticals(chapterId);
  const { data: caseScenarios, isLoading: caseScenariosLoading } = useChapterCaseScenarios(chapterId);
  const { data: studyResources, isLoading: studyResourcesLoading } = useChapterStudyResources(chapterId);
  const { data: chapterProgress, isLoading: progressLoading } = useChapterProgress(chapterId);

  // Filter flashcards from study resources
  const flashcards = studyResources?.filter(r => r.resource_type === 'flashcard') || [];

  const handleEditFlashcard = (resource: StudyResource) => {
    setEditingFlashcard(resource);
    setFlashcardFormOpen(true);
  };

  const handleResourcesTabChange = (tab: ResourcesTab) => {
    if (tab === 'lectures') {
      setLecturesResetKey((k) => k + 1);
    }
    setResourcesTab(tab);
  };

  // Progress is now calculated from useChapterProgress hook

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

  // Section navigation items
  const sectionNav = [
    { id: 'resources' as SectionMode, label: 'Resources', icon: FolderOpen },
    { id: 'practice' as SectionMode, label: 'Self Assessment', icon: GraduationCap },
    { id: 'connect' as SectionMode, label: 'Connect', icon: MessageCircle },
  ];

  // Resources sub-tabs
  const resourcesTabs = [
    { id: 'lectures' as ResourcesTab, label: 'Lectures', icon: Video, count: lectures?.length || 0 },
    { id: 'flashcards' as ResourcesTab, label: 'Flashcards', icon: Layers, count: flashcards.length },
    { id: 'documents' as ResourcesTab, label: 'Documents', icon: FileText, count: resources?.length || 0 },
  ];

  // Practice sub-tabs
  const practiceTabs = [
    { id: 'mcqs' as PracticeTab, label: 'MCQ', icon: HelpCircle, count: mcqs?.length || 0 },
    { id: 'essays' as PracticeTab, label: 'Short Essays', icon: PenTool, count: essays?.length || 0 },
    { id: 'cases' as PracticeTab, label: 'Cases', icon: Stethoscope, count: caseScenarios?.length || 0 },
    { id: 'practical' as PracticeTab, label: 'OSCE/Practical', icon: FlaskConical, count: practicals?.length || 0 },
    { id: 'images' as PracticeTab, label: 'Images', icon: Image, count: 0 },
  ];

  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in">
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

        {/* Chapter Progress Bar */}
        <ChapterProgressBar
          totalProgress={chapterProgress?.totalProgress || 0}
          resourcesProgress={chapterProgress?.resourcesProgress || 0}
          practiceProgress={chapterProgress?.practiceProgress || 0}
          resourcesCompleted={chapterProgress?.resourcesCompleted || 0}
          resourcesTotal={chapterProgress?.resourcesTotal || 0}
          practiceCompleted={chapterProgress?.practiceCompleted || 0}
          practiceTotal={chapterProgress?.practiceTotal || 0}
          isLoading={progressLoading}
        />

        {/* Main Content Layout: Left Nav Rail + Content Area */}
        <div className="flex flex-col md:flex-row">
          {/* Mobile: Horizontal Navigation Tabs (only on small screens) */}
          <div className="md:hidden mb-4">
            <nav className="flex gap-2 bg-muted/30 rounded-lg p-2">
              {sectionNav.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Desktop: Fixed-Width Vertical Navigation Rail (hidden on mobile) */}
          <div className="hidden md:block w-[180px] flex-shrink-0">
            <nav className="sticky top-4 bg-muted/30 rounded-lg p-2">
              <div className="flex flex-col gap-1">
                {sectionNav.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors text-left",
                        isActive 
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{section.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Vertical Divider (hidden on mobile) */}
          <div className="hidden md:block w-px bg-border/50 mx-4 self-stretch min-h-[200px]" />

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Resources Section */}
            {activeSection === 'resources' && (
              <div className="space-y-4">
                {/* Sub-tabs for Resources */}
                <div className="flex gap-2 flex-wrap">
                  {resourcesTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = resourcesTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleResourcesTabChange(tab.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all",
                          isActive 
                            ? "bg-accent text-accent-foreground font-medium shadow-sm" 
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{tab.count}</Badge>
                      </button>
                    );
                  })}
                </div>

                {/* Lectures Content */}
                {resourcesTab === 'lectures' && (
                  <div>
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
                  </div>
                )}

                {/* Flashcards Content (as cards) */}
                {resourcesTab === 'flashcards' && (
                  <div>
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
                  </div>
                )}

                {/* Documents Content (simple list, no cards) */}
                {resourcesTab === 'documents' && (
                  <div>
                    {canManageContent && chapterId && moduleId ? (
                      <ResourcesTabContent
                        chapterId={chapterId}
                        moduleId={moduleId}
                        resources={resources || []}
                        resourcesLoading={resourcesLoading}
                        canManageContent={canManageContent}
                        isSuperAdmin={isSuperAdmin}
                      />
                    ) : (
                      // Simple list view for students
                      <div className="space-y-1">
                        {resourcesLoading ? (
                          <div className="space-y-2">
                            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}
                          </div>
                        ) : resources && resources.length > 0 ? (
                          resources.map((resource) => (
                            <a
                              key={resource.id}
                              href={resource.file_url || resource.external_url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group"
                            >
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <span className="flex-1 text-sm">{resource.title}</span>
                              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground py-4 text-center">No documents available.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Practice Section */}
            {activeSection === 'practice' && (
              <div className="space-y-4">
                {/* Sub-tabs for Practice */}
                <div className="flex gap-2 flex-wrap">
                  {practiceTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = practiceTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setPracticeTab(tab.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all",
                          isActive 
                            ? "bg-accent text-accent-foreground font-medium shadow-sm" 
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{tab.count}</Badge>
                      </button>
                    );
                  })}
                </div>

                {/* MCQs Content */}
                {practiceTab === 'mcqs' && (
                  <div>
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
                  </div>
                )}

                {/* Short Essays Content */}
                {practiceTab === 'essays' && (
                  <div>
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
                  </div>
                )}

                {/* Cases Content */}
                {practiceTab === 'cases' && (
                  <div>
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
                  </div>
                )}

                {/* OSCE/Practical Content */}
                {practiceTab === 'practical' && (
                  <div>
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
                  </div>
                )}

                {/* Image Questions Content (placeholder) */}
                {practiceTab === 'images' && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Image className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Image questions coming soon.</p>
                  </div>
                )}
              </div>
            )}

            {/* Connect Section (placeholder) */}
            {activeSection === 'connect' && (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-2">Connect</h3>
                <p className="text-muted-foreground text-sm">Discussion forums and study groups coming soon.</p>
              </div>
            )}
          </div>
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
