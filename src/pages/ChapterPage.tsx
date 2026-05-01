import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ContextGuide } from "@/components/guidance/ContextGuide";
import { useTrackPosition } from "@/hooks/useTrackPosition";
import * as Sentry from "@sentry/react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QuestionListSkeleton, LectureListSkeleton } from "@/components/ui/skeletons";
import { Badge } from "@/components/ui/badge";
import { useModule } from "@/hooks/useModules";
import { useChapter } from "@/hooks/useChapters";
import { useAuthContext } from "@/contexts/AuthContext";
import { useAddPermissionGuard } from "@/hooks/useAddPermissionGuard";
import { AdminContentActions } from "@/components/admin/AdminContentActions";
import { SocraticDocumentCard } from "@/components/content/SocraticDocumentCard";
import { LectureList } from "@/components/content/LectureList";
import { ResourcesTabContent } from "@/components/content/ResourcesTabContent";
import { RichDocumentViewer } from "@/components/study/RichDocumentViewer";
import { McqList } from "@/components/content/McqList";
import { OsceList } from "@/components/content/OsceList";
import EssayList from "@/components/content/EssayList";
import { ChapterProgressBar } from "@/components/content/ChapterProgressBar";
import { MatchingQuestionList } from "@/components/content/MatchingQuestionList";
import {
  ResourcesDeleteManager,
  ResourceKind,
  requestResourceDelete,
} from "@/components/content/ResourcesDeleteManager";
import { MobileSectionDropdown } from "@/components/content/MobileSectionDropdown";
import { ClinicalCaseList, ClinicalCaseAdminList } from "@/components/clinical-cases";
import { CaseScenarioList } from "@/components/content/CaseScenarioList";
import { SectionFilter } from "@/components/sections";
import { SectionsManager } from "@/components/sections";
import { useChapterSectionsEnabled, useChapterSections, useChapterLectureSectionsMap } from "@/hooks/useSections";
import {
  useChapterLectures,
  useChapterResources,
  useChapterEssays,
  useChapterEssayCount,
  useChapterClinicalCaseCount,
} from "@/hooks/useChapterContent";
import { useChapterOsceQuestions, useChapterOsceCount } from "@/hooks/useOsceQuestions";
import { useChapterCaseScenarios, useChapterCaseScenarioCount } from "@/hooks/useCaseScenarios";
import { useChapterProgress } from "@/hooks/useChapterProgress";
import { useChapterMatchingQuestions, useChapterMatchingCount } from "@/hooks/useMatchingQuestions";
import { useClinicalCases } from "@/hooks/useClinicalCases";
import { FlashcardsTab } from "@/components/study/FlashcardsTab";
import { AIFlashcardGenerateButton } from "@/components/flashcards/AIFlashcardGenerateButton";
import { StudyResourceFormModal } from "@/components/study/StudyResourceFormModal";
import { StudyBulkUploadModal } from "@/components/study/StudyBulkUploadModal";
import { ClinicalToolsSection } from "@/components/study/ClinicalToolsSection";
import { VisualResourcesSection } from "@/components/study/VisualResourcesSection";
import { MindMapBulkUploadModal } from "@/components/study/MindMapBulkUploadModal";
import { usePublishedMindMaps } from "@/hooks/useMindMaps";
import { GuidedExplanationList } from "@/components/study/GuidedExplanationList";
import {
  useChapterStudyResources,
  useDeleteStudyResource,
  StudyResource,
  useHideEmptySelfAssessmentTabs,
  StudyResourceType,
  GuidedExplanationContent,
} from "@/hooks/useStudyResources";
import { useChapterMcqs, useChapterMcqCount, useChapterSbas, useChapterSbaCount } from "@/hooks/useMcqs";
import { useChapterTrueFalseQuestions, useChapterTrueFalseCount } from "@/hooks/useTrueFalseQuestions";
import { TrueFalseList } from "@/components/content/TrueFalseList";
import { useChapterAlgorithms } from "@/hooks/useInteractiveAlgorithms";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createResourceTabs,
  createPracticeTabs,
  createInteractiveTabs,
  filterTabsForStudent,
  ResourceTabId,
  PracticeTabId,
  InteractiveTabId,
  SOCRATES_ICON_PATH,
} from "@/config/tabConfig";
import {
  AlgorithmList,
  AlgorithmBuilderModal,
  AlgorithmBulkUploadModal,
  PathwayAIGenerateModal,
} from "@/components/algorithms";
import {
  useCreateInteractiveAlgorithm,
  useUpdateInteractiveAlgorithm,
  useDeleteInteractiveAlgorithm,
} from "@/hooks/useInteractiveAlgorithms";
import { InteractiveAlgorithm, AlgorithmJson } from "@/types/algorithm";
import { ChapterMockExamSection } from "@/components/exam";
import { AskCoachButton } from "@/components/coach";
import { useCoachContext } from "@/contexts/CoachContext";
import { ChapterQASection } from "@/components/questions/ChapterQASection";
import { usePresence } from "@/contexts/PresenceContext";
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
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useModulePinSettings, useStudentModulePreferences, filterByCustomPrefs } from "@/hooks/useCustomizeView";

import { cn } from "@/lib/utils";
import { ChapterAdminAvatars } from '@/components/content/ChapterAdminAvatars';
import type { ContentAdmin } from '@/hooks/useContentAdmins';
import InquiryModal from '@/components/feedback/InquiryModal';
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useStudentChapterMetrics } from '@/hooks/useStudentChapterMetrics';
import { classifyFromMetrics } from '@/lib/readiness';
import { RecommendedPathBanner } from '@/components/content/RecommendedPathBanner';
import { getRecommendedPath } from '@/lib/recommendedPath';
import { useStudyTimeTracker } from '@/hooks/useStudyTimeTracker';

type SectionMode = "resources" | "interactive" | "practice" | "test";

