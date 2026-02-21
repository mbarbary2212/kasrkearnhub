import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  QuestionListSkeleton,
  LectureListSkeleton,
} from '@/components/ui/skeletons';
import { Badge } from '@/components/ui/badge';
import { useModule } from '@/hooks/useModules';
import { useChapter } from '@/hooks/useChapters';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAddPermissionGuard } from '@/hooks/useAddPermissionGuard';
import { AdminContentActions } from '@/components/admin/AdminContentActions';
import { LectureList } from '@/components/content/LectureList';
import { ResourcesTabContent } from '@/components/content/ResourcesTabContent';
import { McqList } from '@/components/content/McqList';
import { OsceList } from '@/components/content/OsceList';
import EssayList from '@/components/content/EssayList';
import { ChapterProgressBar } from '@/components/content/ChapterProgressBar';
import { MatchingQuestionList } from '@/components/content/MatchingQuestionList';
import { ResourcesDeleteManager, ResourceKind } from '@/components/content/ResourcesDeleteManager';
import { MobileSectionDropdown } from '@/components/content/MobileSectionDropdown';
import { ClinicalCaseList, ClinicalCaseAdminList } from '@/components/clinical-cases';
import { SectionFilter } from '@/components/sections';
import { SectionsManager } from '@/components/sections';
import { useChapterSectionsEnabled } from '@/hooks/useSections';
import { 
  useChapterLectures, 
  useChapterResources, 
  useChapterEssays,
  useChapterEssayCount,
  useChapterClinicalCaseCount,
} from '@/hooks/useChapterContent';
import { useChapterOsceQuestions, useChapterOsceCount } from '@/hooks/useOsceQuestions';
import { useChapterProgress } from '@/hooks/useChapterProgress';
import { useChapterMatchingQuestions, useChapterMatchingCount } from '@/hooks/useMatchingQuestions';
import { useClinicalCases } from '@/hooks/useClinicalCases';
import { FlashcardsTab } from '@/components/study/FlashcardsTab';
import { StudyResourceFormModal } from '@/components/study/StudyResourceFormModal';
import { StudyBulkUploadModal } from '@/components/study/StudyBulkUploadModal';
import { ClinicalToolsSection } from '@/components/study/ClinicalToolsSection';
import { VisualResourcesSection } from '@/components/study/VisualResourcesSection';
import { MindMapBulkUploadModal } from '@/components/study/MindMapBulkUploadModal';
import { GuidedExplanationList } from '@/components/study/GuidedExplanationList';
import { useChapterStudyResources, useDeleteStudyResource, StudyResource, useHideEmptySelfAssessmentTabs, StudyResourceType, GuidedExplanationContent } from '@/hooks/useStudyResources';
import { useChapterMcqs, useChapterMcqCount } from '@/hooks/useMcqs';
import { useChapterTrueFalseQuestions, useChapterTrueFalseCount } from '@/hooks/useTrueFalseQuestions';
import { TrueFalseList } from '@/components/content/TrueFalseList';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  createResourceTabs, 
  createPracticeTabs, 
  filterTabsForStudent,
  ResourceTabId,
  PracticeTabId,
} from '@/config/tabConfig';
import { ChapterMockExamSection } from '@/components/exam';
import { AskCoachButton } from '@/components/coach';
import { useCoachContext } from '@/contexts/CoachContext';
import { 
  ArrowLeft, 
  FileText, 
  Plus,
  Upload,
  FolderOpen,
  GraduationCap,
  ExternalLink,
  Image,
  ClipboardCheck,
  FlaskConical,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';


type SectionMode = 'resources' | 'practice' | 'test';

export default function ChapterPage() {
  const { moduleId, chapterId } = useParams();
  const navigate = useNavigate();
  const auth = useAuthContext();
  const queryClient = useQueryClient();
  const { guard: guardAdd, dialog: permissionDialog } = useAddPermissionGuard({ moduleId, chapterId });
  const deleteStudyResource = useDeleteStudyResource();
  const { setStudyContext } = useCoachContext();

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
  const [showDeletedOsce, setShowDeletedOsce] = useState(false);
  const [showDeletedTrueFalse, setShowDeletedTrueFalse] = useState(false);
  
  // Section filter state (only for Resources and Practice, NOT for Test)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // State for Case Scenarios modals
  const [caseFormOpen, setCaseFormOpen] = useState(false);
  const [caseBulkUploadOpen, setCaseBulkUploadOpen] = useState(false);

  // State for Flashcard modals
  const [flashcardFormOpen, setFlashcardFormOpen] = useState(false);
  const [flashcardBulkOpen, setFlashcardBulkOpen] = useState(false);
  const [mindMapBulkOpen, setMindMapBulkOpen] = useState(false);
  const [editingFlashcard, setEditingFlashcard] = useState<StudyResource | null>(null);

  const { data: module, isLoading: moduleLoading } = useModule(moduleId || '');
  const { data: chapter, isLoading: chapterLoading } = useChapter(chapterId);
  const { data: lectures, isLoading: lecturesLoading } = useChapterLectures(chapterId);
  const { data: resources, isLoading: resourcesLoading } = useChapterResources(chapterId);
  
  // Lightweight count hooks (always active) for practice tab badges
  const { data: mcqCount = 0 } = useChapterMcqCount(chapterId);
  const { data: osceCount = 0 } = useChapterOsceCount(chapterId);
  const { data: matchingCount = 0 } = useChapterMatchingCount(chapterId);
  const { data: trueFalseCount = 0 } = useChapterTrueFalseCount(chapterId);
  const { data: essayCount = 0 } = useChapterEssayCount(chapterId);
  const { data: clinicalCaseCount = 0 } = useChapterClinicalCaseCount(chapterId);
  
  // Full practice data hooks - only fetch when Practice or Test section is active
  const isPracticeActive = activeSection === 'practice' || activeSection === 'test';
  const { data: mcqs, isLoading: mcqsLoading } = useChapterMcqs(chapterId, false, { enabled: isPracticeActive });
  const { data: deletedMcqs } = useChapterMcqs(chapterId, true, { enabled: isPracticeActive && canManageContent });
  const { data: essays, isLoading: essaysLoading } = useChapterEssays(chapterId, false, { enabled: isPracticeActive });
  const { data: deletedEssays } = useChapterEssays(chapterId, true, { enabled: isPracticeActive && canManageContent });
  const { data: osceQuestions, isLoading: osceLoading } = useChapterOsceQuestions(chapterId, false, { enabled: isPracticeActive });
  const { data: deletedOsceQuestions } = useChapterOsceQuestions(chapterId, true, { enabled: isPracticeActive && canManageContent });
  const { data: studyResources, isLoading: studyResourcesLoading } = useChapterStudyResources(chapterId);
  const { data: chapterProgress, isLoading: progressLoading } = useChapterProgress(chapterId);
  const { data: matchingQuestions, isLoading: matchingLoading } = useChapterMatchingQuestions(chapterId, false, { enabled: isPracticeActive });
  const { data: deletedMatchingQuestions } = useChapterMatchingQuestions(chapterId, true, { enabled: isPracticeActive && canManageContent });
  const { data: trueFalseQuestions, isLoading: trueFalseLoading } = useChapterTrueFalseQuestions(chapterId, false, { enabled: isPracticeActive });
  const { data: deletedTrueFalseQuestions } = useChapterTrueFalseQuestions(chapterId, true, { enabled: isPracticeActive && canManageContent });
  const { data: clinicalCases, isLoading: clinicalCasesLoading } = useClinicalCases(moduleId, canManageContent);
  const { data: hideEmptyTabs } = useHideEmptySelfAssessmentTabs();
  const { data: sectionsEnabled } = useChapterSectionsEnabled(chapterId);
  
  // Filter clinical cases by chapter
  const chapterClinicalCases = (clinicalCases || []).filter(c => c.chapter_id === chapterId);
  
  // Reset section filter when leaving chapter
  useEffect(() => {
    return () => setSelectedSectionId(null);
  }, [chapterId]);
  
  // Helper function to filter content by section - uses type assertion for flexibility
  const filterBySection = useCallback(<T,>(items: T[]): T[] => {
    if (!selectedSectionId || !sectionsEnabled) return items;
    return items.filter(item => {
      const sectionable = item as unknown as { section_id?: string | null };
      return sectionable.section_id === selectedSectionId;
    });
  }, [selectedSectionId, sectionsEnabled]);

  // Filter deleted MCQs only (exclude active ones)
  const deletedOnlyMcqs = (deletedMcqs || []).filter(m => m.is_deleted);
  const deletedOnlyMatching = (deletedMatchingQuestions || []).filter(m => m.is_deleted);
  const deletedOnlyEssays = (deletedEssays || []).filter(e => e.is_deleted);
  const deletedOnlyOsce = (deletedOsceQuestions || []).filter(q => q.is_deleted);
  const deletedOnlyTrueFalse = (deletedTrueFalseQuestions || []).filter(q => q.is_deleted);

  // Filter flashcards from study resources
  const flashcards = studyResources?.filter(r => r.resource_type === 'flashcard') || [];
  const algorithms = studyResources?.filter(r => r.resource_type === 'algorithm') || [];
  const mindMaps = studyResources?.filter(r => r.resource_type === 'mind_map') || [];
  const workedCases = studyResources?.filter(r => r.resource_type === 'clinical_case_worked') || [];
  
  // Count non-flashcard study resources (tables, exam tips, images) for Documents tab - algorithms moved out
  const documentStudyResources = studyResources?.filter(r => 
    r.resource_type === 'table' || r.resource_type === 'exam_tip' || r.resource_type === 'key_image'
  ) || [];
  const documentsCount = (resources?.length || 0) + documentStudyResources.length;

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

  // Handler for deleting flashcards via ResourcesDeleteManager
  const handleDeleteFlashcard = useCallback(async (kind: ResourceKind, id: string) => {
    if (!chapterId) return;
    await deleteStudyResource.mutateAsync({ id, chapterId });
    toast.success('Flashcard deleted');
  }, [deleteStudyResource, chapterId]);

  // Refetch flashcards
  const refetchFlashcards = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['study-resources', 'chapter', chapterId] });
  }, [queryClient, chapterId]);

  // Update Coach context when page loads or section changes
  useEffect(() => {
    if (module && chapter) {
      setStudyContext({
        pageType: activeSection === 'resources' ? 'resource' : activeSection === 'practice' ? 'practice' : 'test',
        moduleId: module.id,
        moduleName: module.name,
        chapterId: chapter.id,
        chapterName: chapter.title,
      });
    }
  }, [module, chapter, activeSection, setStudyContext]);

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
    { id: 'practice' as SectionMode, label: 'Practice', mobileLabel: 'Practice', icon: GraduationCap },
    { id: 'test' as SectionMode, label: 'Test Yourself', mobileLabel: 'Test', icon: ClipboardCheck },
  ];

  // Per-section color map for visual hierarchy
  const sectionColors: Record<SectionMode, { activeBg: string; activeBgDark: string; border: string; text: string; icon: string; mobileBg: string }> = {
    resources: { activeBg: 'bg-blue-50',    activeBgDark: 'dark:bg-blue-950/30',    border: 'border-l-blue-600',    text: 'text-blue-700 dark:text-blue-300',    icon: 'text-blue-600 dark:text-blue-400',    mobileBg: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' },
    practice:  { activeBg: 'bg-emerald-50', activeBgDark: 'dark:bg-emerald-950/30', border: 'border-l-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', icon: 'text-emerald-500 dark:text-emerald-400', mobileBg: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' },
    test:      { activeBg: 'bg-violet-50',  activeBgDark: 'dark:bg-violet-950/30',  border: 'border-l-violet-500',  text: 'text-violet-700 dark:text-violet-300',  icon: 'text-violet-500 dark:text-violet-400',  mobileBg: 'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300' },
  };

  // Use unified tab configuration - create all tabs first
  const allResourcesTabs = useMemo(() => {
    return createResourceTabs({
      lectures: lectures?.length || 0,
      flashcards: flashcards.length,
      mind_maps: mindMaps.length + (studyResources?.filter(r => r.resource_type === 'infographic')?.length || 0) + algorithms.length,
      guided_explanations: studyResources?.filter(r => r.resource_type === 'guided_explanation')?.length || 0,
      reference_materials: documentsCount,
      clinical_tools: workedCases.length,
    });
  }, [lectures?.length, flashcards.length, mindMaps.length, studyResources, documentsCount, algorithms.length, workedCases.length]);

  // Admin sees all tabs; students see filtered based on setting
  const resourcesTabs = useMemo(() => {
    if (canManageContent) return allResourcesTabs;
    return filterTabsForStudent(allResourcesTabs, hideEmptyTabs ?? false);
  }, [canManageContent, allResourcesTabs, hideEmptyTabs]);

  // Reset resources tab if current tab becomes hidden
  useEffect(() => {
    if (resourcesTabs.length > 0 && !resourcesTabs.find(t => t.id === resourcesTab)) {
      setResourcesTab(resourcesTabs[0].id as ResourceTabId);
    }
  }, [resourcesTabs, resourcesTab]);

  const allPracticeTabs = useMemo(() => {
    return createPracticeTabs({
      mcqs: mcqCount,
      true_false: trueFalseCount,
      essays: essayCount,
      clinical_cases: clinicalCaseCount,
      osce: osceCount,
      practical: 0,
      matching: matchingCount,
      images: 0,
    });
  }, [
    mcqCount,
    trueFalseCount,
    essayCount,
    clinicalCaseCount,
    osceCount,
    matchingCount,
  ]);

  // Admin sees all tabs; students see filtered based on setting
  const practiceTabs = useMemo(() => {
    if (canManageContent) return allPracticeTabs;
    return filterTabsForStudent(allPracticeTabs, hideEmptyTabs ?? false);
  }, [canManageContent, allPracticeTabs, hideEmptyTabs]);

  // Reset practice tab if current tab becomes hidden
  useEffect(() => {
    if (practiceTabs.length > 0 && !practiceTabs.find(t => t.id === practiceTab)) {
      setPracticeTab(practiceTabs[0].id as PracticeTabId);
    }
  }, [practiceTabs, practiceTab]);

  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in min-h-[60vh] bg-gradient-to-br from-blue-50/80 via-white to-blue-100/60 dark:from-blue-950/20 dark:via-background dark:to-blue-900/10 -mx-4 -mt-4 px-4 pt-4 rounded-xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/module/${moduleId}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            {(moduleLoading || chapterLoading) ? (
              <>
                <Skeleton className="hidden md:block h-5 w-48 mb-2" />
                <Skeleton className="h-8 w-96 max-w-full" />
              </>
            ) : (
              <>
                {/* Desktop: Full two-line header */}
                <div className="hidden md:flex items-center gap-4">
                  {chapter?.icon_url && (
                    <img src={chapter.icon_url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">{module?.name}</p>
                    <h1 className="text-2xl font-heading font-semibold">
                      Chapter {chapter?.chapter_number}: {chapter?.title}
                    </h1>
                  </div>
                </div>
                {/* Mobile: Icon + stacked text */}
                <div className="md:hidden flex items-center gap-3">
                  {chapter?.icon_url && (
                    <img src={chapter.icon_url} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">{module?.name}</p>
                    <h1 className="text-lg font-heading font-semibold line-clamp-1">
                      Chapter {chapter?.chapter_number}: {chapter?.title}
                    </h1>
                  </div>
                </div>
              </>
            )}
          </div>
          {/* Ask Coach Button - visible in Resources and Practice sections */}
          {!auth.isAdmin && (activeSection === 'resources' || activeSection === 'practice') && (
            <AskCoachButton 
              variant="header"
              context={{
                pageType: activeSection === 'resources' ? 'resource' : 'practice',
                moduleId: module?.id,
                moduleName: module?.name,
                chapterId: chapter?.id,
                chapterName: chapter?.title,
              }}
            />
          )}
        </div>

        {/* Chapter Progress Bar - hidden for admins */}
        {!canManageContent && (
          <ChapterProgressBar
            totalProgress={chapterProgress?.totalProgress || 0}
            practiceProgress={chapterProgress?.practiceProgress || 0}
            videoProgress={chapterProgress?.videoProgress || 0}
            practiceCompleted={chapterProgress?.practiceCompleted || 0}
            practiceTotal={chapterProgress?.practiceTotal || 0}
            videosCompleted={chapterProgress?.videosCompleted || 0}
            videosTotal={chapterProgress?.videosTotal || 0}
            isLoading={progressLoading}
          />
        )}

        {/* Inline Sections Manager - Admin only */}
        {canManageContent && chapterId && (
          <SectionsManager chapterId={chapterId} canManage={canManageContent} />
        )}

        {/* Main Content Layout: Left Nav Rail + Content Area */}
        <div className="flex flex-col md:flex-row">
          {/* Mobile: Horizontal Navigation Tabs (only on small screens) */}
          <div className="md:hidden mb-4">
            <nav className="flex gap-1.5 bg-white/70 dark:bg-card/70 backdrop-blur-lg rounded-xl border border-white/40 dark:border-white/10 shadow-lg p-1.5">
              {sectionNav.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                const colors = sectionColors[section.id];
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs transition-all duration-150",
                      isActive 
                        ? cn("font-semibold shadow-sm", colors.mobileBg)
                        : "text-muted-foreground hover:bg-gray-50/80 dark:hover:bg-white/5"
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", isActive ? colors.icon : "opacity-70")} />
                    <span>{section.mobileLabel}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Desktop: Fixed Vertical Navigation Rail */}
          <div className="hidden md:block w-[180px] flex-shrink-0">
            <nav className="sticky top-4 bg-white/70 dark:bg-card/70 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-white/10 shadow-lg p-1.5">
              <div className="flex flex-col gap-0.5">
                {sectionNav.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  const colors = sectionColors[section.id];
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 text-left",
                        isActive 
                          ? cn("font-semibold border-l-4", colors.activeBg, colors.activeBgDark, colors.border, colors.text)
                          : "text-muted-foreground hover:bg-gray-50/80 dark:hover:bg-white/5 hover:translate-y-[-1px]"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? colors.icon : "opacity-70")} />
                      <span className="whitespace-nowrap">{section.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Vertical Divider (hidden on mobile) */}
          <div className="hidden md:block w-px bg-transparent mx-4 self-stretch min-h-[200px] shadow-[2px_0_12px_-2px_rgba(0,0,0,0.08)]" />

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Resources Section */}
            {activeSection === 'resources' && (
              <div className="space-y-4">
                {/* Section Filter - shown when sections are enabled */}
                {sectionsEnabled && (
                  <SectionFilter
                    chapterId={chapterId}
                    selectedSectionId={selectedSectionId}
                    onSectionChange={setSelectedSectionId}
                    className="mb-2"
                  />
                )}
                
                {/* Sub-tabs for Resources - Dropdown on mobile, pills on desktop */}
                <div className="md:hidden">
                  <MobileSectionDropdown
                    tabs={resourcesTabs}
                    activeTab={resourcesTab}
                    onTabChange={(tab) => handleResourcesTabChange(tab as ResourceTabId)}
                  />
                </div>
                <div className="hidden md:flex gap-2 flex-wrap">
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
                      <LectureListSkeleton count={3} />
                    ) : (
                      <LectureList 
                        key={lecturesResetKey}
                        lectures={filterBySection(lectures || [])} 
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
                      <LectureListSkeleton count={3} />
                    ) : (
                      <FlashcardsTab
                        resources={filterBySection(flashcards)}
                        canManage={canManageContent}
                        onEdit={handleEditFlashcard}
                        chapterId={chapterId}
                      />
                    )}
                  </div>
                )}

                {/* Reference Materials Content (formerly Documents) */}
                {resourcesTab === 'reference_materials' && chapterId && moduleId && (
                  <ResourcesTabContent
                    chapterId={chapterId}
                    moduleId={moduleId}
                    resources={filterBySection(resources || [])}
                    resourcesLoading={resourcesLoading}
                    canManageContent={canManageContent}
                    isSuperAdmin={auth.isSuperAdmin}
                  />
                )}

                {/* Mind Maps Content */}
                {resourcesTab === 'mind_maps' && chapterId && (
                  <VisualResourcesSection
                    mindMaps={filterBySection(mindMaps)}
                    infographics={filterBySection(studyResources?.filter(r => r.resource_type === 'infographic') || [])}
                    algorithms={filterBySection(algorithms)}
                    canManage={canManageContent}
                    onEdit={handleEditFlashcard}
                    onAdd={(type) => {
                      setEditingFlashcard(null);
                      guardAdd(() => {
                        (window as any).__pendingResourceType = type;
                        setFlashcardFormOpen(true);
                      });
                    }}
                    onBulkUpload={(type) => {
                      if (type === 'mind_map') {
                        guardAdd(() => setMindMapBulkOpen(true));
                      } else {
                        guardAdd(() => {
                          (window as any).__pendingBulkResourceType = type;
                          setFlashcardBulkOpen(true);
                        });
                      }
                    }}
                    chapterId={chapterId}
                    filterBySection={filterBySection}
                    isLoading={studyResourcesLoading}
                  />
                )}

                {/* Guided Explanations Content */}
                {resourcesTab === 'guided_explanations' && chapterId && (
                  <div className="space-y-4">
                    {canManageContent && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            guardAdd(() => {
                              setEditingFlashcard(null);
                              (window as any).__pendingResourceType = 'guided_explanation';
                              setFlashcardFormOpen(true);
                            })
                          }
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Guided Explanation
                        </Button>
                      </div>
                    )}
                    {studyResourcesLoading ? (
                      <QuestionListSkeleton count={2} type="mcq" />
                    ) : (
                      <GuidedExplanationList
                        resources={filterBySection(studyResources?.filter(r => r.resource_type === 'guided_explanation') || [])}
                        canManage={canManageContent}
                        onEdit={handleEditFlashcard}
                      />
                    )}
                  </div>
                )}

                {/* Clinical Tools Content */}
                {resourcesTab === 'clinical_tools' && chapterId && moduleId && (
                  <ClinicalToolsSection
                    algorithms={[]}
                    workedCases={filterBySection(workedCases)}
                    canManage={canManageContent}
                    onEdit={handleEditFlashcard}
                    onAdd={(type) => {
                      setEditingFlashcard(null);
                      guardAdd(() => {
                        setFlashcardFormOpen(true);
                        (window as any).__pendingResourceType = type;
                      });
                    }}
                    onBulkUpload={(type) => guardAdd(() => {
                      (window as any).__pendingBulkResourceType = type;
                      setFlashcardBulkOpen(true);
                    })}
                    chapterId={chapterId}
                  />
                )}
              </div>
            )}

            {/* Practice Section */}
            {activeSection === 'practice' && (
              <div className="space-y-4">
                {/* Section Filter - shown when sections are enabled */}
                {sectionsEnabled && (
                  <SectionFilter
                    chapterId={chapterId}
                    selectedSectionId={selectedSectionId}
                    onSectionChange={setSelectedSectionId}
                    className="mb-2"
                  />
                )}
                
                {/* Sub-tabs for Practice - Dropdown on mobile, pills on desktop */}
                <div className="md:hidden">
                  <MobileSectionDropdown
                    tabs={practiceTabs}
                    activeTab={practiceTab}
                    onTabChange={(tab) => setPracticeTab(tab as PracticeTabId)}
                  />
                </div>
                <div className="hidden md:flex gap-2 flex-wrap">
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
                      <QuestionListSkeleton count={2} type="mcq" />
                    ) : (
                      <McqList
                        mcqs={filterBySection(mcqs || [])}
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

                {/* True/False Content */}
                {practiceTab === 'true_false' && (
                  <div>
                    {trueFalseLoading ? (
                      <QuestionListSkeleton count={2} type="mcq" />
                    ) : (
                      <TrueFalseList
                        questions={filterBySection(trueFalseQuestions || [])}
                        deletedQuestions={deletedOnlyTrueFalse}
                        moduleId={moduleId || ''}
                        chapterId={chapterId}
                        isAdmin={canManageContent}
                        showDeletedToggle={canManageContent}
                        showDeleted={showDeletedTrueFalse}
                        onShowDeletedChange={setShowDeletedTrueFalse}
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
                      <QuestionListSkeleton count={2} type="mcq" />
                    ) : (
                      <EssayList
                        essays={filterBySection(essays || [])}
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

                {/* Clinical Cases Content */}
                {practiceTab === 'clinical_cases' && moduleId && chapterId && (
                  <div>
                    {canManageContent ? (
                      <ClinicalCaseAdminList moduleId={moduleId} chapterId={chapterId} />
                    ) : clinicalCasesLoading ? (
                      <QuestionListSkeleton count={2} type="mcq" />
                    ) : (
                      <ClinicalCaseList moduleId={moduleId} chapterId={chapterId} />
                    )}
                  </div>
                )}

                {/* OSCE Content */}
                {practiceTab === 'osce' && (
                  <div>
                    {osceLoading ? (
                      <QuestionListSkeleton count={2} type="osce" />
                    ) : (
                      <OsceList
                        questions={filterBySection(osceQuestions || [])}
                        deletedQuestions={deletedOnlyOsce}
                        moduleId={moduleId || ''}
                        chapterId={chapterId}
                        moduleCode={module?.slug?.toUpperCase() || 'MODULE'}
                        chapterTitle={chapter?.title || 'CHAPTER'}
                        isAdmin={canManageContent}
                        showDeletedToggle={canManageContent}
                        showDeleted={showDeletedOsce}
                        onShowDeletedChange={setShowDeletedOsce}
                      />
                    )}
                  </div>
                )}

                {/* Practical Content (placeholder) */}
                {practiceTab === 'practical' && (
                  <div className="text-center py-12 border rounded-lg">
                    <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Practical content coming soon.</p>
                  </div>
                )}


                {/* Matching Questions Content */}
                {practiceTab === 'matching' && (
                  <div>
                    {matchingLoading ? (
                      <QuestionListSkeleton count={2} type="matching" />
                    ) : (
                      <MatchingQuestionList
                        questions={filterBySection(matchingQuestions || [])}
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

            {/* Test Yourself Section */}
            {activeSection === 'test' && moduleId && chapterId && (
              <ChapterMockExamSection moduleId={moduleId} chapterId={chapterId} />
            )}
          </div>
        </div>

        {/* Flashcard Modals */}
        {chapterId && moduleId && (
          <>
            <StudyResourceFormModal
              open={flashcardFormOpen}
              onOpenChange={(open) => {
                setFlashcardFormOpen(open);
                if (!open) delete (window as any).__pendingResourceType;
              }}
              chapterId={chapterId}
              moduleId={moduleId}
              resourceType={(window as any).__pendingResourceType || editingFlashcard?.resource_type || 'flashcard'}
              resource={editingFlashcard}
            />
            <StudyBulkUploadModal
              open={flashcardBulkOpen}
              onOpenChange={setFlashcardBulkOpen}
              chapterId={chapterId}
              moduleId={moduleId}
              resourceType={(window as any).__pendingBulkResourceType || 'flashcard'}
            />
            <MindMapBulkUploadModal
              open={mindMapBulkOpen}
              onOpenChange={setMindMapBulkOpen}
              chapterId={chapterId}
              moduleId={moduleId}
            />
          </>
        )}

        {/* Flashcard Delete Manager - page level for top-level flashcards tab */}
        {canManageContent && chapterId && (
          <ResourcesDeleteManager
            deleteResource={handleDeleteFlashcard}
            refetchResources={refetchFlashcards}
          />
        )}
      </div>
    </MainLayout>
  );
}
