import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useTopic } from '@/hooks/useTopics';
import { useModule } from '@/hooks/useModules';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAddPermissionGuard } from '@/hooks/useAddPermissionGuard';
import { AdminContentActions } from '@/components/admin/AdminContentActions';
import { LectureList } from '@/components/content/LectureList';
import EssayList from '@/components/content/EssayList';
import PracticalList from '@/components/content/PracticalList';
import { MatchingQuestionList } from '@/components/content/MatchingQuestionList';
import { FlashcardsTab } from '@/components/study/FlashcardsTab';
import { StudyResourceFormModal } from '@/components/study/StudyResourceFormModal';
import { StudyBulkUploadModal } from '@/components/study/StudyBulkUploadModal';
import { useLectures, useResources, useMcqSets, useEssays, usePracticals, useClinicalCases } from '@/hooks/useContent';
import { useHideEmptySelfAssessmentTabs, useChapterStudyResourcesByType, StudyResource } from '@/hooks/useStudyResources';
import { useTopicMatchingQuestions } from '@/hooks/useMatchingQuestions';
import { useTopicSectionsEnabled } from '@/hooks/useSections';
import { SectionFilter } from '@/components/sections';
import { TopicSettingsSheet } from '@/components/module/TopicSettingsSheet';
import { 
  createResourceTabs, 
  createPracticeTabs, 
  filterTabsForStudent,
  ResourceTabId,
  PracticeTabId,
} from '@/config/tabConfig';
import { 
  ArrowLeft, 
  Video, 
  FileText, 
  HelpCircle, 
  PenTool, 
  FlaskConical,
  Stethoscope,
  FolderOpen,
  GraduationCap,
  ClipboardList,
  ExternalLink,
  Plus,
  Upload,
  Image,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SectionMode = 'resources' | 'practice';

export default function TopicDetailPage() {
  const { moduleId, topicId } = useParams();
  const navigate = useNavigate();
  const auth = useAuthContext();
  const { guard: guardAdd, dialog: permissionDialog } = useAddPermissionGuard({ moduleId, topicId });

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

  const [activeSection, setActiveSection] = useState<SectionMode>('resources');
  const [resourcesTab, setResourcesTab] = useState<ResourceTabId>('lectures');
  const [practiceTab, setPracticeTab] = useState<PracticeTabId>('mcqs');
  const [lecturesResetKey, setLecturesResetKey] = useState(0);
  
  // Section filter state (only for Resources and Practice, NOT for Test)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Flashcard modals
  const [flashcardFormOpen, setFlashcardFormOpen] = useState(false);
  const [flashcardBulkOpen, setFlashcardBulkOpen] = useState(false);
  const [editingFlashcard, setEditingFlashcard] = useState<StudyResource | null>(null);

  const { data: topic, isLoading: topicLoading } = useTopic(topicId);
  const { data: module, isLoading: moduleLoading } = useModule(moduleId || '');
  const { data: lectures, isLoading: lecturesLoading } = useLectures(topicId);
  const { data: resources, isLoading: resourcesLoading } = useResources(topicId);
  const { data: mcqSets, isLoading: mcqsLoading } = useMcqSets(topicId);
  const { data: essays, isLoading: essaysLoading } = useEssays(topicId);
  const { data: practicals, isLoading: practicalsLoading } = usePracticals(topicId);
  const { data: clinicalCases, isLoading: casesLoading } = useClinicalCases(topicId);
  const { data: matchingQuestions, isLoading: matchingLoading } = useTopicMatchingQuestions(topicId);
  const { data: flashcards, isLoading: flashcardsLoading } = useChapterStudyResourcesByType(undefined, 'flashcard');
  const { data: hideEmptyTabs } = useHideEmptySelfAssessmentTabs();
  const { data: sectionsEnabled } = useTopicSectionsEnabled(topicId);
  
  // Reset section filter when leaving topic
  useEffect(() => {
    return () => setSelectedSectionId(null);
  }, [topicId]);
  
  // Helper function to filter content by section (works with any array that may have section_id)
  const filterBySection = <T,>(items: T[]): T[] => {
    if (!selectedSectionId || !sectionsEnabled) return items;
    return items.filter(item => {
      const sectionableItem = item as unknown as { section_id?: string | null };
      return sectionableItem.section_id === selectedSectionId;
    });
  };

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

  const sectionNav = [
    { id: 'resources' as SectionMode, label: 'Resources', mobileLabel: 'Resources', icon: FolderOpen },
    { id: 'practice' as SectionMode, label: 'Self Assessment', mobileLabel: 'Self Assess', icon: GraduationCap },
  ];

  // Use unified tab configuration
  const resourcesTabs = createResourceTabs({
    lectures: lectures?.length || 0,
    flashcards: flashcards?.length || 0,
    reference_materials: resources?.length || 0,
  });

  const allPracticeTabs = createPracticeTabs({
    mcqs: mcqSets?.length || 0,
    essays: essays?.length || 0,
    clinical_cases: clinicalCases?.length || 0,
    osce: 0,
    practical: practicals?.length || 0,
    matching: matchingQuestions?.length || 0,
    images: 0,
  });

  // Admin sees all tabs; students see filtered based on setting
  const practiceTabs = useMemo(() => {
    if (canManageContent) return allPracticeTabs;
    return filterTabsForStudent(allPracticeTabs, hideEmptyTabs ?? false);
  }, [canManageContent, mcqSets, essays, clinicalCases, practicals, matchingQuestions, hideEmptyTabs]);

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
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-8 w-96" />
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {module?.name} • {topic?.description || 'Pharmacology'}
                </p>
                <h1 className="text-2xl font-heading font-semibold">
                  {topic?.name}
                </h1>
              </>
            )}
          </div>
          {/* Settings button for admins */}
          {canManageContent && topicId && topic && (
            <TopicSettingsSheet
              topicId={topicId}
              topicName={topic.name}
              canManage={canManageContent}
            />
          )}
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-col md:flex-row">
          {/* Mobile: Horizontal Navigation */}
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

          {/* Desktop: Vertical Nav Rail */}
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

          {/* Divider */}
          <div className="hidden md:block w-px bg-border/50 mx-4 self-stretch min-h-[200px]" />

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

                {/* Videos/Lectures */}
                {resourcesTab === 'lectures' && (
                  <div>
                    {showAddControls && topicId && moduleId && (
                      <div className="mb-4">
                        <AdminContentActions topicId={topicId} moduleId={moduleId} contentType="lecture" />
                      </div>
                    )}
                    {lecturesLoading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
                      </div>
                    ) : lectures && lectures.length > 0 ? (
                      <LectureList 
                        key={lecturesResetKey}
                        lectures={filterBySection(lectures) || []} 
                        moduleId={moduleId}
                        canEdit={canManageContent}
                        canDelete={canManageContent}
                        showFeedback={true}
                      />
                    ) : (
                      <div className="text-center py-12 border rounded-lg">
                        <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No videos available yet.</p>
                      </div>
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
                      </div>
                    )}
                    {flashcardsLoading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
                      </div>
                    ) : (
                      <FlashcardsTab
                        resources={filterBySection(flashcards || [])}
                        canManage={canManageContent}
                        onEdit={handleEditFlashcard}
                        chapterId={topicId}
                      />
                    )}
                  </div>
                )}

                {/* Reference Materials (formerly Documents) */}
                {resourcesTab === 'reference_materials' && (
                  <div>
                    {showAddControls && topicId && moduleId && (
                      <div className="mb-4">
                        <AdminContentActions topicId={topicId} moduleId={moduleId} contentType="resource" />
                      </div>
                    )}
                    {resourcesLoading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}
                      </div>
                    ) : resources && resources.length > 0 ? (
                      <div className="space-y-1">
                        {resources.map((resource) => (
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
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 border rounded-lg">
                        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No documents available yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Self Assessment Section */}
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

                {/* MCQs */}
                {practiceTab === 'mcqs' && (
                  <div>
                    {canManageContent && topicId && moduleId && (
                      <div className="mb-4">
                        <AdminContentActions topicId={topicId} moduleId={moduleId} contentType="mcq" />
                      </div>
                    )}
                    {mcqsLoading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
                      </div>
                    ) : mcqSets && mcqSets.length > 0 ? (
                      <div className="space-y-2">
                        {mcqSets.map((mcq) => (
                          <Card key={mcq.id} className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardContent className="flex items-center gap-4 p-4">
                              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <ClipboardList className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium">{mcq.title}</h4>
                                {mcq.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-1">{mcq.description}</p>
                                )}
                              </div>
                              {mcq.time_limit_minutes && (
                                <Badge variant="outline">{mcq.time_limit_minutes} min</Badge>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 border rounded-lg">
                        <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No MCQs available yet.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Essays / Short Answer */}
                {practiceTab === 'essays' && (
                  <div>
                    {canManageContent && topicId && moduleId && (
                      <div className="mb-4">
                        <AdminContentActions topicId={topicId} moduleId={moduleId} contentType="essay" />
                      </div>
                    )}
                    {essaysLoading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
                      </div>
                    ) : (
                      <EssayList
                        essays={essays || []}
                        moduleId={moduleId}
                        canEdit={canManageContent}
                        canDelete={canManageContent}
                        showFeedback={true}
                      />
                    )}
                  </div>
                )}

                {/* Clinical Cases - Topics use clinical_cases table */}
                {practiceTab === 'clinical_cases' && (
                  <div>
                    {casesLoading ? (
                      <div className="space-y-3">
                        {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                      </div>
                    ) : clinicalCases && clinicalCases.length > 0 ? (
                      <div className="space-y-2">
                        {clinicalCases.map((c) => (
                          <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardContent className="flex items-center gap-4 p-4">
                              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Stethoscope className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium">{c.title}</h4>
                                <p className="text-sm text-muted-foreground line-clamp-1">{c.presentation}</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 border rounded-lg">
                        <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No case scenarios available yet.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* OSCE - Note: OSCE is available at Chapter level */}
                {practiceTab === 'osce' && (
                  <div className="text-center py-12 border rounded-lg">
                    <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">OSCE questions are available at the Chapter level.</p>
                    <p className="text-sm text-muted-foreground mt-2">Navigate to a chapter to access OSCE content.</p>
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
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                      </div>
                    ) : (
                      <MatchingQuestionList
                        questions={matchingQuestions || []}
                        moduleId={moduleId || ''}
                        topicId={topicId}
                        isAdmin={canManageContent}
                      />
                    )}
                  </div>
                )}

                {/* Image Questions (placeholder) */}
                {practiceTab === 'images' && (
                  <div className="text-center py-12 border rounded-lg">
                    <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Image questions coming soon.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Flashcard Modals */}
        {topicId && moduleId && (
          <>
            <StudyResourceFormModal
              open={flashcardFormOpen}
              onOpenChange={setFlashcardFormOpen}
              chapterId={topicId}
              moduleId={moduleId}
              resourceType="flashcard"
              resource={editingFlashcard}
            />
            <StudyBulkUploadModal
              open={flashcardBulkOpen}
              onOpenChange={setFlashcardBulkOpen}
              chapterId={topicId}
              moduleId={moduleId}
              resourceType="flashcard"
            />
          </>
        )}
      </div>
    </MainLayout>
  );
}