export default function ChapterPage() {
  const { moduleId, chapterId } = useParams();
  const navigate = useNavigate();
  const auth = useAuthContext();
  const queryClient = useQueryClient();
  const { guard: guardAdd, dialog: permissionDialog } = useAddPermissionGuard({ moduleId, chapterId });
  const deleteStudyResource = useDeleteStudyResource();
  const { setStudyContext } = useCoachContext();
  const { updatePresence } = usePresence();

  // Inquiry modal state for admin contact
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<ContentAdmin | null>(null);
  const [selectedAdminRole, setSelectedAdminRole] = useState<'module' | 'topic'>('module');

  // Needs Attention banner state — resets when chapter changes
  const [bannerDismissed, setBannerDismissed] = useState(false);
  useEffect(() => { setBannerDismissed(false); }, [chapterId]);

  const showAddControls = !!(
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
    (chapterId && auth.canManageChapter(chapterId)) ||
    (moduleId && auth.canManageModule(moduleId))
  );

  // Teachers see all tabs (including empty) but no action buttons
  const showAllTabs = canManageContent || auth.isTeacher;

  // Redirect topic admins who are not assigned to this chapter
  useEffect(() => {
    if (auth.isTopicAdmin && !auth.isTeacher && chapterId && !auth.canManageChapter(chapterId)) {
      toast.error("Access denied: you are not assigned to this chapter");
      navigate(moduleId ? `/module/${moduleId}?section=learning` : "/");
    }
  }, [auth.isTopicAdmin, auth.isTeacher, chapterId, moduleId, navigate, auth]);

  // State for section mode and active tabs within sections
  const [searchParams] = useSearchParams();
  const getSection = (): SectionMode => {
    const s = searchParams.get("section") as SectionMode;
    return s && ["resources", "interactive", "practice", "test"].includes(s) ? s : "resources";
  };
  const initialSubTab = searchParams.get("subtab");
  const [activeSection, setActiveSection] = useState<SectionMode>(getSection);

  // Swipe navigation between sections
  const chapterContentRef = useRef<HTMLDivElement>(null);
  const sectionIds: SectionMode[] = ["resources", "interactive", "practice", "test"];
  const handleSwipeLeft = useCallback(() => {
    const idx = sectionIds.indexOf(activeSection);
    if (idx < sectionIds.length - 1) setActiveSection(sectionIds[idx + 1]);
  }, [activeSection]);
  const handleSwipeRight = useCallback(() => {
    const idx = sectionIds.indexOf(activeSection);
    if (idx > 0) setActiveSection(sectionIds[idx - 1]);
  }, [activeSection]);
  useSwipeGesture(chapterContentRef, { onSwipeLeft: handleSwipeLeft, onSwipeRight: handleSwipeRight });

  // Sync activeSection when URL search params change (sidebar clicks)
  useEffect(() => {
    const s = searchParams.get("section") as SectionMode;
    if (s && ["resources", "interactive", "practice", "test"].includes(s)) {
      setActiveSection(s);
    }
  }, [searchParams]);

  const initSection = getSection();
  const [resourcesTab, setResourcesTab] = useState<ResourceTabId>(
    initSection === "resources" && initialSubTab ? (initialSubTab as ResourceTabId) : "lectures",
  );
  const [interactiveTab, setInteractiveTab] = useState<InteractiveTabId>(
    initSection === "interactive" && initialSubTab ? (initialSubTab as InteractiveTabId) : "cases",
  );
  const [practiceTab, setPracticeTab] = useState<PracticeTabId>(
    initSection === "practice" && initialSubTab ? (initialSubTab as PracticeTabId) : "mcqs",
  );
  const [socratesSubTab, setSocratesSubTab] = useState<"documents" | "questions">("documents");
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
  const [visualBulkType, setVisualBulkType] = useState<"mind_map" | "infographic">("mind_map");
  const [editingFlashcard, setEditingFlashcard] = useState<StudyResource | null>(null);

  const { data: module, isLoading: moduleLoading } = useModule(moduleId || "");
  const { data: chapter, isLoading: chapterLoading } = useChapter(chapterId);
  const contentModuleId = chapter?.module_id ?? moduleId;
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
  const { data: caseScenarioCount = 0 } = useChapterCaseScenarioCount(chapterId);

  // Full practice data hooks - only fetch when Practice or Test section is active
  const isPracticeActive = activeSection === "practice" || activeSection === "test" || activeSection === "interactive";
  const { data: mcqs, isLoading: mcqsLoading } = useChapterMcqs(chapterId, false, { enabled: isPracticeActive });
  const { data: deletedMcqs } = useChapterMcqs(chapterId, true, { enabled: isPracticeActive && canManageContent });
  const { data: sbaQuestions, isLoading: sbaLoading } = useChapterSbas(chapterId, false, { enabled: isPracticeActive });
  const { data: deletedSbas } = useChapterSbas(chapterId, true, { enabled: isPracticeActive && canManageContent });
  const { data: essays, isLoading: essaysLoading } = useChapterEssays(chapterId, false, { enabled: isPracticeActive });
  const { data: deletedEssays } = useChapterEssays(chapterId, true, { enabled: isPracticeActive && canManageContent });
  const { data: osceQuestions, isLoading: osceLoading } = useChapterOsceQuestions(chapterId, false, {
    enabled: isPracticeActive,
  });
  const { data: deletedOsceQuestions } = useChapterOsceQuestions(chapterId, true, {
    enabled: isPracticeActive && canManageContent,
  });
  const { data: studyResources, isLoading: studyResourcesLoading } = useChapterStudyResources(chapterId);
  const { data: publishedAIMaps = [] } = usePublishedMindMaps(chapterId);
  const { data: chapterProgress, isLoading: progressLoading } = useChapterProgress(chapterId);
  const { data: matchingQuestions, isLoading: matchingLoading } = useChapterMatchingQuestions(chapterId, false, {
    enabled: isPracticeActive,
  });
  const { data: deletedMatchingQuestions } = useChapterMatchingQuestions(chapterId, true, {
    enabled: isPracticeActive && canManageContent,
  });
  const { data: trueFalseQuestions, isLoading: trueFalseLoading } = useChapterTrueFalseQuestions(chapterId, false, {
    enabled: isPracticeActive,
  });
  const { data: deletedTrueFalseQuestions } = useChapterTrueFalseQuestions(chapterId, true, {
    enabled: isPracticeActive && canManageContent,
  });
  const { data: caseScenarios, isLoading: caseScenariosLoading } = useChapterCaseScenarios(isPracticeActive ? chapterId : undefined);
  const { data: clinicalCases, isLoading: clinicalCasesLoading } = useClinicalCases(contentModuleId, canManageContent);
  const { data: hideEmptyTabs } = useHideEmptySelfAssessmentTabs();
  const { data: sectionsEnabled } = useChapterSectionsEnabled(chapterId);
  const { data: chapterSections } = useChapterSections(sectionsEnabled ? chapterId : undefined);
  const { data: lectureSectionsMap } = useChapterLectureSectionsMap(sectionsEnabled ? chapterId : undefined);
  const { data: interactiveAlgorithms } = useChapterAlgorithms(chapterId);

  // ─── Recommended Path: derive chapter state from metrics ───
  const isStudent = !showAddControls && !auth.isTeacher;
  const { data: chapterMetrics } = useStudentChapterMetrics(contentModuleId ?? undefined);
  const currentChapterState = useMemo(() => {
    if (!isStudent || !chapterMetrics || !chapterId) return undefined;
    const metric = chapterMetrics.find(m => m.chapter_id === chapterId);
    if (!metric) return 'not_started' as const;
    return classifyFromMetrics(metric);
  }, [isStudent, chapterMetrics, chapterId]);

  // Build a map of section_id → display_order for sorting
  const sectionOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    if (chapterSections) {
      chapterSections.forEach((s) => map.set(s.id, s.display_order));
    }
    return map;
  }, [chapterSections]);

  // Filter clinical cases by chapter
  const chapterClinicalCases = (clinicalCases || []).filter((c) => c.chapter_id === chapterId);

  // Reset section filter when leaving chapter
  useEffect(() => {
    return () => setSelectedSectionId(null);
  }, [chapterId]);

  // Track position for resume functionality
  const currentSubTab =
    activeSection === "resources"
      ? resourcesTab
      : activeSection === "interactive"
        ? interactiveTab
        : activeSection === "practice"
          ? practiceTab
          : null;

  // Active item tracking for deep resume
  const [activeItem, setActiveItem] = useState<{ item_id: string; item_label: string; item_index: number } | null>(
    null,
  );

  // Clear activeItem when sub-tab changes
  useEffect(() => {
    setActiveItem(null);
  }, [currentSubTab]);

  // Track position for resume functionality
  useTrackPosition({
    year_number: null,
    module_id: contentModuleId ?? null,
    module_name: module?.name ?? null,
    module_slug: module?.slug ?? null,
    chapter_id: chapterId ?? null,
    chapter_title: chapter?.title ?? null,
    tab: activeSection,
    activity_position: currentSubTab
      ? {
          sub_tab: currentSubTab,
          ...(activeItem && {
            item_id: activeItem.item_id,
            item_label: activeItem.item_label,
            item_index: activeItem.item_index,
          }),
        }
      : null,
  });

  // ─── Active study-time tracking ───
  // Map current section/subtab → activity type used by useStudyTimeTracker.
  // 'resources' counts as 'watching' when a video lecture is being viewed,
  // otherwise 'reading'. Practice/test = 'practicing'. Interactive = 'reading'.
  const studyActivityType = useMemo<'reading' | 'watching' | 'practicing' | 'cases'>(() => {
    if (activeSection === 'practice' || activeSection === 'test') return 'practicing';
    if (activeSection === 'interactive') {
      return interactiveTab === 'cases' ? 'cases' : 'reading';
    }
    // resources: treat 'lectures' (video) as watching, everything else as reading
    if (activeSection === 'resources' && resourcesTab === 'lectures') return 'watching';
    return 'reading';
  }, [activeSection, interactiveTab, resourcesTab]);

  // Pause tracking when chapter not yet loaded, when an inquiry modal is open,
  // or when admin/teacher (we only track student time).
  const trackerPaused = !chapterId || !contentModuleId || inquiryOpen || !isStudent;
  useStudyTimeTracker(chapterId, contentModuleId ?? undefined, studyActivityType, trackerPaused);

  // Helper function to filter and sort content by section hierarchy
  const filterBySection = useCallback(
    <T,>(items: T[], isLectures = false): T[] => {
      if (!sectionsEnabled) return items;
      if (selectedSectionId) {
        return items.filter((item) => {
          if (isLectures && lectureSectionsMap) {
            const lectureId = (item as unknown as { id: string }).id;
            return lectureSectionsMap.get(selectedSectionId)?.has(lectureId) ?? false;
          }
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
    },
    [selectedSectionId, sectionsEnabled, sectionOrderMap, lectureSectionsMap],
  );

  // Filter deleted MCQs only (exclude active ones)
  const deletedOnlyMcqs = (deletedMcqs || []).filter((m) => m.is_deleted);
  const deletedOnlySbas = (deletedSbas || []).filter((m) => m.is_deleted);
  const deletedOnlyMatching = (deletedMatchingQuestions || []).filter((m) => m.is_deleted);
  const deletedOnlyEssays = (deletedEssays || []).filter((e) => e.is_deleted);
  const deletedOnlyOsce = (deletedOsceQuestions || []).filter((q) => q.is_deleted);
  const deletedOnlyTrueFalse = (deletedTrueFalseQuestions || []).filter((q) => q.is_deleted);

  // Filter flashcards from study resources
  const flashcards = studyResources?.filter((r) => r.resource_type === "flashcard") || [];
  const algorithms = studyResources?.filter((r) => r.resource_type === "algorithm") || [];
  const mindMaps = studyResources?.filter((r) => r.resource_type === "mind_map") || [];
  const workedCases = studyResources?.filter((r) => r.resource_type === "clinical_case_worked") || [];

  // Count non-flashcard study resources (tables, exam tips, images) for Documents tab - algorithms moved out
  const documentStudyResources =
    studyResources?.filter(
      (r) => r.resource_type === "table" || r.resource_type === "exam_tip" || r.resource_type === "key_image",
    ) || [];
  // Socratic tutorials (from resources table) are now shown under the Socratic Tutorials tab
  const socraticTutorials = resources?.filter((r) => r.document_subtype === "socratic_tutorial") || [];
  const nonSocraticResources = resources?.filter((r) => r.document_subtype !== "socratic_tutorial") || [];
  const documentsCount = nonSocraticResources.length + documentStudyResources.length;

  const handleEditFlashcard = (resource: StudyResource) => {
    setEditingFlashcard(resource);
    setFlashcardFormOpen(true);
  };

  const handleResourcesTabChange = (tab: ResourceTabId) => {
    if (tab === "lectures") {
      setLecturesResetKey((k) => k + 1);
    }
    setResourcesTab(tab);
  };

  // Handler for deleting flashcards via ResourcesDeleteManager
  const handleDeleteFlashcard = useCallback(
    async (kind: ResourceKind, id: string) => {
      if (!chapterId) return;
      await deleteStudyResource.mutateAsync({ id, chapterId });
      toast.success("Flashcard deleted");
    },
    [deleteStudyResource, chapterId],
  );

  // Refetch flashcards
  const refetchFlashcards = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["study-resources", "chapter", chapterId] });
  }, [queryClient, chapterId]);

  // Add Sentry breadcrumb when chapter loads
  useEffect(() => {
    if (chapter?.title) {
      Sentry.addBreadcrumb({
        category: "navigation",
        message: `Opened chapter: ${chapter.title}`,
        level: "info",
      });
    }
  }, [chapter?.title]);

  // Update Coach context when page loads or section changes
  useEffect(() => {
    if (module && chapter) {
      setStudyContext({
        pageType: activeSection === "resources" ? "resource" : activeSection === "practice" ? "practice" : "test",
        moduleId: module.id,
        moduleName: module.name,
        chapterId: chapter.id,
        chapterName: chapter.title,
      });
    }
  }, [module, chapter, activeSection, setStudyContext]);

  // Update presence so admins can see which resource tab users are on
  useEffect(() => {
    if (!module || !chapter) return;
    const activeTab =
      activeSection === "resources"
        ? resourcesTab
        : activeSection === "interactive"
          ? interactiveTab
          : activeSection === "practice"
            ? practiceTab
            : undefined;
    updatePresence({
      year_id: module.year_id,
      module_name: module.name,
      topic_name: chapter.title,
      page: "chapter",
      section_mode: activeSection,
      active_tab: activeTab,
    });
  }, [module, chapter, activeSection, resourcesTab, interactiveTab, practiceTab, updatePresence]);

  // ─── Content highlight + context banner ───
  const highlightId = searchParams.get('highlight');
  const fromSource = searchParams.get('from');
  const [showContextBanner, setShowContextBanner] = useState(!!fromSource);

  // Scroll to highlighted element after content loads
  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-content-id="${highlightId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'animate-pulse');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'animate-pulse');
        }, 3000);
      }
    }, 800); // wait for content to render
    return () => clearTimeout(timer);
  }, [highlightId, activeSection, practiceTab, resourcesTab, interactiveTab]);

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
    { id: "resources" as SectionMode, label: "Resources", mobileLabel: "Resources", icon: FolderOpen },
    { id: "interactive" as SectionMode, label: "Interactive", mobileLabel: "Interactive", icon: Sparkles },
    { id: "practice" as SectionMode, label: "Practice", mobileLabel: "Practice", icon: GraduationCap },
    { id: "test" as SectionMode, label: "Test Yourself", mobileLabel: "Test", icon: ClipboardCheck },
  ];

  // Per-section color map for visual hierarchy
  const sectionColors: Record<
    SectionMode,
    { activeBg: string; activeBgDark: string; border: string; text: string; icon: string; mobileBg: string }
  > = {
    resources: {
      activeBg: "bg-blue-50",
      activeBgDark: "dark:bg-blue-950/30",
      border: "border-l-blue-400",
      text: "text-blue-600 dark:text-blue-300",
      icon: "text-blue-500 dark:text-blue-400",
      mobileBg: "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300",
    },
    interactive: {
      activeBg: "bg-teal-50",
      activeBgDark: "dark:bg-teal-950/30",
      border: "border-l-teal-600",
      text: "text-teal-700 dark:text-teal-300",
      icon: "text-teal-600 dark:text-teal-400",
      mobileBg: "bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300",
    },
    practice: {
      activeBg: "bg-emerald-50",
      activeBgDark: "dark:bg-emerald-950/30",
      border: "border-l-emerald-500",
      text: "text-emerald-700 dark:text-emerald-300",
      icon: "text-emerald-500 dark:text-emerald-400",
      mobileBg: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
    },
    test: {
      activeBg: "bg-violet-50",
      activeBgDark: "dark:bg-violet-950/30",
      border: "border-l-violet-500",
      text: "text-violet-700 dark:text-violet-300",
      icon: "text-violet-500 dark:text-violet-400",
      mobileBg: "bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300",
    },
  };

  // Use unified tab configuration - create all tabs first
  const infographicsCount = studyResources?.filter((r) => r.resource_type === "infographic")?.length || 0;
  const mindMapsTotal = mindMaps.length + publishedAIMaps.length;

  const allResourcesTabs = useMemo(() => {
    const tabs = createResourceTabs({
      lectures: lectures?.length || 0,
      flashcards: flashcards.length,
      mind_maps: mindMapsTotal + infographicsCount,
      guided_explanations:
        (studyResources?.filter((r) => r.resource_type === "guided_explanation")?.length || 0) +
        socraticTutorials.length,
      reference_materials: documentsCount,
      clinical_tools: workedCases.length,
    });
    // Attach subcounts to mind_maps tab for split badge display
    const vmTab = tabs.find(t => t.id === 'mind_maps');
    if (vmTab) {
      vmTab.subcounts = [
        { label: 'Maps', count: mindMapsTotal },
        { label: 'Infographics', count: infographicsCount },
      ];
    }
    return tabs;
  }, [
    lectures?.length,
    flashcards.length,
    mindMapsTotal,
    infographicsCount,
    studyResources,
    documentsCount,
    workedCases.length,
    publishedAIMaps.length,
    socraticTutorials.length,
  ]);

  // Admin sees all tabs; students see filtered based on setting
  const { data: pinSettings } = useModulePinSettings();
  const { data: studentPrefs } = useStudentModulePreferences();

  const resourcesTabs = useMemo(() => {
    if (showAllTabs) return allResourcesTabs;
    const filtered = filterTabsForStudent(allResourcesTabs, hideEmptyTabs ?? false);
    return filterByCustomPrefs(filtered, pinSettings, studentPrefs);
  }, [showAllTabs, allResourcesTabs, hideEmptyTabs, pinSettings, studentPrefs]);

  // Reset resources tab if current tab becomes hidden
  useEffect(() => {
    if (resourcesTabs.length > 0 && !resourcesTabs.find((t) => t.id === resourcesTab)) {
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
    if (showAllTabs) return allInteractiveTabs;
    const filtered = filterTabsForStudent(allInteractiveTabs, hideEmptyTabs ?? false);
    return filterByCustomPrefs(filtered, pinSettings, studentPrefs);
  }, [showAllTabs, allInteractiveTabs, hideEmptyTabs, pinSettings, studentPrefs]);

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
      short_cases: caseScenarioCount,
    });
  }, [mcqCount, sbaCount, trueFalseCount, essayCount, osceCount, matchingCount, caseScenarioCount]);

  // Admin sees all tabs; students see filtered based on setting
  const practiceTabs = useMemo(() => {
    if (showAllTabs) return allPracticeTabs;
    const filtered = filterTabsForStudent(allPracticeTabs, hideEmptyTabs ?? false);
    return filterByCustomPrefs(filtered, pinSettings, studentPrefs);
  }, [showAllTabs, allPracticeTabs, hideEmptyTabs, pinSettings, studentPrefs]);

  // Reset practice tab if current tab becomes hidden
  useEffect(() => {
    if (practiceTabs.length > 0 && !practiceTabs.find((t) => t.id === practiceTab)) {
      setPracticeTab(practiceTabs[0].id as PracticeTabId);
    }
  }, [practiceTabs, practiceTab]);

  return (
    <MainLayout>
      <div className="space-y-3 md:space-y-4 animate-fade-in min-h-[60vh] bg-gradient-to-br from-blue-50/80 via-white to-blue-100/60 dark:from-blue-950/20 dark:via-background dark:to-blue-900/10 -mx-2 md:-mx-4 -mt-4 px-2 md:px-4 pt-3 md:pt-4 rounded-xl">
        {/* Context banner when opened from Inbox, Analytics, or Feedback */}
        {showContextBanner && fromSource && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border bg-primary/5 border-primary/20 text-sm">
            <span className="text-primary font-medium">
              {fromSource === 'inbox' ? 'Opened from Inbox' : fromSource === 'analytics' ? 'Opened from Analytics' : fromSource === 'feedback' ? 'Opened from Feedback' : 'Opened from Admin'}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  if (fromSource === 'inbox') navigate('/admin/inbox');
                  else if (fromSource === 'analytics') navigate('/admin?tab=analytics');
                  else if (fromSource === 'feedback') navigate('/admin/inbox?tab=feedback');
                  else navigate('/admin');
                }}
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                {fromSource === 'inbox' ? 'Back to Inbox' : fromSource === 'analytics' ? 'Back to Analytics' : fromSource === 'feedback' ? 'Back to Feedback' : 'Back'}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowContextBanner(false)}>
                ✕
              </Button>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/module/${moduleId}?section=learning`)}
            className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          </Button>

          {/* Section Filter */}
          {sectionsEnabled && (
            <SectionFilter
              chapterId={chapterId}
              selectedSectionId={selectedSectionId}
              onSectionChange={setSelectedSectionId}
              className="py-0"
            />
          )}

          {/* Content Type Dropdown - shows sub-tabs of active section */}
          {(() => {
            const colors = sectionColors[activeSection];
            // Determine current sub-tabs and active sub-tab based on active section
            const currentTabs =
              activeSection === "resources"
                ? resourcesTabs
                : activeSection === "interactive"
                  ? interactiveTabs
                  : activeSection === "practice"
                    ? practiceTabs
                    : [];
            const currentSubTab =
              activeSection === "resources"
                ? resourcesTab
                : activeSection === "interactive"
                  ? interactiveTab
                  : activeSection === "practice"
                    ? practiceTab
                    : "";
            const activeTabConfig = currentTabs.find((t) => t.id === currentSubTab);
            const ActiveIcon = activeTabConfig?.icon;

            // Helper to get completed/total counts for a tab
            const getTabCounts = (tabId: string, tabCount: number): { completed: number; total: number } => {
              if (!chapterProgress) return { completed: 0, total: tabCount };
              switch (tabId) {
                case "lectures":
                  return { completed: chapterProgress.videosCompleted, total: chapterProgress.videosTotal || tabCount };
                case "mcqs":
                  return { completed: chapterProgress.mcqCompleted, total: chapterProgress.mcqTotal || tabCount };
                case "sba":
                  return { completed: chapterProgress.mcqCompleted, total: chapterProgress.mcqTotal || tabCount };
                case "essays":
                  return { completed: chapterProgress.essayCompleted, total: chapterProgress.essayTotal || tabCount };
                case "osce":
                  return { completed: chapterProgress.osceCompleted, total: chapterProgress.osceTotal || tabCount };
                case "cases":
                  return { completed: chapterProgress.caseCompleted, total: chapterProgress.caseTotal || tabCount };
                case "matching":
                  return {
                    completed: chapterProgress.matchingCompleted,
                    total: chapterProgress.matchingTotal || tabCount,
                  };
                case "true_false":
                  return { completed: chapterProgress.tfCompleted, total: chapterProgress.tfTotal || tabCount };
                case "flashcards":
                  return {
                    completed: chapterProgress.flashcardReviewed,
                    total: chapterProgress.flashcardTotal || tabCount,
                  };
                case "mind_maps":
                  return { completed: chapterProgress.mindMapViewed, total: chapterProgress.mindMapTotal || tabCount };
                case "guided_explanations":
                  return { completed: chapterProgress.guidedViewed, total: chapterProgress.guidedTotal || tabCount };
                case "reference_materials":
                  return { completed: chapterProgress.referenceViewed, total: chapterProgress.referenceTotal || tabCount };
                case "clinical_tools":
                  return { completed: chapterProgress.clinicalToolViewed, total: chapterProgress.clinicalToolTotal || tabCount };
                case "pathways":
                  return {
                    completed: chapterProgress.pathwayViewed,
                    total: chapterProgress.pathwayTotal || tabCount,
                  };
                default:
                  return { completed: 0, total: tabCount };
              }
            };

            // Hide dropdown for test section (no sub-tabs)
            if (activeSection === "test" || currentTabs.length === 0) return null;

            const triggerCounts = getTabCounts(currentSubTab, activeTabConfig?.count || 0);

            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-full",
                      "border-2 shadow-sm text-sm font-medium transition-all duration-200",
                      "hover:shadow-md hover:scale-[1.02]",
                      "focus:outline-none focus:ring-2 focus:ring-offset-2",
                      colors.activeBg,
                      colors.activeBgDark,
                      colors.text,
                      "border-current/30",
                    )}
                  >
                    {activeTabConfig?.useImageIcon ? (
                      <img src={SOCRATES_ICON_PATH} alt="Socrates" className="w-5 h-5 rounded-full object-cover" />
                    ) : ActiveIcon ? (
                      <ActiveIcon className={cn("w-4 h-4", colors.icon)} />
                    ) : null}
                    <span className="hidden sm:inline">{activeTabConfig?.label || "Select"}</span>
                    <span className="sm:hidden">{activeTabConfig?.label || "Select"}</span>
                    {triggerCounts.total > 0 && (
                      <span className="text-[10px] font-semibold opacity-70 tabular-nums">
                        {triggerCounts.completed}/{triggerCounts.total}{currentSubTab === 'guided_explanations' ? ' sets' : ''}
                      </span>
                    )}
                    <ChevronDown className="w-4 h-4 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" sideOffset={8} className="w-56">
                  {currentTabs.map((tab) => {
                    const TabIcon = tab.icon;
                    const isActive = currentSubTab === tab.id;
                    const counts = getTabCounts(tab.id, tab.count);
                    const progress = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;
                    const isRecommended = isStudent && currentChapterState
                      ? getRecommendedPath(currentChapterState).recommendedTabs.includes(tab.id)
                      : false;
                    return (
                      <DropdownMenuItem
                        key={tab.id}
                        onClick={() => {
                          if (activeSection === "resources") handleResourcesTabChange(tab.id as ResourceTabId);
                          else if (activeSection === "interactive") setInteractiveTab(tab.id as InteractiveTabId);
                          else if (activeSection === "practice") setPracticeTab(tab.id as PracticeTabId);
                        }}
                        className={cn(
                          "flex items-center gap-2 py-3 cursor-pointer",
                          isActive && cn(colors.activeBg, colors.activeBgDark),
                          isRecommended && !isActive && "bg-amber-50/50 dark:bg-amber-950/10",
                        )}
                      >
                        {tab.useImageIcon ? (
                          <img src={SOCRATES_ICON_PATH} alt="Socrates" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <TabIcon className={cn("w-4 h-4", isActive ? colors.icon : "")} />
                        )}
                        <span className={cn("flex-1", isActive && cn("font-medium", colors.text))}>
                          {tab.label}
                          {isRecommended && (
                            <span className="ml-1.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                              ★
                            </span>
                          )}
                        </span>
                        {tab.subcounts && tab.subcounts.length > 0 ? (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                            {tab.subcounts.map((sc, i) => (
                              <Badge key={sc.label} variant="outline" className="h-5 px-1.5 text-[10px]" title={sc.label}>
                                {sc.count}
                              </Badge>
                            )).reduce((prev, curr, i) => (
                              <>{prev}<span className="text-muted-foreground/50">/</span>{curr}</>
                            ) as any)}
                          </span>
                        ) : tab.count > 0 ? (
                          <div className="relative h-5 w-14 rounded-full bg-muted overflow-hidden text-[10px]">
                            <div
                              className={cn(
                                "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                                progress > 0 ? "bg-primary/25" : "",
                              )}
                              style={{ width: `${progress}%` }}
                            />
                            <span className="relative z-10 flex items-center justify-center h-full font-semibold text-muted-foreground">
                              {progress}%
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                            0
                          </Badge>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })()}

          {/* Admin avatars for student contact */}
          {isStudent && (
            <ChapterAdminAvatars
              moduleId={moduleId}
              moduleName={module?.name}
              chapterId={chapterId}
              chapterTitle={chapter?.title}
              onContactAdmin={(admin, role) => {
                setSelectedAdmin(admin);
                setSelectedAdminRole(role);
                setInquiryOpen(true);
              }}
            />
          )}
        </div>

        {/* Recommended Study Path — students only */}
        {isStudent && currentChapterState && (
          <RecommendedPathBanner
            chapterStatus={currentChapterState}
            activeSection={activeSection}
            onNavigateSection={(s) => setActiveSection(s as SectionMode)}
          />
        )}

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
            status={chapterProgress?.status}
          />
        )}

        {/* Needs Attention Banner */}
        {chapterProgress?.status === 'needs_attention' && !bannerDismissed && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            <span>Your accuracy here is low — focus on this chapter before moving on.</span>
            <button
              onClick={() => setBannerDismissed(true)}
              className="ml-4 text-red-600 hover:text-red-800 dark:text-red-400"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* Inline Sections Manager - Admin only */}
        {canManageContent && chapterId && <SectionsManager chapterId={chapterId} canManage={canManageContent} />}

        {/* Main Content Layout: Left Nav Rail + Content Area */}
        <div className="flex flex-col md:flex-row">
          {/* Mobile: Section nav is handled by MobileBottomNav overlay — hidden here */}

          {/* Main Content Area */}
          <div className="flex-1 min-w-0 pb-20 md:pb-4" ref={chapterContentRef}>
            {/* Resources Section */}
            {activeSection === "resources" && (
              <div className="space-y-4">
                <ContextGuide
                  title="Start with understanding"
                  description="Study the material first before moving to practice."
                  storageKey="kalm_guide_learning_dismissed"
                />
                {/* Lectures Content */}
                {resourcesTab === "lectures" && (
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
                        lectures={filterBySection(lectures || [], true)}
                        moduleId={moduleId}
                        chapterId={chapterId}
                        canEdit={canManageContent}
                        canDelete={canManageContent}
                        showFeedback={true}
                        onActiveItemChange={setActiveItem}
                      />
                    )}
                  </div>
                )}

                {/* Flashcards Content (as cards) */}
                {resourcesTab === "flashcards" && (
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
                        <Button size="sm" variant="outline" onClick={() => guardAdd(() => setFlashcardBulkOpen(true))}>
                          <Upload className="w-3 h-3 mr-1" />
                          Bulk Upload
                        </Button>
                        <AIFlashcardGenerateButton
                          chapterId={chapterId}
                          moduleId={contentModuleId || moduleId}
                        />
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
                        onActiveItemChange={setActiveItem}
                      />
                    )}
                  </div>
                )}

                {/* Reference Materials Content (formerly Documents) */}
                {resourcesTab === "reference_materials" && chapterId && moduleId && (
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
                {resourcesTab === "mind_maps" && chapterId && (
                  <VisualResourcesSection
                    mindMaps={filterBySection(mindMaps)}
                    infographics={filterBySection(
                      studyResources?.filter((r) => r.resource_type === "infographic") || [],
                    )}
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
                      if (type === "mind_map" || type === "infographic") {
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
                {resourcesTab === "guided_explanations" && chapterId && (
                  <div className="space-y-4">
                    {/* Sub-tabs: Documents / Questions */}
                    <div className="flex gap-2 border-b border-border pb-2">
                      <button
                        onClick={() => setSocratesSubTab("documents")}
                        className={cn(
                          "px-3 py-1.5 text-sm font-medium rounded-t transition-colors",
                          socratesSubTab === "documents"
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <FileText className="w-4 h-4 inline mr-1.5" />
                        Documents
                      </button>
                      <button
                        onClick={() => setSocratesSubTab("questions")}
                        className={cn(
                          "px-3 py-1.5 text-sm font-medium rounded-t transition-colors",
                          socratesSubTab === "questions"
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <HelpCircle className="w-4 h-4 inline mr-1.5" />
                        Questions
                      </button>
                    </div>

                    {/* Documents sub-tab: Socratic Tutorial documents */}
                    {socratesSubTab === "documents" && (
                      <>
                        {showAddControls && chapterId && moduleId && (
                          <div className="mb-4">
                            <AdminContentActions
                              chapterId={chapterId}
                              moduleId={moduleId}
                              contentType="resource"
                              hideAudio
                              documentSubtype="socratic_tutorial"
                            />
                          </div>
                        )}
                        {resourcesLoading ? (
                          <QuestionListSkeleton count={2} type="mcq" />
                        ) : socraticTutorials.length > 0 ? (
                          <div className="space-y-3">
                            {socraticTutorials.map((doc) =>
                              doc.rich_content ? (
                                <RichDocumentViewer
                                  key={doc.id}
                                  title={doc.title}
                                  content={doc.rich_content}
                                  documentType="socratic_tutorial"
                                  resourceId={doc.id}
                                  chapterId={chapterId}
                                />
                              ) : (
                                <SocraticDocumentCard
                                  key={doc.id}
                                  doc={doc}
                                  canManage={canManageContent}
                                  invalidateKey={["chapter-resources", chapterId!]}
                                />
                              ),
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground py-8 text-center">No Socratic documents yet.</p>
                        )}
                      </>
                    )}

                    {/* Questions sub-tab: Guided Explanations (Q&A format) */}
                    {socratesSubTab === "questions" && (
                      <>
                        {canManageContent && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                guardAdd(() => {
                                  setEditingFlashcard(null);
                                  (window as any).__pendingResourceType = "guided_explanation";
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
                                  (window as any).__pendingBulkResourceType = "guided_explanation";
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
                            resources={filterBySection(
                              studyResources?.filter((r) => r.resource_type === "guided_explanation") || [],
                            )}
                            canManage={canManageContent}
                            onEdit={handleEditFlashcard}
                            onDelete={(id) => {
                              const resource = studyResources?.find((r) => r.id === id);
                              requestResourceDelete("guided_explanation", id, resource?.title);
                            }}
                            chapterId={chapterId}
                          />
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Clinical Tools Content */}
                {resourcesTab === "clinical_tools" && chapterId && moduleId && (
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
                    onBulkUpload={(type) =>
                      guardAdd(() => {
                        (window as any).__pendingBulkResourceType = type;
                        setFlashcardBulkOpen(true);
                      })
                    }
                    chapterId={chapterId}
                    moduleId={moduleId}
                  />
                )}
              </div>
            )}

            {/* Interactive Section (Cases + Pathways) */}
            {activeSection === "interactive" && (
              <div className="space-y-4">
                <ContextGuide
                  title="Apply what you learned"
                  description="Work through clinical cases to practice real decision-making."
                  storageKey="kalm_guide_interactive_dismissed"
                />
                {/* Cases Content */}
                {interactiveTab === "cases" && contentModuleId && chapterId && (
                  <div>
                    {canManageContent ? (
                      <ClinicalCaseAdminList moduleId={contentModuleId} chapterId={chapterId} />
                    ) : clinicalCasesLoading ? (
                      <QuestionListSkeleton count={2} type="mcq" />
                    ) : (
                      <ClinicalCaseList moduleId={contentModuleId} chapterId={chapterId} />
                    )}
                  </div>
                )}

                {/* Pathways (Algorithms) Content */}
                {interactiveTab === "pathways" && chapterId && moduleId && (
                  <div className="space-y-4">
                    {canManageContent && (
                      <div className="flex gap-2 mb-4 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingAlgorithm(null);
                            setAlgorithmBuilderOpen(true);
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Build Pathway
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const algs = interactiveAlgorithms || [];
                            if (algs.length === 0) {
                              toast.error("No pathways to download");
                              return;
                            }
                            const headers = ["title", "description", "node_count", "decision_count"];
                            const rows = algs.map((a) => {
                              const nodes = a.algorithm_json?.nodes || [];
                              const vals = [
                                a.title,
                                a.description || "",
                                String(nodes.length),
                                String(nodes.filter((n) => n.type === "decision").length),
                              ];
                              return vals
                                .map((v) =>
                                  v.includes(",") || v.includes('"') || v.includes("\n")
                                    ? `"${v.replace(/"/g, '""')}"`
                                    : v,
                                )
                                .join(",");
                            });
                            const csv = [headers.join(","), ...rows].join("\n");
                            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(blob);
                            link.download = "pathways_export.csv";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(link.href);
                            toast.success(`Downloaded ${algs.length} pathways`);
                          }}
                        >
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
                      chapterId={chapterId}
                      onEdit={(alg) => {
                        setEditingAlgorithm(alg);
                        setAlgorithmBuilderOpen(true);
                      }}
                      onDelete={async (alg) => {
                        try {
                          await deleteAlg.mutateAsync({ id: alg.id, chapterId, topicId: undefined });
                          toast.success("Pathway deleted");
                        } catch (err: any) {
                          toast.error(err.message || "Failed to delete");
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {activeSection === "practice" && (
              <div className="space-y-4">
                <ContextGuide
                  title="Test your understanding"
                  description="Use questions here to identify weak areas before moving forward."
                  storageKey="kalm_guide_practice_dismissed"
                />
                {/* MCQs Content */}
                {practiceTab === "mcqs" && (
                  <div>
                    {mcqsLoading ? (
                      <QuestionListSkeleton count={2} type="mcq" />
                    ) : (
                      <McqList
                        mcqs={filterBySection(mcqs || [])}
                        deletedMcqs={deletedOnlyMcqs}
                        moduleId={moduleId || ""}
                        chapterId={chapterId}
                        isAdmin={canManageContent}
                        showDeletedToggle={canManageContent}
                        showDeleted={showDeletedMcqs}
                        onShowDeletedChange={setShowDeletedMcqs}
                        onActiveItemChange={setActiveItem}
                      />
                    )}
                  </div>
                )}

                {/* SBA Content */}
                {practiceTab === "sba" && (
                  <div>
                    {sbaLoading ? (
                      <QuestionListSkeleton count={2} type="mcq" />
                    ) : (
                      <McqList
                        mcqs={filterBySection(sbaQuestions || [])}
                        deletedMcqs={deletedOnlySbas}
                        moduleId={moduleId || ""}
                        chapterId={chapterId}
                        isAdmin={canManageContent}
                        showDeletedToggle={canManageContent}
                        showDeleted={showDeletedSbas}
                        onShowDeletedChange={setShowDeletedSbas}
                        questionFormat="sba"
                        onActiveItemChange={setActiveItem}
                      />
                    )}
                  </div>
                )}

                {/* True/False Content */}
                {practiceTab === "true_false" && (
                  <div>
                    {trueFalseLoading ? (
                      <QuestionListSkeleton count={2} type="mcq" />
                    ) : (
                      <TrueFalseList
                        questions={filterBySection(trueFalseQuestions || [])}
                        deletedQuestions={deletedOnlyTrueFalse}
                        moduleId={moduleId || ""}
                        chapterId={chapterId}
                        isAdmin={canManageContent}
                        showDeletedToggle={canManageContent}
                        showDeleted={showDeletedTrueFalse}
                        onShowDeletedChange={setShowDeletedTrueFalse}
                        onActiveItemChange={setActiveItem}
                      />
                    )}
                  </div>
                )}

                {/* Short Essays Content */}
                {practiceTab === "essays" && (
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
                        onActiveItemChange={setActiveItem}
                      />
                    )}
                  </div>
                )}

                {/* OSCE Content */}
                {practiceTab === "osce" && (
                  <div>
                    {osceLoading ? (
                      <QuestionListSkeleton count={2} type="osce" />
                    ) : (
                      <OsceList
                        questions={filterBySection(osceQuestions || [])}
                        deletedQuestions={deletedOnlyOsce}
                        moduleId={moduleId || ""}
                        chapterId={chapterId}
                        moduleCode={module?.slug?.toUpperCase() || "MODULE"}
                        chapterTitle={chapter?.title || "CHAPTER"}
                        isAdmin={canManageContent}
                        showDeletedToggle={canManageContent}
                        showDeleted={showDeletedOsce}
                        onShowDeletedChange={setShowDeletedOsce}
                        onActiveItemChange={setActiveItem}
                      />
                    )}
                  </div>
                )}

                {/* Practical Content (placeholder) */}
                {practiceTab === "practical" && (
                  <div className="text-center py-12 border rounded-lg">
                    <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Practical content coming soon.</p>
                  </div>
                )}

                {/* Matching Questions Content */}
                {practiceTab === "matching" && (
                  <div>
                    {matchingLoading ? (
                      <QuestionListSkeleton count={2} type="matching" />
                    ) : (
                      <MatchingQuestionList
                        questions={filterBySection(matchingQuestions || [])}
                        deletedQuestions={deletedOnlyMatching}
                        moduleId={moduleId || ""}
                        chapterId={chapterId}
                        isAdmin={canManageContent}
                        showDeletedToggle={canManageContent}
                        showDeleted={showDeletedMatching}
                        onShowDeletedChange={setShowDeletedMatching}
                        onActiveItemChange={setActiveItem}
                      />
                    )}
                  </div>
                )}

                {/* Short Cases Content */}
                {practiceTab === "short_cases" && (
                  <div>
                    {caseScenariosLoading ? (
                      <QuestionListSkeleton count={2} type="mcq" />
                    ) : (
                      <CaseScenarioList
                        scenarios={caseScenarios || []}
                        isAdmin={canManageContent}
                      />
                    )}
                  </div>
                )}

                {/* Image Questions Content (placeholder) */}
                {practiceTab === "images" && (
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
            {activeSection === "test" && moduleId && chapterId && (
              <ChapterMockExamSection moduleId={moduleId} chapterId={chapterId} />
            )}
          </div>

          {/* Q&A Section - visible on all sections */}
          {chapterId && contentModuleId && (
            <ChapterQASection chapterId={chapterId} moduleId={contentModuleId} canManage={canManageContent} />
          )}
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
              resourceType={(window as any).__pendingResourceType || editingFlashcard?.resource_type || "flashcard"}
              resource={editingFlashcard}
            />
            <StudyBulkUploadModal
              open={flashcardBulkOpen}
              onOpenChange={setFlashcardBulkOpen}
              chapterId={chapterId}
              moduleId={moduleId}
              resourceType={(window as any).__pendingBulkResourceType || "flashcard"}
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
                onClose={() => {
                  setAlgorithmBuilderOpen(false);
                  setEditingAlgorithm(null);
                }}
                onSave={async (title, description, json) => {
                  try {
                    if (editingAlgorithm) {
                      await updateAlg.mutateAsync({
                        id: editingAlgorithm.id,
                        title,
                        description,
                        algorithm_json: json as any,
                      });
                      toast.success("Algorithm updated");
                    } else {
                      await createAlg.mutateAsync({
                        title,
                        description,
                        algorithm_json: json,
                        module_id: moduleId!,
                        chapter_id: chapterId || null,
                        topic_id: null,
                      });
                      toast.success("Algorithm created");
                    }
                    setAlgorithmBuilderOpen(false);
                    setEditingAlgorithm(null);
                  } catch (err: any) {
                    toast.error(err.message || "Failed to save algorithm");
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
                if (!moduleId) {
                  toast.error("Module ID missing");
                  return;
                }
                try {
                  for (const alg of algorithms) {
                    await createAlg.mutateAsync({
                      title: alg.title,
                      algorithm_json: alg.json,
                      module_id: moduleId,
                      chapter_id: chapterId || null,
                      topic_id: null,
                    });
                  }
                  toast.success(`${algorithms.length} algorithm(s) imported`);
                  setAlgorithmBulkOpen(false);
                } catch (err: any) {
                  toast.error(err.message || "Import failed");
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
                  title,
                  description,
                  algorithm_json: json,
                  module_id: moduleId!,
                  chapter_id: chapterId || null,
                  topic_id: null,
                  reveal_mode: (extras?.reveal_mode as any) || "node_by_node",
                  include_consequences: extras?.include_consequences ?? true,
                  initial_state_json: (extras?.initial_state_json as any) || null,
                });
              }}
            />
          </>
        )}

        {/* Flashcard Delete Manager - page level for top-level flashcards tab */}
        {canManageContent && chapterId && (
          <ResourcesDeleteManager deleteResource={handleDeleteFlashcard} refetchResources={refetchFlashcards} />
        )}
      </div>

      {/* Inquiry Modal for admin contact */}
      <InquiryModal
        isOpen={inquiryOpen}
        onClose={() => { setInquiryOpen(false); setSelectedAdmin(null); }}
        moduleId={moduleId}
        moduleName={module?.name}
        chapterId={chapterId}
        targetAdminId={selectedAdmin?.id}
        targetAdminName={selectedAdmin?.full_name || undefined}
        targetRole={selectedAdminRole}
      />
    </MainLayout>
  );
}

// Dead code removed: ChapterLeadRow and ModuleLeadInChapter replaced by ChapterAdminAvatars
