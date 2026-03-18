import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
import { SocraticDocumentCard } from '@/components/content/SocraticDocumentCard';
import { LectureList } from '@/components/content/LectureList';
import { ResourcesTabContent } from '@/components/content/ResourcesTabContent';
import { RichDocumentViewer } from '@/components/study/RichDocumentViewer';
import { McqList } from '@/components/content/McqList';
import { OsceList } from '@/components/content/OsceList';
import EssayList from '@/components/content/EssayList';
import { ChapterProgressBar } from '@/components/content/ChapterProgressBar';
import { MatchingQuestionList } from '@/components/content/MatchingQuestionList';
import { ResourcesDeleteManager, ResourceKind, requestResourceDelete } from '@/components/content/ResourcesDeleteManager';
import { MobileSectionDropdown } from '@/components/content/MobileSectionDropdown';
import { ClinicalCaseList, ClinicalCaseAdminList } from '@/components/clinical-cases';
import { SectionFilter } from '@/components/sections';
import { SectionsManager } from '@/components/sections';
import { useChapterSectionsEnabled, useChapterSections } from '@/hooks/useSections';
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
import { useChapterMcqs, useChapterMcqCount, useChapterSbas, useChapterSbaCount } from '@/hooks/useMcqs';
import { useChapterTrueFalseQuestions, useChapterTrueFalseCount } from '@/hooks/useTrueFalseQuestions';
import { TrueFalseList } from '@/components/content/TrueFalseList';
import { useChapterAlgorithms } from '@/hooks/useInteractiveAlgorithms';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  createResourceTabs, 
  createPracticeTabs, 
  createInteractiveTabs,
  filterTabsForStudent,
  ResourceTabId,
  PracticeTabId,
  InteractiveTabId,
  SOCRATES_ICON_PATH,
} from '@/config/tabConfig';
import { AlgorithmList, AlgorithmBuilderModal, AlgorithmBulkUploadModal, PathwayAIGenerateModal } from '@/components/algorithms';
import {
  useCreateInteractiveAlgorithm,
  useUpdateInteractiveAlgorithm,
  useDeleteInteractiveAlgorithm,
} from '@/hooks/useInteractiveAlgorithms';
import { InteractiveAlgorithm, AlgorithmJson } from '@/types/algorithm';
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
  Sparkles,
  Download,
  HelpCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { useModulePinSettings, useStudentModulePreferences, filterByCustomPrefs } from '@/hooks/useCustomizeView';
import { CustomizeViewSheet } from '@/components/student/CustomizeViewSheet';
import { cn } from '@/lib/utils';


