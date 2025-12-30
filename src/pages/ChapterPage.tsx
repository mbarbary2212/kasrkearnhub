import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useModule } from '@/hooks/useModules';
import { useChapter } from '@/hooks/useChapters';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAddPermissionGuard } from '@/hooks/useAddPermissionGuard';
import { LectureList } from '@/components/content/LectureList';
import { ResourcesTabContent } from '@/components/content/ResourcesTabContent';
import { McqList } from '@/components/content/McqList';
import PracticalList from '@/components/content/PracticalList';
import EssayList from '@/components/content/EssayList';
import CaseScenarioList from '@/components/content/CaseScenarioList';
import { CaseScenarioFormModal } from '@/components/content/CaseScenarioFormModal';
import { CaseScenarioBulkUploadModal } from '@/components/content/CaseScenarioBulkUploadModal';
import { ChapterProgressBar } from '@/components/content/ChapterProgressBar';
import { MatchingQuestionList } from '@/components/content/MatchingQuestionList';
import { 
  useChapterLectures, 
  useChapterResources, 
  useChapterEssays, 
  useChapterPracticals
} from '@/hooks/useChapterContent';
import { useChapterProgress } from '@/hooks/useChapterProgress';
import { useChapterMatchingQuestions } from '@/hooks/useMatchingQuestions';
import { FlashcardsTab } from '@/components/study/FlashcardsTab';
import { StudyResourceFormModal } from '@/components/study/StudyResourceFormModal';
import { StudyBulkUploadModal } from '@/components/study/StudyBulkUploadModal';
import { useChapterStudyResources, StudyResource, useHideEmptySelfAssessmentTabs } from '@/hooks/useStudyResources';
import { useChapterCaseScenarios } from '@/hooks/useCaseScenarios';
import { useChapterMcqs } from '@/hooks/useMcqs';
import { 
  createResourceTabs, 
  createPracticeTabs, 
  filterTabsForStudent,
  ResourceTabId,
  PracticeTabId,
} from '@/config/tabConfig';
import { 
  ArrowLeft, 
  FileText, 
  Plus,
  Upload,
  FolderOpen,
  GraduationCap,
  ExternalLink,
  Image,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SectionMode = 'resources' | 'practice';

export default function ChapterPage() {
  const { moduleId, chapterId } = useParams();
  const navigate = useNavigate();
  const auth = useAuthContext();
  const { guard: guardAdd, dialog: permissionDialog } = useAddPermissionGuard({ moduleId, chapterId });

  const showAddControls = !!(
    auth.isTeacher ||
    auth.isAdmin ||
    auth.isModuleAdmin ||
    auth.isTopicAdmin ||
    auth.isDepartmentAdmin ||
    auth.isPlatformAdmin ||
    auth.isSuperAdmin
  );

  // User can manage content if:
  // 1. They are a teacher/admin/platform admin/super admin (isTeacher is true for all of these)
  // 2. They can manage this specific chapter (topic admins assigned to this chapter)
  // 3. They can manage the parent module (module admins assigned to this module)
  const canManageContent = !!(
    auth.isTeacher ||
    (chapterId && auth.canManageChapter(chapterId)) ||
    (moduleId && auth.canManageModule(moduleId))
  );

  // State for section mode and active tabs within sections
  const [activeSection, setActiveSection] = useState<SectionMode>('resources');
  const [resourcesTab, setResourcesTab] = useState<ResourceTabId>('lectures');
  const [practiceTab, setPracticeTab] = useState<PracticeTabId>('mcqs');
  const [lecturesResetKey, setLecturesResetKey] = useState(0);
  const [showDeletedMcqs, setShowDeletedMcqs] = useState(false);
  const [showDeletedCases, setShowDeletedCases] = useState(false);
  const [showDeletedMatching, setShowDeletedMatching] = useState(false);
  const [showDeletedEssays, setShowDeletedEssays] = useState(false);
  const [showDeletedPracticals, setShowDeletedPracticals] = useState(false);

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
  const { data: mcqs, isLoading: mcqsLoading } = useChapterMcqs(chapterId, false);
  const { data: deletedMcqs } = useChapterMcqs(chapterId, true);
  const { data: essays, isLoading: essaysLoading } = useChapterEssays(chapterId);
  const { data: deletedEssays } = useChapterEssays(chapterId, true);
  const { data: practicals, isLoading: practicalsLoading } = useChapterPracticals(chapterId);
  const { data: deletedPracticals } = useChapterPracticals(chapterId, true);
  const { data: caseScenarios, isLoading: caseScenariosLoading } = useChapterCaseScenarios(chapterId);
  const { data: deletedCaseScenarios } = useChapterCaseScenarios(chapterId, true);
  const { data: studyResources, isLoading: studyResourcesLoading } = useChapterStudyResources(chapterId);
  const { data: chapterProgress, isLoading: progressLoading } = useChapterProgress(chapterId);
  const { data: matchingQuestions, isLoading: matchingLoading } = useChapterMatchingQuestions(chapterId);
  const { data: deletedMatchingQuestions } = useChapterMatchingQuestions(chapterId, true);
  const { data: hideEmptyTabs } = useHideEmptySelfAssessmentTabs();

  // Filter deleted MCQs only (exclude active ones)
  const deletedOnlyMcqs = (deletedMcqs || []).filter(m => m.is_deleted);
  const deletedOnlyCases = (deletedCaseScenarios || []).filter(c => c.is_deleted);
  const deletedOnlyMatching = (deletedMatchingQuestions || []).filter(m => m.is_deleted);
  const deletedOnlyEssays = (deletedEssays || []).filter(e => e.is_deleted);
  const deletedOnlyPracticals = (deletedPracticals || []).filter(p => p.is_deleted);

  // Filter flashcards from study resources
  const flashcards = studyResources?.filter(r => r.resource_type === 'flashcard') || [];
  
  // Count non-flashcard study resources (tables, algorithms, exam tips, images) for Documents tab
  const nonFlashcardStudyResources = studyResources?.filter(r => r.resource_type !== 'flashcard') || [];
  const documentsCount = (resources?.length || 0) + nonFlashcardStudyResources.length;

  const handleEditFlashcard = (resource: StudyResource) => {
    setEditingFlashcard(resource);
    setFlashcardFormOpen(true);
  };

  const handleResourcesTabChange = (tab: ResourceTabId) => {
    if (tab === 'lectures') {
      setLecturesResetKey((k) => k + 1);
    }
    setResourcesTab(tab);
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

  // Section navigation items
  const sectionNav = [
    { id: 'resources' as SectionMode, label: 'Resources', mobileLabel: 'Resources', icon: FolderOpen },
    { id: 'practice' as SectionMode, label: 'Self Assessment', mobileLabel: 'Self Assess', icon: GraduationCap },
  ];

  // Use unified tab configuration
  const resourcesTabs = createResourceTabs({
    lectures: lectures?.length || 0,
    flashcards: flashcards.length,
    documents: documentsCount,
  });

  const allPracticeTabs = createPracticeTabs({
    mcqs: mcqs?.length || 0,
    essays: essays?.length || 0,
    cases: caseScenarios?.length || 0,
    practical: practicals?.length || 0,
    matching: matchingQuestions?.length || 0,
    images: 0,
  });

  // Admin sees all tabs; students see filtered based on setting
  const practiceTabs = useMemo(() => {
    if (canManageContent) return allPracticeTabs;
    return filterTabsForStudent(allPracticeTabs, hideEmptyTabs ?? false);
  }, [canManageContent, mcqs, essays, caseScenarios, practicals, matchingQuestions, hideEmptyTabs]);

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
            <nav className="flex gap-1.5 bg-muted/30 rounded-lg p-1.5">
              {sectionNav.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{section.mobileLabel}</span>
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
                        onClick={() => handleResourcesTabChange(tab.id as ResourceTabId)}
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
                    {showAddControls && chapterId && moduleId && (
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
                    {showAddControls && chapterId && moduleId && (
                      <div className="flex gap-2 mb-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            guardAdd(() => {
                              setEditingFlashcard(null);
                              setFlashcardFormOpen(true);
                            })
                          }
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Flashcard
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => guardAdd(() => setFlashcardBulkOpen(true))}
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
                    {showAddControls && chapterId && moduleId ? (
                      <ResourcesTabContent
                        chapterId={chapterId}
                        moduleId={moduleId}
                        resources={resources || []}
                        resourcesLoading={resourcesLoading}
                        canManageContent={canManageContent}
                        isSuperAdmin={auth.isSuperAdmin}
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
                        onClick={() => setPracticeTab(tab.id as PracticeTabId)}
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
                        deletedMcqs={deletedOnlyMcqs}
                        moduleId={moduleId || ''}
                        chapterId={chapterId}
                        isAdmin={canManageContent}
                        showDeletedToggle={canManageContent}
                        showDeleted={showDeletedMcqs}
                        onShowDeletedChange={setShowDeletedMcqs}
                      />
                    )}
                  </div>
                )}

                {/* Short Essays Content */}
                    {practiceTab === 'essays' && (
                      <div>
                        {showAddControls && chapterId && moduleId && (
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
                        deletedEssays={deletedOnlyEssays}
                        moduleId={moduleId}
                        chapterId={chapterId}
                        canEdit={canManageContent}
                        canDelete={canManageContent}
                        showFeedback={true}
                        showDeletedToggle={canManageContent}
                        showDeleted={showDeletedEssays}
                        onShowDeletedChange={setShowDeletedEssays}
                      />
                    )}
                  </div>
                )}

                {/* Cases Content */}
                    {practiceTab === 'cases' && (
                      <div>
                        {showAddControls && chapterId && moduleId && (
                          <div className="mb-4 flex gap-2">
                            <Button size="sm" onClick={() => guardAdd(() => setCaseFormOpen(true))}>
                              <Plus className="w-4 h-4 mr-1" />
                              Add Case
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => guardAdd(() => setCaseBulkUploadOpen(true))}
                            >
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
                        deletedCases={deletedOnlyCases}
                        moduleId={moduleId}
                        chapterId={chapterId}
                        canEdit={canManageContent}
                        canDelete={canManageContent}
                        showDeletedToggle={canManageContent}
                        showDeleted={showDeletedCases}
                        onShowDeletedChange={setShowDeletedCases}
                      />
                    )}
                  </div>
                )}

                {/* OSCE/Practical Content */}
                    {practiceTab === 'practical' && (
                      <div>
                        {showAddControls && chapterId && moduleId && (
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
                        deletedPracticals={deletedOnlyPracticals}
                        moduleId={moduleId}
                        chapterId={chapterId}
                        canEdit={canManageContent}
                        canDelete={canManageContent}
                        showFeedback={true}
                        showDeletedToggle={canManageContent}
                        showDeleted={showDeletedPracticals}
                        onShowDeletedChange={setShowDeletedPracticals}
                      />
                    )}
                  </div>
                )}

                {/* Matching Questions Content */}
                {practiceTab === 'matching' && (
                  <div>
                    {matchingLoading ? (
                      <div className="space-y-3">
                        {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                      </div>
                    ) : (
                      <MatchingQuestionList
                        questions={matchingQuestions || []}
                        deletedQuestions={deletedOnlyMatching}
                        moduleId={moduleId || ''}
                        chapterId={chapterId}
                        isAdmin={canManageContent}
                        showDeletedToggle={canManageContent}
                        showDeleted={showDeletedMatching}
                        onShowDeletedChange={setShowDeletedMatching}
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
