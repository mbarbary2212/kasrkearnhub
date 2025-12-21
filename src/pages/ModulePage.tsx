import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useModule } from '@/hooks/useModules';
import { useModuleChapters } from '@/hooks/useChapters';
import { useAuthContext } from '@/contexts/AuthContext';
import { LectureList } from '@/components/content/LectureList';
import { McqList } from '@/components/content/McqList';
import { SortDropdown } from '@/components/ui/sort-dropdown';
import { useChapterSort } from '@/hooks/useChapterSort';
import { 
  useModuleLectures, 
  useModuleResources, 
  useModuleEssays, 
  useModulePracticals
} from '@/hooks/useModuleContent';
import { useModuleMcqs } from '@/hooks/useMcqs';
import { 
  ArrowLeft, 
  Video, 
  FileText, 
  HelpCircle, 
  PenTool, 
  FlaskConical,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  BookOpen
} from 'lucide-react';

export default function ModulePage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isTeacher } = useAuthContext();

  const canManageContent = isAdmin || isTeacher;

  const { data: module, isLoading: moduleLoading } = useModule(moduleId || '');
  const actualModuleId = module?.id;
  const { data: chapters, isLoading: chaptersLoading } = useModuleChapters(actualModuleId);
  const { data: lectures, isLoading: lecturesLoading } = useModuleLectures(actualModuleId);
  const { data: resources, isLoading: resourcesLoading } = useModuleResources(actualModuleId);
  const { data: mcqs, isLoading: mcqsLoading } = useModuleMcqs(actualModuleId);
  const { data: essays, isLoading: essaysLoading } = useModuleEssays(actualModuleId);
  const { data: practicals, isLoading: practicalsLoading } = useModulePracticals(actualModuleId);

  const hasChapters = chapters && chapters.length > 0;
  
  // Chapter sorting with localStorage persistence
  const { sortMode, setSortMode, sortedItems: sortedChapters } = useChapterSort(
    chapters,
    `kasrlearn_sort_${actualModuleId}`,
    'default'
  );

  if (!moduleLoading && !module) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Module not found.</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go Home
          </Button>
        </div>
      </MainLayout>
    );
  }

  const renderEmptyState = (icon: React.ReactNode, message: string) => (
    <div className="text-center py-12">
      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

  // Group sorted chapters by book_label
  const groupedChapters = hasChapters ? sortedChapters.reduce((acc, chapter) => {
    const label = chapter.book_label || 'Chapters';
    if (!acc[label]) acc[label] = [];
    acc[label].push(chapter);
    return acc;
  }, {} as Record<string, typeof sortedChapters>) : {};

  const bookLabels = Object.keys(groupedChapters);
  const hasBookGroups = bookLabels.length > 1 || (bookLabels.length === 1 && bookLabels[0] !== 'Chapters');

  const bookDescriptions: Record<string, string> = {
    'Book 2': 'Gastrointestinal & Abdominal Surgery',
    'Book 3': 'Surgical Specialties',
  };

  // Render chapters list if module has chapters
  if (hasChapters) {
    return (
      <MainLayout>
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              {moduleLoading ? (
                <>
                  <Skeleton className="h-9 w-64 mb-2" />
                  <Skeleton className="h-5 w-96" />
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-heading font-semibold">{module?.name}</h1>
                  {module?.description && (
                    <p className="text-muted-foreground text-sm">{module.description}</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Chapters Section */}
          <div className="space-y-6">
            {/* Sort control */}
            {hasChapters && !chaptersLoading && (
              <div className="flex justify-end">
                <SortDropdown sortMode={sortMode} onSortChange={setSortMode} />
              </div>
            )}
            
            {chaptersLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : hasBookGroups ? (
              // Grouped by book labels with collapsible sections
              Object.entries(groupedChapters).map(([bookLabel, bookChapters]) => (
                <Collapsible key={bookLabel} defaultOpen={true} className="group">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors mb-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        <div className="text-left">
                          <h2 className="text-lg font-semibold text-primary">{bookLabel}</h2>
                          {bookDescriptions[bookLabel] && (
                            <p className="text-sm text-muted-foreground">{bookDescriptions[bookLabel]}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-full">
                          {bookChapters.length} chapters
                        </span>
                        <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <div className="border rounded-lg divide-y mb-4">
                      {bookChapters.map((chapter) => (
                        <button
                          key={chapter.id}
                          onClick={() => navigate(`/module/${actualModuleId}/chapter/${chapter.id}`)}
                          className="w-full flex items-center gap-3 py-3 px-4 hover:bg-muted/50 transition-colors text-left"
                        >
                          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded min-w-[3rem] text-center">
                            Ch {chapter.chapter_number}
                          </span>
                          <span className="flex-1 text-[15px] font-medium truncate">
                            {chapter.title}
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))
            ) : (
              // Simple chapter list without book grouping
              <div>
                <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-muted-foreground" />
                  Chapters
                </h2>
                <div className="border rounded-lg divide-y">
                  {sortedChapters.map((chapter) => (
                    <button
                      key={chapter.id}
                      onClick={() => navigate(`/module/${actualModuleId}/chapter/${chapter.id}`)}
                      className="w-full flex items-center gap-3 py-3 px-4 hover:bg-muted/50 transition-colors text-left"
                    >
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded min-w-[3rem] text-center">
                        Ch {chapter.chapter_number}
                      </span>
                      <span className="flex-1 text-[15px] font-medium truncate">
                        {chapter.title}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </MainLayout>
    );
  }

  // Default view without chapters (original tabs)
  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            {moduleLoading ? (
              <>
                <Skeleton className="h-9 w-64 mb-2" />
                <Skeleton className="h-5 w-96" />
              </>
            ) : (
              <>
                <h1 className="text-2xl font-heading font-semibold">{module?.name}</h1>
                {module?.description && (
                  <p className="text-muted-foreground text-sm">{module.description}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Content Tabs - 5 tabs as requested */}
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
              <span className="text-xs">Short Questions</span>
            </TabsTrigger>
          </TabsList>

          {/* Lectures Tab */}
          <TabsContent value="videos" className="mt-6">
            {lecturesLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : (
              <LectureList lectures={lectures || []} />
            )}
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="mt-6">
            {resourcesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : resources && resources.length > 0 ? (
              <div className="space-y-3">
                {resources.map((resource) => (
                  <Card key={resource.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-secondary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{resource.title}</h3>
                        {resource.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{resource.description}</p>
                        )}
                        <span className="text-xs text-muted-foreground capitalize">{resource.resource_type}</span>
                      </div>
                      {(resource.file_url || resource.external_url) && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={resource.file_url || resource.external_url || '#'} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Open
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              renderEmptyState(<FileText className="w-6 h-6 text-muted-foreground" />, "No resources available yet.")
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
                moduleId={actualModuleId || ''}
                isAdmin={canManageContent}
              />
            )}
          </TabsContent>

          {/* Practical Tab */}
          <TabsContent value="practical" className="mt-6">
            {practicalsLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : practicals && practicals.length > 0 ? (
              <div className="space-y-3">
                {practicals.map((practical) => (
                  <Card key={practical.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
                          <FlaskConical className="w-6 h-6 text-accent-foreground" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{practical.title}</h3>
                          {practical.description && (
                            <p className="text-sm text-muted-foreground mt-1">{practical.description}</p>
                          )}
                          {practical.objectives && (practical.objectives as string[]).length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-muted-foreground">Objectives:</p>
                              <ul className="text-sm text-muted-foreground list-disc list-inside">
                                {(practical.objectives as string[]).slice(0, 2).map((obj, i) => (
                                  <li key={i} className="truncate">{obj}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              renderEmptyState(<FlaskConical className="w-6 h-6 text-muted-foreground" />, "No practicals available yet.")
            )}
          </TabsContent>

          {/* Short Questions (SAQs/Essays) Tab */}
          <TabsContent value="saqs" className="mt-6">
            {essaysLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : essays && essays.length > 0 ? (
              <div className="space-y-3">
                {essays.map((essay) => (
                  <Card key={essay.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-2">{essay.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{essay.question}</p>
                      {essay.keywords && essay.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(essay.keywords as string[]).slice(0, 3).map((keyword, i) => (
                            <span key={i} className="text-xs bg-secondary px-2 py-1 rounded-full">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              renderEmptyState(<PenTool className="w-6 h-6 text-muted-foreground" />, "No short questions available yet.")
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
