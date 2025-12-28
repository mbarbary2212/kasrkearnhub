import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useTopic } from '@/hooks/useTopics';
import { useModule } from '@/hooks/useModules';
import { useAuthContext } from '@/contexts/AuthContext';
import { AdminContentActions } from '@/components/admin/AdminContentActions';
import { LectureList } from '@/components/content/LectureList';
import { ResourcesTabContent } from '@/components/content/ResourcesTabContent';
import EssayList from '@/components/content/EssayList';
import { MatchingQuestionList } from '@/components/content/MatchingQuestionList';
import { useLectures, useResources, useMcqSets, useEssays } from '@/hooks/useContent';
import { useTopicMatchingQuestions } from '@/hooks/useMatchingQuestions';
import { 
  ArrowLeft, 
  Video, 
  FileText, 
  HelpCircle, 
  PenTool, 
  FolderOpen,
  GraduationCap,
  ClipboardList,
  ExternalLink,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SectionMode = 'resources' | 'practice';
type ResourcesTab = 'lectures' | 'documents';
type PracticeTab = 'mcqs' | 'essays' | 'matching';

export default function TopicDetailPage() {
  const { moduleId, topicId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isTeacher, isSuperAdmin } = useAuthContext();

  const canManageContent = isAdmin || isTeacher || isSuperAdmin;

  const [activeSection, setActiveSection] = useState<SectionMode>('resources');
  const [resourcesTab, setResourcesTab] = useState<ResourcesTab>('lectures');
  const [practiceTab, setPracticeTab] = useState<PracticeTab>('mcqs');
  const [lecturesResetKey, setLecturesResetKey] = useState(0);

  const { data: topic, isLoading: topicLoading } = useTopic(topicId);
  const { data: module, isLoading: moduleLoading } = useModule(moduleId || '');
  const { data: lectures, isLoading: lecturesLoading } = useLectures(topicId);
  const { data: resources, isLoading: resourcesLoading } = useResources(topicId);
  const { data: mcqSets, isLoading: mcqsLoading } = useMcqSets(topicId);
  const { data: essays, isLoading: essaysLoading } = useEssays(topicId);
  const { data: matchingQuestions, isLoading: matchingLoading } = useTopicMatchingQuestions(topicId);

  const handleResourcesTabChange = (tab: ResourcesTab) => {
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

  const resourcesTabs = [
    { id: 'lectures' as ResourcesTab, label: 'Videos', icon: Video, count: lectures?.length || 0 },
    { id: 'documents' as ResourcesTab, label: 'Documents', icon: FileText, count: resources?.length || 0 },
  ];

  // Practice tabs - hide empty tabs for students, show all for admins
  const allPracticeTabs = [
    { id: 'mcqs' as PracticeTab, label: 'MCQs', icon: HelpCircle, count: mcqSets?.length || 0 },
    { id: 'essays' as PracticeTab, label: 'Essays', icon: PenTool, count: essays?.length || 0 },
    { id: 'matching' as PracticeTab, label: 'Matching', icon: Link2, count: matchingQuestions?.length || 0 },
  ];

  const practiceTabs = useMemo(() => {
    if (canManageContent) return allPracticeTabs;
    return allPracticeTabs.filter(tab => tab.count > 0);
  }, [canManageContent, mcqSets, essays, matchingQuestions]);

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

                {/* Videos/Lectures */}
                {resourcesTab === 'lectures' && (
                  <div>
                    {canManageContent && topicId && moduleId && (
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
                        lectures={lectures} 
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

                {/* Documents */}
                {resourcesTab === 'documents' && (
                  <div>
                    {canManageContent && topicId && moduleId && (
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

                {/* Essays */}
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
                    ) : essays && essays.length > 0 ? (
                      <div className="space-y-2">
                        {essays.map((essay) => (
                          <Card key={essay.id} className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardContent className="flex items-center gap-4 p-4">
                              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <PenTool className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium">{essay.title}</h4>
                                <p className="text-sm text-muted-foreground line-clamp-1">{essay.question}</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 border rounded-lg">
                        <PenTool className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No essays available yet.</p>
                      </div>
                    )}
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
                        isAdmin={canManageContent}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