type SectionMode = 'resources' | 'interactive' | 'practice' | 'test';

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
  const [searchParams] = useSearchParams();
  const initialSection = (searchParams.get('section') as SectionMode) || 'resources';
  const [activeSection, setActiveSection] = useState<SectionMode>(initialSection);
  
  const [resourcesTab, setResourcesTab] = useState<ResourceTabId>('lectures');
  const [interactiveTab, setInteractiveTab] = useState<InteractiveTabId>('cases');
  const [practiceTab, setPracticeTab] = useState<PracticeTabId>('mcqs');
  const [socratesSubTab, setSocratesSubTab] = useState<'documents' | 'questions'>('documents');
  const [lecturesResetKey, setLecturesResetKey] = useState(0);
  const [showDeletedMcqs, setShowDeletedMcqs] = useState(false);
  const [showDeletedSbas, setShowDeletedSbas] = useState(false);
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

  // Algorithm builder state
  const [algorithmBuilderOpen, setAlgorithmBuilderOpen] = useState(false);
  const [algorithmBulkOpen, setAlgorithmBulkOpen] = useState(false);
  const [algorithmAIOpen, setAlgorithmAIOpen] = useState(false);
  const [editingAlgorithm, setEditingAlgorithm] = useState<InteractiveAlgorithm | null>(null);
  const createAlg = useCreateInteractiveAlgorithm();
  const updateAlg = useUpdateInteractiveAlgorithm();
  const deleteAlg = useDeleteInteractiveAlgorithm();

  // State for Flashcard modals
  const [flashcardFormOpen, setFlashcardFormOpen] = useState(false);
  const [flashcardBulkOpen, setFlashcardBulkOpen] = useState(false);
  const [mindMapBulkOpen, setMindMapBulkOpen] = useState(false);
  const [visualBulkType, setVisualBulkType] = useState<'mind_map' | 'infographic'>('mind_map');
  const [editingFlashcard, setEditingFlashcard] = useState<StudyResource | null>(null);

  const { data: module, isLoading: moduleLoading } = useModule(moduleId || '');
  const { data: chapter, isLoading: chapterLoading } = useChapter(chapterId);
  const { data: lectures, isLoading: lecturesLoading } = useChapterLectures(chapterId);
  const { data: resources, isLoading: resourcesLoading } = useChapterResources(chapterId);
  
  // Lightweight count hooks (always active) for practice tab badges
  const { data: mcqCount = 0 } = useChapterMcqCount(chapterId);
  const { data: sbaCount = 0 } = useChapterSbaCount(chapterId);
  const { data: osceCount = 0 } = useChapterOsceCount(chapterId);
  const { data: matchingCount = 0 } = useChapterMatchingCount(chapterId);
  const { data: trueFalseCount = 0 } = useChapterTrueFalseCount(chapterId);
  const { data: essayCount = 0 } = useChapterEssayCount(chapterId);
  const { data: clinicalCaseCount = 0 } = useChapterClinicalCaseCount(chapterId);
  
  // Full practice data hooks - only fetch when Practice or Test section is active
  const isPracticeActive = activeSection === 'practice' || activeSection === 'test' || activeSection === 'interactive';
  const { data: mcqs, isLoading: mcqsLoading } = useChapterMcqs(chapterId, false, { enabled: isPracticeActive });
  const { data: deletedMcqs } = useChapterMcqs(chapterId, true, { enabled: isPracticeActive && canManageContent });
  const { data: sbaQuestions, isLoading: sbaLoading } = useChapterSbas(chapterId, false, { enabled: isPracticeActive });
  const { data: deletedSbas } = useChapterSbas(chapterId, true, { enabled: isPracticeActive && canManageContent });
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
  const { data: chapterSections } = useChapterSections(sectionsEnabled ? chapterId : undefined);
  const { data: interactiveAlgorithms } = useChapterAlgorithms(chapterId);
  
  // Build a map of section_id → display_order for sorting
  const sectionOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    if (chapterSections) {
      chapterSections.forEach(s => map.set(s.id, s.display_order));
    }
    return map;
  }, [chapterSections]);
  
  // Filter clinical cases by chapter
  const chapterClinicalCases = (clinicalCases || []).filter(c => c.chapter_id === chapterId);
  
  // Reset section filter when leaving chapter
  useEffect(() => {
    return () => setSelectedSectionId(null);
  }, [chapterId]);
  
  // Helper function to filter and sort content by section hierarchy
  const filterBySection = useCallback(<T,>(items: T[]): T[] => {
    if (!sectionsEnabled) return items;
    if (selectedSectionId) {
      return items.filter(item => {
        const sectionable = item as unknown as { section_id?: string | null };
        return sectionable.section_id === selectedSectionId;
      });
    }
    // "All Sections" — sort by section display_order, unsectioned items go last
    if (sectionOrderMap.size === 0) return items;
    return [...items].sort((a, b) => {
      const aId = (a as unknown as { section_id?: string | null }).section_id;
      const bId = (b as unknown as { section_id?: string | null }).section_id;
      const aOrder = aId ? (sectionOrderMap.get(aId) ?? Infinity) : Infinity;
      const bOrder = bId ? (sectionOrderMap.get(bId) ?? Infinity) : Infinity;
      return aOrder - bOrder;
    });
  }, [selectedSectionId, sectionsEnabled, sectionOrderMap]);

  // Filter deleted MCQs only (exclude active ones)
  const deletedOnlyMcqs = (deletedMcqs || []).filter(m => m.is_deleted);
  const deletedOnlySbas = (deletedSbas || []).filter(m => m.is_deleted);
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
  // Socratic tutorials (from resources table) are now shown under the Socratic Tutorials tab
  const socraticTutorials = resources?.filter(r => r.document_subtype === 'socratic_tutorial') || [];
  const nonSocraticResources = resources?.filter(r => r.document_subtype !== 'socratic_tutorial') || [];
  const documentsCount = nonSocraticResources.length + documentStudyResources.length;

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

  // Section navigation items — Resources → Interactive → Practice → Test
  const sectionNav = [
    { id: 'resources' as SectionMode, label: 'Resources', mobileLabel: 'Resources', icon: FolderOpen },
    { id: 'interactive' as SectionMode, label: 'Interactive', mobileLabel: 'Interactive', icon: Sparkles },
    { id: 'practice' as SectionMode, label: 'Practice', mobileLabel: 'Practice', icon: GraduationCap },
    { id: 'test' as SectionMode, label: 'Test Yourself', mobileLabel: 'Test', icon: ClipboardCheck },
  ];

  // Per-section color map for visual hierarchy
  const sectionColors: Record<SectionMode, { activeBg: string; activeBgDark: string; border: string; text: string; icon: string; mobileBg: string }> = {
    resources:   { activeBg: 'bg-blue-50',    activeBgDark: 'dark:bg-blue-950/30',    border: 'border-l-blue-400',    text: 'text-blue-600 dark:text-blue-300',    icon: 'text-blue-500 dark:text-blue-400',    mobileBg: 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300' },
    interactive: { activeBg: 'bg-teal-50',   activeBgDark: 'dark:bg-teal-950/30',   border: 'border-l-teal-600',   text: 'text-teal-700 dark:text-teal-300',   icon: 'text-teal-600 dark:text-teal-400',   mobileBg: 'bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300' },
    practice:    { activeBg: 'bg-emerald-50', activeBgDark: 'dark:bg-emerald-950/30', border: 'border-l-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', icon: 'text-emerald-500 dark:text-emerald-400', mobileBg: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' },
    test:        { activeBg: 'bg-violet-50',  activeBgDark: 'dark:bg-violet-950/30',  border: 'border-l-violet-500',  text: 'text-violet-700 dark:text-violet-300',  icon: 'text-violet-500 dark:text-violet-400',  mobileBg: 'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300' },
  };

  // Use unified tab configuration - create all tabs first
  const allResourcesTabs = useMemo(() => {
    return createResourceTabs({
      lectures: lectures?.length || 0,
      flashcards: flashcards.length,
      mind_maps: mindMaps.length + (studyResources?.filter(r => r.resource_type === 'infographic')?.length || 0),
      guided_explanations: (studyResources?.filter(r => r.resource_type === 'guided_explanation')?.length || 0) + socraticTutorials.length,
      reference_materials: documentsCount,
      clinical_tools: workedCases.length,
    });
  }, [lectures?.length, flashcards.length, mindMaps.length, studyResources, documentsCount, interactiveAlgorithms?.length, workedCases.length]);

  // Admin sees all tabs; students see filtered based on setting
  const { data: pinSettings } = useModulePinSettings();
  const { data: studentPrefs } = useStudentModulePreferences();
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const resourcesTabs = useMemo(() => {
    if (canManageContent) return allResourcesTabs;
    const filtered = filterTabsForStudent(allResourcesTabs, hideEmptyTabs ?? false);
    return filterByCustomPrefs(filtered, pinSettings, studentPrefs);
  }, [canManageContent, allResourcesTabs, hideEmptyTabs, pinSettings, studentPrefs]);

  // Reset resources tab if current tab becomes hidden
  useEffect(() => {
    if (resourcesTabs.length > 0 && !resourcesTabs.find(t => t.id === resourcesTab)) {
      setResourcesTab(resourcesTabs[0].id as ResourceTabId);
    }
  }, [resourcesTabs, resourcesTab]);

  const allInteractiveTabs = useMemo(() => {
    return createInteractiveTabs({
      cases: clinicalCaseCount,
      pathways: interactiveAlgorithms?.length || 0,
    });
  }, [clinicalCaseCount, interactiveAlgorithms?.length]);

  const interactiveTabs = useMemo(() => {
    if (canManageContent) return allInteractiveTabs;
    const filtered = filterTabsForStudent(allInteractiveTabs, hideEmptyTabs ?? false);
    return filterByCustomPrefs(filtered, pinSettings, studentPrefs);
  }, [canManageContent, allInteractiveTabs, hideEmptyTabs, pinSettings, studentPrefs]);

  const allPracticeTabs = useMemo(() => {
    return createPracticeTabs({
      mcqs: mcqCount,
      sba: sbaCount,
      true_false: trueFalseCount,
      essays: essayCount,
      osce: osceCount,
      practical: 0,
      matching: matchingCount,
      images: 0,
    });
  }, [
    mcqCount,
    sbaCount,
    trueFalseCount,
    essayCount,
    osceCount,
    matchingCount,
  ]);

  // Admin sees all tabs; students see filtered based on setting
  const practiceTabs = useMemo(() => {
    if (canManageContent) return allPracticeTabs;
    const filtered = filterTabsForStudent(allPracticeTabs, hideEmptyTabs ?? false);
    return filterByCustomPrefs(filtered, pinSettings, studentPrefs);
  }, [canManageContent, allPracticeTabs, hideEmptyTabs, pinSettings, studentPrefs]);

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
          <Button variant="ghost" size="icon" onClick={() => navigate(`/module/${moduleId}?section=learning`)}>
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
                    <h1 className="text-lg font-heading font-semibold">
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
          {/* Customize View button for students */}
          {!canManageContent && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCustomizeOpen(true)}
              className="text-muted-foreground hover:text-foreground"
              title="Customize View"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          )}
        </div>
        <CustomizeViewSheet open={customizeOpen} onOpenChange={setCustomizeOpen} />

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
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all border",
                          isActive 
                            ? "bg-blue-600 text-white font-medium shadow-sm border-blue-600" 
                            : "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                        )}
                      >
                        {tab.useImageIcon ? (
                          <img src={SOCRATES_ICON_PATH} alt="Socrates" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
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
                    resources={filterBySection(nonSocraticResources)}
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
                      if (type === 'mind_map' || type === 'infographic') {
                        guardAdd(() => {
                          setVisualBulkType(type);
                          setMindMapBulkOpen(true);
                        });
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

                {/* Socrates Content - with Documents and Questions sub-tabs */}
                {resourcesTab === 'guided_explanations' && chapterId && (
                  <div className="space-y-4">
                    {/* Sub-tabs: Documents / Questions */}
                    <div className="flex gap-2 border-b border-border pb-2">
                      <button
                        onClick={() => setSocratesSubTab('documents')}
                        className={cn(
                          "px-3 py-1.5 text-sm font-medium rounded-t transition-colors",
                          socratesSubTab === 'documents'
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <FileText className="w-4 h-4 inline mr-1.5" />
                        Documents
                      </button>
                      <button
                        onClick={() => setSocratesSubTab('questions')}
                        className={cn(
                          "px-3 py-1.5 text-sm font-medium rounded-t transition-colors",
                          socratesSubTab === 'questions'
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <HelpCircle className="w-4 h-4 inline mr-1.5" />
                        Questions
                      </button>
                    </div>

                    {/* Documents sub-tab: Socratic Tutorial documents */}
                    {socratesSubTab === 'documents' && (
                      <>
                        {showAddControls && chapterId && moduleId && (
                          <div className="mb-4">
                            <AdminContentActions chapterId={chapterId} moduleId={moduleId} contentType="resource" hideAudio documentSubtype="socratic_tutorial" />
                          </div>
                        )}
                        {resourcesLoading ? (
                          <QuestionListSkeleton count={2} type="mcq" />
                        ) : socraticTutorials.length > 0 ? (
                          <div className="space-y-3">
                            {socraticTutorials.map(doc => (
                              doc.rich_content ? (
                                <RichDocumentViewer
                                  key={doc.id}
                                  title={doc.title}
                                  content={doc.rich_content}
                                  documentType="socratic_tutorial"
                                />
                              ) : (
                                <SocraticDocumentCard
                                  key={doc.id}
                                  doc={doc}
                                  canManage={canManageContent}
                                  invalidateKey={['chapter-resources', chapterId!]}
                                />
                              )
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground py-8 text-center">No Socratic documents yet.</p>
                        )}
                      </>
                    )}

                    {/* Questions sub-tab: Guided Explanations (Q&A format) */}
                    {socratesSubTab === 'questions' && (
                      <>
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
                              Add Question
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                guardAdd(() => {
                                  (window as any).__pendingBulkResourceType = 'guided_explanation';
                                  setFlashcardBulkOpen(true);
                                })
                              }
                            >
                              <Upload className="w-3 h-3 mr-1" />
                              Bulk Upload
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
                            onDelete={(id) => {
                              const resource = studyResources?.find(r => r.id === id);
                              requestResourceDelete('guided_explanation', id, resource?.title);
                            }}
                            chapterId={chapterId}
                          />
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Clinical Tools Content */}
                {resourcesTab === 'clinical_tools' && chapterId && moduleId && (
                  <ClinicalToolsSection
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
                    moduleId={moduleId}
                  />
                )}
              </div>
            )}

            {/* Interactive Section (Cases + Pathways) */}
            {activeSection === 'interactive' && (
              <div className="space-y-4">
                {/* Sub-tabs for Interactive */}
                <div className="md:hidden">
                  <MobileSectionDropdown
                    tabs={interactiveTabs}
                    activeTab={interactiveTab}
                    onTabChange={(tab) => setInteractiveTab(tab as InteractiveTabId)}
                  />
                </div>
                <div className="hidden md:flex gap-2 flex-wrap">
                  {interactiveTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = interactiveTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setInteractiveTab(tab.id as InteractiveTabId)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors border",
                          isActive 
                            ? "bg-teal-600 text-white font-medium shadow-sm border-teal-600" 
                            : "border-teal-300 text-teal-700 bg-teal-50 hover:bg-teal-100"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{tab.count}</Badge>
                      </button>
                    );
                  })}
                </div>

                {/* Cases Content */}
                {interactiveTab === 'cases' && moduleId && chapterId && (
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

                {/* Pathways (Algorithms) Content */}
                {interactiveTab === 'pathways' && chapterId && moduleId && (
                  <div className="space-y-4">
                    {canManageContent && (
                      <div className="flex gap-2 mb-4 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => { setEditingAlgorithm(null); setAlgorithmBuilderOpen(true); }}>
                          <Plus className="w-3 h-3 mr-1" /> Build Pathway
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          const algs = interactiveAlgorithms || [];
                          if (algs.length === 0) { toast.error('No pathways to download'); return; }
                          const headers = ['title', 'description', 'node_count', 'decision_count'];
                          const rows = algs.map(a => {
                            const nodes = a.algorithm_json?.nodes || [];
                            const vals = [a.title, a.description || '', String(nodes.length), String(nodes.filter(n => n.type === 'decision').length)];
                            return vals.map(v => v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v).join(',');
                          });
                          const csv = [headers.join(','), ...rows].join('\n');
                          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                          const link = document.createElement('a');
                          link.href = URL.createObjectURL(blob);
                          link.download = 'pathways_export.csv';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(link.href);
                          toast.success(`Downloaded ${algs.length} pathways`);
                        }}>
                          <Download className="w-3 h-3 mr-1" /> Download
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setAlgorithmBulkOpen(true)}>
                          <Upload className="w-3 h-3 mr-1" /> Import File
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setAlgorithmAIOpen(true)}>
                          <Sparkles className="w-3 h-3 mr-1" /> Generate with AI
                        </Button>
                      </div>
                    )}
                    <AlgorithmList
                      algorithms={interactiveAlgorithms || []}
                      canManage={canManageContent}
                      onEdit={(alg) => { setEditingAlgorithm(alg); setAlgorithmBuilderOpen(true); }}
                      onDelete={async (alg) => {
                        try {
                          await deleteAlg.mutateAsync({ id: alg.id, chapterId, topicId: undefined });
                          toast.success('Pathway deleted');
                        } catch (err: any) {
                          toast.error(err.message || 'Failed to delete');
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}


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
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all border",
                          isActive 
                            ? "bg-emerald-600 text-white font-medium shadow-sm border-emerald-600" 
                            : "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
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

                {/* SBA Content */}
                {practiceTab === 'sba' && (
                  <div>
                    {sbaLoading ? (
                      <QuestionListSkeleton count={2} type="mcq" />
                    ) : (
                      <McqList
                        mcqs={filterBySection(sbaQuestions || [])}
                        deletedMcqs={deletedOnlySbas}
                        moduleId={moduleId || ''}
                        chapterId={chapterId}
                        isAdmin={canManageContent}
                        showDeletedToggle={canManageContent}
                        showDeleted={showDeletedSbas}
                        onShowDeletedChange={setShowDeletedSbas}
                        questionFormat="sba"
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
              resourceType={visualBulkType}
            />
            {/* Algorithm Builder + Bulk Upload Modals */}
            {algorithmBuilderOpen && (
              <AlgorithmBuilderModal
                open={algorithmBuilderOpen}
                onClose={() => { setAlgorithmBuilderOpen(false); setEditingAlgorithm(null); }}
                onSave={async (title, description, json) => {
                  try {
                    if (editingAlgorithm) {
                      await updateAlg.mutateAsync({ id: editingAlgorithm.id, title, description, algorithm_json: json as any });
                      toast.success('Algorithm updated');
                    } else {
                      await createAlg.mutateAsync({
                        title, description, algorithm_json: json,
                        module_id: moduleId!, chapter_id: chapterId || null, topic_id: null,
                      });
                      toast.success('Algorithm created');
                    }
                    setAlgorithmBuilderOpen(false);
                    setEditingAlgorithm(null);
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to save algorithm');
                  }
                }}
                initial={editingAlgorithm}
                saving={createAlg.isPending || updateAlg.isPending}
              />
            )}
            <AlgorithmBulkUploadModal
              open={algorithmBulkOpen}
              onClose={() => setAlgorithmBulkOpen(false)}
              onImport={async (algorithms) => {
                if (!moduleId) { toast.error('Module ID missing'); return; }
                try {
                  for (const alg of algorithms) {
                    await createAlg.mutateAsync({
                      title: alg.title, algorithm_json: alg.json,
                      module_id: moduleId, chapter_id: chapterId || null, topic_id: null,
                    });
                  }
                  toast.success(`${algorithms.length} algorithm(s) imported`);
                  setAlgorithmBulkOpen(false);
                } catch (err: any) {
                  toast.error(err.message || 'Import failed');
                }
              }}
              importing={createAlg.isPending}
            />
            <PathwayAIGenerateModal
              open={algorithmAIOpen}
              onOpenChange={setAlgorithmAIOpen}
              moduleId={moduleId!}
              moduleName={module?.name}
              chapterId={chapterId}
              chapterTitle={chapter?.title}
              onSave={async (title, description, json, extras) => {
                await createAlg.mutateAsync({
                  title, description, algorithm_json: json,
                  module_id: moduleId!, chapter_id: chapterId || null, topic_id: null,
                  reveal_mode: (extras?.reveal_mode as any) || 'node_by_node',
                  include_consequences: extras?.include_consequences ?? true,
                  initial_state_json: (extras?.initial_state_json as any) || null,
                });
              }}
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
