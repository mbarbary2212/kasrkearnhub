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
import { useTopic } from '@/hooks/useTopics';
import { useModule } from '@/hooks/useModules';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAddPermissionGuard } from '@/hooks/useAddPermissionGuard';
import { AdminContentActions } from '@/components/admin/AdminContentActions';
import { SocraticDocumentCard } from '@/components/content/SocraticDocumentCard';
import { LectureList } from '@/components/content/LectureList';
import EssayList from '@/components/content/EssayList';
import { MatchingQuestionList } from '@/components/content/MatchingQuestionList';
import { McqList } from '@/components/content/McqList';
import { TrueFalseList } from '@/components/content/TrueFalseList';
import { OsceList } from '@/components/content/OsceList';
import { ChapterProgressBar } from '@/components/content/ChapterProgressBar';
import { MobileSectionDropdown } from '@/components/content/MobileSectionDropdown';
import { ResourcesDeleteManager, ResourceKind, requestResourceDelete } from '@/components/content/ResourcesDeleteManager';
import { FlashcardsTab } from '@/components/study/FlashcardsTab';
import { AIFlashcardGenerateButton } from '@/components/flashcards/AIFlashcardGenerateButton';
import { StudyResourceFormModal } from '@/components/study/StudyResourceFormModal';
import { StudyBulkUploadModal } from '@/components/study/StudyBulkUploadModal';
import { ClinicalToolsSection } from '@/components/study/ClinicalToolsSection';
import { useTopicAlgorithms } from '@/hooks/useInteractiveAlgorithms';
import { VisualResourcesSection } from '@/components/study/VisualResourcesSection';
import { MindMapBulkUploadModal } from '@/components/study/MindMapBulkUploadModal';
import { GuidedExplanationList } from '@/components/study/GuidedExplanationList';
import { ResourcesTabContent } from '@/components/content/ResourcesTabContent';
import { RichDocumentViewer } from '@/components/study/RichDocumentViewer';
import { ChapterMockExamSection } from '@/components/exam';
import { AskCoachButton } from '@/components/coach';
import { useCoachContext } from '@/contexts/CoachContext';
import { useLectures, useResources, useEssays } from '@/hooks/useContent';
import { useClinicalCases } from '@/hooks/useClinicalCases';
import { useTopicCaseScenarios } from '@/hooks/useCaseScenarios';
import { CaseScenarioList } from '@/components/content/CaseScenarioList';
import { useTopicMcqs, useTopicSbas } from '@/hooks/useMcqs';
import { useTopicTrueFalseQuestions } from '@/hooks/useTrueFalseQuestions';
import { useTopicOsceQuestions } from '@/hooks/useOsceQuestions';
import { 
  useTopicStudyResources, 
  useTopicStudyResourcesByType, 
  useDeleteStudyResource,
  useHideEmptySelfAssessmentTabs, 
  StudyResource,
} from '@/hooks/useStudyResources';
import { useTopicMatchingQuestions } from '@/hooks/useMatchingQuestions';
import { useTopicSectionsEnabled, useTopicSections } from '@/hooks/useSections';
import { useContentProgress } from '@/hooks/useContentProgress';
import { SectionFilter } from '@/components/sections';
import { SectionsManager } from '@/components/sections';
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
import { 
  ArrowLeft, 
  Video, 
  FileText, 
  FlaskConical,
  FolderOpen,
  GraduationCap,
  ClipboardCheck,
  Plus,
  Upload,
  Image,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { useModulePinSettings, useStudentModulePreferences, filterByCustomPrefs } from '@/hooks/useCustomizeView';

import { usePresence } from '@/contexts/PresenceContext';
import { cn } from '@/lib/utils';
import { AlgorithmList } from '@/components/algorithms';
import { ClinicalCaseList, ClinicalCaseAdminList } from '@/components/clinical-cases';


type SectionMode = 'resources' | 'interactive' | 'practice' | 'test';

export default function TopicDetailPage() {
  const { moduleId, topicId } = useParams();
  const navigate = useNavigate();
  const auth = useAuthContext();
  const queryClient = useQueryClient();
  const { guard: guardAdd, dialog: permissionDialog } = useAddPermissionGuard({ moduleId, topicId });
  const deleteStudyResource = useDeleteStudyResource();
  const { setStudyContext } = useCoachContext();
  const { updatePresence } = usePresence();

  const showAddControls = !!(
    auth.isTeacher ||
    auth.isAdmin ||
    auth.isModuleAdmin ||
    auth.isTopicAdmin ||
    auth.isDepartmentAdmin ||
    auth.isPlatformAdmin ||
    auth.isSuperAdmin
  );

  const canManageContent = !!(auth.isTeacher || (topicId && auth.canManageTopic(topicId)));

  const [searchParams] = useSearchParams();
  const getSection = (): SectionMode => {
    const s = searchParams.get('section') as SectionMode;
    return s && ['resources', 'interactive', 'practice', 'test'].includes(s) ? s : 'resources';
  };
  const [activeSection, setActiveSection] = useState<SectionMode>(getSection);

  // Sync activeSection when URL search params change (sidebar clicks)
  useEffect(() => {
    const s = searchParams.get('section') as SectionMode;
    if (s && ['resources', 'interactive', 'practice', 'test'].includes(s)) {
      setActiveSection(s);
    }
  }, [searchParams]);
  
  const [resourcesTab, setResourcesTab] = useState<ResourceTabId>('lectures');
  const [interactiveTab, setInteractiveTab] = useState<InteractiveTabId>('cases');
  const [practiceTab, setPracticeTab] = useState<PracticeTabId>('mcqs');
  const [socratesSubTab, setSocratesSubTab] = useState<'documents' | 'questions'>('documents');
  const [lecturesResetKey, setLecturesResetKey] = useState(0);
  
  // Section filter state (only for Resources and Practice, NOT for Test)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Deleted items toggle state
  const [showDeletedMcqs, setShowDeletedMcqs] = useState(false);
  const [showDeletedSbas, setShowDeletedSbas] = useState(false);
  const [showDeletedTrueFalse, setShowDeletedTrueFalse] = useState(false);
  const [showDeletedOsce, setShowDeletedOsce] = useState(false);
  const [showDeletedEssays, setShowDeletedEssays] = useState(false);
  const [showDeletedMatching, setShowDeletedMatching] = useState(false);

  // Modals
  const [flashcardFormOpen, setFlashcardFormOpen] = useState(false);
  const [flashcardBulkOpen, setFlashcardBulkOpen] = useState(false);
  const [mindMapBulkOpen, setMindMapBulkOpen] = useState(false);
  const [visualBulkType, setVisualBulkType] = useState<'mind_map' | 'infographic'>('mind_map');
  const [editingFlashcard, setEditingFlashcard] = useState<StudyResource | null>(null);

  // Data fetching
  const { data: topic, isLoading: topicLoading } = useTopic(topicId);
  const { data: module, isLoading: moduleLoading } = useModule(moduleId || '');
  const { data: lectures, isLoading: lecturesLoading } = useLectures(topicId);
  const { data: resources, isLoading: resourcesLoading } = useResources(topicId);
  const { data: essays, isLoading: essaysLoading } = useEssays(topicId);
  const { data: deletedEssays } = useEssays(topicId);
  const { data: matchingQuestions, isLoading: matchingLoading } = useTopicMatchingQuestions(topicId);
  const { data: deletedMatchingQuestions } = useTopicMatchingQuestions(topicId);
  const { data: studyResources, isLoading: studyResourcesLoading } = useTopicStudyResources(topicId);
  const { data: flashcards, isLoading: flashcardsLoading } = useTopicStudyResourcesByType(topicId, 'flashcard');
  const { data: hideEmptyTabs } = useHideEmptySelfAssessmentTabs();
  const { data: sectionsEnabled } = useTopicSectionsEnabled(topicId);
  const { data: topicSections } = useTopicSections(sectionsEnabled ? topicId : undefined);
  const { data: interactiveAlgorithms } = useTopicAlgorithms(topicId);
  const { data: topicProgress, isLoading: progressLoading } = useContentProgress({ topicId });

  // Build a map of section_id → display_order for sorting
  const sectionOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    if (topicSections) {
      topicSections.forEach(s => map.set(s.id, s.display_order));
    }
    return map;
  }, [topicSections]);
  const { data: clinicalCases, isLoading: clinicalCasesLoading } = useClinicalCases(moduleId, canManageContent);

  // Modern hooks for MCQ, True/False, OSCE
  const { data: mcqs, isLoading: mcqsLoading } = useTopicMcqs(topicId, false);
  const { data: deletedMcqs } = useTopicMcqs(topicId, true);
  const { data: sbaQuestions, isLoading: sbaLoading } = useTopicSbas(topicId, false);
  const { data: deletedSbas } = useTopicSbas(topicId, true);
  const { data: trueFalseQuestions, isLoading: trueFalseLoading } = useTopicTrueFalseQuestions(topicId, false);
  const { data: deletedTrueFalse } = useTopicTrueFalseQuestions(topicId, true);
  const { data: osceQuestions, isLoading: osceLoading } = useTopicOsceQuestions(topicId, false);
  const { data: deletedOsce } = useTopicOsceQuestions(topicId, true);

  const { data: topicCaseScenarios, isLoading: caseScenariosLoading } = useTopicCaseScenarios(topicId);

  // Filter clinical cases by topic
  const topicClinicalCases = (clinicalCases || []).filter(c => c.topic_id === topicId);

  // Compute deleted-only arrays
  const deletedOnlyMcqs = useMemo(() => {
    const activeIds = new Set((mcqs || []).map(m => m.id));
    return (deletedMcqs || []).filter(m => !activeIds.has(m.id));
  }, [mcqs, deletedMcqs]);

  const deletedOnlySbas = useMemo(() => {
    const activeIds = new Set((sbaQuestions || []).map(m => m.id));
    return (deletedSbas || []).filter(m => !activeIds.has(m.id));
  }, [sbaQuestions, deletedSbas]);

  const deletedOnlyTrueFalse = useMemo(() => {
    const activeIds = new Set((trueFalseQuestions || []).map(q => q.id));
    return (deletedTrueFalse || []).filter(q => !activeIds.has(q.id));
  }, [trueFalseQuestions, deletedTrueFalse]);

  const deletedOnlyOsce = useMemo(() => {
    const activeIds = new Set((osceQuestions || []).map(q => q.id));
    return (deletedOsce || []).filter(q => !activeIds.has(q.id));
  }, [osceQuestions, deletedOsce]);

  const deletedOnlyEssays: typeof essays = [];

  const deletedOnlyMatching: typeof matchingQuestions = [];

  // Filter study resources by type
  const algorithms = useMemo(() => studyResources?.filter(r => r.resource_type === 'algorithm') || [], [studyResources]);
  const mindMaps = useMemo(() => studyResources?.filter(r => r.resource_type === 'mind_map') || [], [studyResources]);
  const workedCases = useMemo(() => studyResources?.filter(r => r.resource_type === 'clinical_case_worked') || [], [studyResources]);
  const guidedExplanations = useMemo(() => studyResources?.filter(r => r.resource_type === 'guided_explanation') || [], [studyResources]);
  
  // Count non-flashcard study resources (tables, exam tips, images) for Documents tab
  const documentStudyResources = useMemo(() => studyResources?.filter(r => 
    r.resource_type === 'table' || r.resource_type === 'exam_tip' || r.resource_type === 'key_image'
  ) || [], [studyResources]);
  // Socratic tutorials (from resources table) are now shown under the Socratic Tutorials tab
  const socraticTutorials = useMemo(() => resources?.filter(r => (r as any).document_subtype === 'socratic_tutorial') || [], [resources]);
  const nonSocraticResources = useMemo(() => resources?.filter(r => (r as any).document_subtype !== 'socratic_tutorial') || [], [resources]);
  const documentsCount = nonSocraticResources.length + documentStudyResources.length;
  
  // Reset section filter when leaving topic
  useEffect(() => {
    return () => setSelectedSectionId(null);
  }, [topicId]);

  // Update Coach context when page loads or section changes
  useEffect(() => {
    if (module && topic) {
      setStudyContext({
        pageType: activeSection === 'resources' ? 'resource' : activeSection === 'practice' ? 'practice' : 'test',
        moduleId: module.id,
        moduleName: module.name,
        topicId: topic.id,
      });
    }
  }, [module, topic, activeSection, setStudyContext]);

  // Broadcast realtime presence — what the user is currently doing
  useEffect(() => {
    if (!module || !topic) return;
    const activeTab =
      activeSection === 'resources' ? resourcesTab
      : activeSection === 'interactive' ? interactiveTab
      : activeSection === 'practice' ? practiceTab
      : undefined;
    updatePresence({
      year_id: module.year_id,
      module_name: module.name,
      topic_name: topic.name,
      page: 'topic',
      section_mode: activeSection,
      active_tab: activeTab,
    });
  }, [module, topic, activeSection, resourcesTab, interactiveTab, practiceTab, updatePresence]);
  
  // Helper function to filter and sort content by section hierarchy
  const filterBySection = useCallback(<T,>(items: T[]): T[] => {
    if (!sectionsEnabled) return items;
    if (selectedSectionId) {
      return items.filter(item => {
        const sectionableItem = item as unknown as { section_id?: string | null };
        return sectionableItem.section_id === selectedSectionId;
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

  // Handler for deleting study resources via ResourcesDeleteManager
  const handleDeleteStudyResource = useCallback(async (kind: ResourceKind, id: string) => {
    if (!topicId) return;
    await deleteStudyResource.mutateAsync({ id, topicId });
    toast.success('Resource deleted');
  }, [deleteStudyResource, topicId]);

  // Refetch study resources
  const refetchStudyResources = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['study-resources', 'topic', topicId] });
  }, [queryClient, topicId]);

  const sectionNav = [
    { id: 'resources' as SectionMode, label: 'Resources', mobileLabel: 'Resources', icon: FolderOpen },
    { id: 'interactive' as SectionMode, label: 'Interactive', mobileLabel: 'Interactive', icon: Sparkles },
    { id: 'practice' as SectionMode, label: 'Self Assessment', mobileLabel: 'Self Assess', icon: GraduationCap },
    { id: 'test' as SectionMode, label: 'Test Yourself', mobileLabel: 'Test', icon: ClipboardCheck },
  ];

  // Use unified tab configuration - create all tabs first
  const topicInfographicsCount = studyResources?.filter(r => r.resource_type === 'infographic')?.length || 0;
  const topicMindMapsTotal = mindMaps.length;

  const allResourcesTabs = useMemo(() => {
    const tabs = createResourceTabs({
      lectures: lectures?.length || 0,
      flashcards: flashcards?.length || 0,
      mind_maps: topicMindMapsTotal + topicInfographicsCount,
      guided_explanations: guidedExplanations.length + socraticTutorials.length,
      reference_materials: documentsCount,
      clinical_tools: workedCases.length,
    });
    const vmTab = tabs.find(t => t.id === 'mind_maps');
    if (vmTab) {
      vmTab.subcounts = [
        { label: 'Maps', count: topicMindMapsTotal },
        { label: 'Infographics', count: topicInfographicsCount },
      ];
    }
    return tabs;
  }, [lectures?.length, flashcards?.length, topicMindMapsTotal, topicInfographicsCount, guidedExplanations.length, documentsCount, interactiveAlgorithms?.length, workedCases.length, studyResources, socraticTutorials.length]);

  // Admin sees all tabs; students see filtered based on setting
  const { data: pinSettings } = useModulePinSettings();
  const { data: studentPrefs } = useStudentModulePreferences();
  

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
      cases: topicClinicalCases.length,
      pathways: interactiveAlgorithms?.length || 0,
    });
  }, [topicClinicalCases.length, interactiveAlgorithms?.length]);

  const interactiveTabs = useMemo(() => {
    if (canManageContent) return allInteractiveTabs;
    const filtered = filterTabsForStudent(allInteractiveTabs, hideEmptyTabs ?? false);
    return filterByCustomPrefs(filtered, pinSettings, studentPrefs);
  }, [canManageContent, allInteractiveTabs, hideEmptyTabs, pinSettings, studentPrefs]);

  const allPracticeTabs = useMemo(() => {
    return createPracticeTabs({
      mcqs: mcqs?.length || 0,
      sba: sbaQuestions?.length || 0,
      true_false: trueFalseQuestions?.length || 0,
      essays: essays?.length || 0,
      osce: osceQuestions?.length || 0,
      practical: 0,
      matching: matchingQuestions?.length || 0,
      images: 0,
      short_cases: topicCaseScenarios?.filter(s => !s.is_deleted)?.length || 0,
    });
  }, [mcqs?.length, sbaQuestions?.length, trueFalseQuestions?.length, essays?.length, osceQuestions?.length, matchingQuestions?.length, topicCaseScenarios?.length]);

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

  // Early return for not found - MUST be after all hooks
  if (!topicLoading && !topic) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Topic not found.</p>
          <Button onClick={() => navigate(`/module/${moduleId}`)} className="mt-4">
            Back to Module
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/module/${moduleId}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            {(moduleLoading || topicLoading) ? (
              <>
                <Skeleton className="hidden md:block h-5 w-48 mb-2" />
                <Skeleton className="h-8 w-96 max-w-full" />
              </>
            ) : (
              <>
                {/* Desktop: Full two-line header */}
                <div className="hidden md:block">
                  <p className="text-sm text-muted-foreground">{module?.name}</p>
                  <h1 className="text-lg font-heading font-semibold">
                    {topic?.name}
                  </h1>
                </div>
                {/* Mobile: Just the topic title, smaller */}
                <h1 className="md:hidden text-lg font-heading font-semibold line-clamp-1">
                  {topic?.name}
                </h1>
              </>
            )}
          </div>
        </div>

        {/* Topic Progress Bar - hidden for admins */}
        {!canManageContent && (
          <ChapterProgressBar
            totalProgress={topicProgress?.totalProgress || 0}
            practiceProgress={topicProgress?.practiceProgress || 0}
            videoProgress={topicProgress?.videoProgress || 0}
            practiceCompleted={topicProgress?.practiceCompleted || 0}
            practiceTotal={topicProgress?.practiceTotal || 0}
            videosCompleted={topicProgress?.videosCompleted || 0}
            videosTotal={topicProgress?.videosTotal || 0}
            isLoading={progressLoading}
            status={topicProgress?.status}
          />
        )}

        {/* Inline Sections Manager - Admin only */}
        {canManageContent && topicId && (
          <SectionsManager topicId={topicId} canManage={canManageContent} />
        )}

        {/* Main Content Layout */}
        <div className="flex flex-col md:flex-row">
          {/* Mobile: Horizontal Navigation */}
          <div className="md:hidden mb-4">
            <nav className="flex gap-1.5 bg-muted/50 border border-border/50 rounded-xl p-1.5 shadow-sm">
              {sectionNav.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs transition-colors",
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


          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Resources Section */}
            {activeSection === 'resources' && (
              <div className="space-y-4">
                {/* Section Filter - shown when sections are enabled */}
                {sectionsEnabled && (
                  <SectionFilter
                    topicId={topicId}
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
                        {tab.subcounts && tab.subcounts.length > 0 ? (
                          <span className="flex items-center gap-0.5">
                            {tab.subcounts.map((sc) => (
                              <Badge key={sc.label} variant="outline" className="h-5 px-1.5 text-[10px]" title={sc.label}>
                                {sc.count}
                              </Badge>
                            )).reduce((prev, curr) => (
                              <>{prev}<span className="text-muted-foreground/50 text-[10px]">/</span>{curr}</>
                            ) as any)}
                          </span>
                        ) : (
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{tab.count}</Badge>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Lectures Content */}
                {resourcesTab === 'lectures' && (
                  <div>
                    {showAddControls && topicId && moduleId && (
                      <div className="mb-4">
                        <AdminContentActions topicId={topicId} moduleId={moduleId} contentType="lecture" />
                      </div>
                    )}
                    {lecturesLoading ? (
                      <LectureListSkeleton count={3} />
                    ) : (
                      <LectureList 
                        key={lecturesResetKey}
                        lectures={filterBySection(lectures || [])} 
                        moduleId={moduleId}
                        topicId={topicId}
                        canEdit={canManageContent}
                        canDelete={canManageContent}
                        showFeedback={true}
                      />
                    )}
                  </div>
                )}

                {/* Flashcards */}
                {resourcesTab === 'flashcards' && (
                  <div>
                    {showAddControls && topicId && moduleId && (
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
                        <AIFlashcardGenerateButton
                          topicId={topicId}
                          moduleId={moduleId}
                        />
                      </div>
                    )}
                    {flashcardsLoading ? (
                      <LectureListSkeleton count={3} />
                    ) : (
                      <FlashcardsTab
                        resources={filterBySection(flashcards || [])}
                        canManage={canManageContent}
                        onEdit={handleEditFlashcard}
                        topicId={topicId}
                      />
                    )}
                  </div>
                )}

                {/* Mind Maps Content */}
                {resourcesTab === 'mind_maps' && topicId && (
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
                    topicId={topicId}
                    filterBySection={filterBySection}
                    isLoading={studyResourcesLoading}
                  />
                )}

                {/* Socrates Content - with Documents and Questions sub-tabs */}
                {resourcesTab === 'guided_explanations' && topicId && (
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
                        {showAddControls && topicId && moduleId && (
                          <div className="mb-4">
                            <AdminContentActions topicId={topicId} moduleId={moduleId} contentType="resource" hideAudio documentSubtype="socratic_tutorial" />
                          </div>
                        )}
                        {resourcesLoading ? (
                          <QuestionListSkeleton count={2} type="mcq" />
                        ) : socraticTutorials.length > 0 ? (
                          <div className="space-y-3">
                            {socraticTutorials.map((doc: any) => (
                              doc.rich_content ? (
                                <RichDocumentViewer
                                  key={doc.id}
                                  title={doc.title}
                                  content={doc.rich_content}
                                  documentType="socratic_tutorial"
                                  resourceId={doc.id}
                                  topicId={topicId}
                                />
                              ) : (
                                <SocraticDocumentCard
                                  key={doc.id}
                                  doc={doc}
                                  canManage={canManageContent}
                                  invalidateKey={['resources', topicId!]}
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
                            resources={filterBySection(guidedExplanations)}
                            canManage={canManageContent}
                            onEdit={handleEditFlashcard}
                            onDelete={(id) => {
                              const resource = guidedExplanations.find(r => r.id === id);
                              requestResourceDelete('guided_explanation', id, resource?.title);
                            }}
                            topicId={topicId}
                          />
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Reference Materials Content */}
                {resourcesTab === 'reference_materials' && topicId && moduleId && (
                  <ResourcesTabContent
                    chapterId={topicId}
                    moduleId={moduleId}
                    resources={filterBySection(nonSocraticResources)}
                    resourcesLoading={resourcesLoading}
                    canManageContent={canManageContent}
                    isSuperAdmin={auth.isSuperAdmin}
                  />
                )}

                {/* Clinical Tools Content */}
                {resourcesTab === 'clinical_tools' && topicId && moduleId && (
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
                    topicId={topicId}
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
                {interactiveTab === 'cases' && moduleId && topicId && (
                  <div>
                    {canManageContent ? (
                      <ClinicalCaseAdminList moduleId={moduleId} topicId={topicId} />
                    ) : clinicalCasesLoading ? (
                      <QuestionListSkeleton count={2} type="mcq" />
                    ) : (
                      <ClinicalCaseList moduleId={moduleId} topicId={topicId} />
                    )}
                  </div>
                )}

                {/* Pathways (Algorithms) Content */}
                {interactiveTab === 'pathways' && topicId && moduleId && (
                  <div className="space-y-4">
                    {canManageContent && (
                      <div className="flex gap-2 mb-4">
                        <Button size="sm" variant="outline" onClick={() => {
                          setEditingFlashcard(null);
                          (window as any).__pendingResourceType = 'algorithm';
                          setFlashcardFormOpen(true);
                        }}>
                          <Plus className="w-3 h-3 mr-1" /> Build Pathway
                        </Button>
                      </div>
                    )}
                    <AlgorithmList
                      algorithms={interactiveAlgorithms || []}
                      canManage={canManageContent}
                      onEdit={() => {}}
                      onDelete={async () => {
                        toast.info('Use the pathway builder to manage pathways');
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
                    topicId={topicId}
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

                {/* MCQs */}
                {practiceTab === 'mcqs' && (
                  <div>
                    {mcqsLoading ? (
                      <QuestionListSkeleton count={2} type="mcq" />
                    ) : (
                      <McqList
                        mcqs={filterBySection(mcqs || [])}
                        deletedMcqs={deletedOnlyMcqs}
                        moduleId={moduleId || ''}
                        topicId={topicId}
                        isAdmin={canManageContent}
                        showDeletedToggle={canManageContent}
                        showDeleted={showDeletedMcqs}
                        onShowDeletedChange={setShowDeletedMcqs}
                      />
                    )}
                  </div>
                )}

                {/* SBA Questions */}
                {practiceTab === 'sba' && (
                  <div>
                    {sbaLoading ? (
                      <QuestionListSkeleton count={2} type="mcq" />
                    ) : (
                      <McqList
                        mcqs={filterBySection(sbaQuestions || [])}
                        deletedMcqs={deletedOnlySbas}
                        moduleId={moduleId || ''}
                        topicId={topicId}
                        isAdmin={canManageContent}
                        showDeletedToggle={canManageContent}
                        showDeleted={showDeletedSbas}
                        onShowDeletedChange={setShowDeletedSbas}
                        questionFormat="sba"
                      />
                    )}
                  </div>
                )}

                {/* True/False Questions */}
                {practiceTab === 'true_false' && (
                  <div>
                    {trueFalseLoading ? (
                      <QuestionListSkeleton count={2} type="mcq" />
                    ) : (
                      <TrueFalseList
                        questions={filterBySection(trueFalseQuestions || [])}
                        deletedQuestions={deletedOnlyTrueFalse}
                        moduleId={moduleId || ''}
                        topicId={topicId}
                        isAdmin={canManageContent}
                        showDeletedToggle={canManageContent}
                        showDeleted={showDeletedTrueFalse}
                        onShowDeletedChange={setShowDeletedTrueFalse}
                      />
                    )}
                  </div>
                )}

                {/* Short Essays */}
                {practiceTab === 'essays' && (
                  <div>
                    {showAddControls && topicId && moduleId && (
                      <div className="mb-4">
                        <AdminContentActions topicId={topicId} moduleId={moduleId} contentType="essay" />
                      </div>
                    )}
                    {essaysLoading ? (
                      <QuestionListSkeleton count={2} type="mcq" />
                    ) : (
                      <EssayList
                        essays={filterBySection(essays || [])}
                        deletedEssays={deletedOnlyEssays}
                        moduleId={moduleId}
                        topicId={topicId}
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




                {/* OSCE */}
                {practiceTab === 'osce' && (
                  <div>
                    {osceLoading ? (
                      <QuestionListSkeleton count={2} type="osce" />
                    ) : (
                      <OsceList
                        questions={filterBySection(osceQuestions || [])}
                        deletedQuestions={deletedOnlyOsce}
                        moduleId={moduleId || ''}
                        topicId={topicId}
                        moduleCode={module?.slug?.toUpperCase() || 'MODULE'}
                        chapterTitle={topic?.name || 'TOPIC'}
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

                {/* Matching Questions */}
                {practiceTab === 'matching' && (
                  <div>
                    {matchingLoading ? (
                      <QuestionListSkeleton count={2} type="matching" />
                    ) : (
                      <MatchingQuestionList
                        questions={filterBySection(matchingQuestions || [])}
                        deletedQuestions={deletedOnlyMatching}
                        moduleId={moduleId || ''}
                        topicId={topicId}
                        isAdmin={canManageContent}
                        showDeletedToggle={canManageContent}
                        showDeleted={showDeletedMatching}
                        onShowDeletedChange={setShowDeletedMatching}
                      />
                    )}
                  </div>
                )}

                {/* Short Cases */}
                {practiceTab === 'short_cases' && (
                  <div>
                    {caseScenariosLoading ? (
                      <QuestionListSkeleton count={2} type="mcq" />
                    ) : (
                      <CaseScenarioList
                        scenarios={topicCaseScenarios || []}
                        isAdmin={canManageContent}
                      />
                    )}
                  </div>
                )}

                {/* Image Questions (placeholder) */}
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
            {activeSection === 'test' && topicId && moduleId && (
              <ChapterMockExamSection
                moduleId={moduleId}
                topicId={topicId}
              />
            )}
          </div>
        </div>

        {/* Modals */}
        {topicId && moduleId && (
          <>
            <StudyResourceFormModal
              open={flashcardFormOpen}
              onOpenChange={(open) => {
                setFlashcardFormOpen(open);
                if (!open) delete (window as any).__pendingResourceType;
              }}
              topicId={topicId}
              moduleId={moduleId}
              resourceType={(window as any).__pendingResourceType || editingFlashcard?.resource_type || 'flashcard'}
              resource={editingFlashcard}
            />
            <StudyBulkUploadModal
              open={flashcardBulkOpen}
              onOpenChange={setFlashcardBulkOpen}
              topicId={topicId}
              moduleId={moduleId}
              resourceType={(window as any).__pendingBulkResourceType || 'flashcard'}
            />
            {mindMapBulkOpen && (
              <MindMapBulkUploadModal
                key={visualBulkType}
                open
                onOpenChange={setMindMapBulkOpen}
                topicId={topicId}
                moduleId={moduleId}
                resourceType={visualBulkType}
              />
            )}
          </>
        )}

        {/* Study Resource Delete Manager */}
        {canManageContent && topicId && (
          <ResourcesDeleteManager
            deleteResource={handleDeleteStudyResource}
            refetchResources={refetchStudyResources}
          />
        )}

        {/* Permission Dialog */}
        {permissionDialog}
      </div>
    </MainLayout>
  );
}
