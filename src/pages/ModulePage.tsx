import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useModule } from '@/hooks/useModules';
import { 
  useModuleLectures, 
  useModuleResources, 
  useModuleMcqSets, 
  useModuleEssays, 
  useModulePracticals
} from '@/hooks/useModuleContent';
import { 
  ArrowLeft, 
  Video, 
  FileText, 
  HelpCircle, 
  PenTool, 
  FlaskConical,
  Clock,
  ExternalLink
} from 'lucide-react';

export default function ModulePage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();

  const { data: module, isLoading: moduleLoading } = useModule(moduleId || '');
  const { data: lectures, isLoading: lecturesLoading } = useModuleLectures(moduleId);
  const { data: resources, isLoading: resourcesLoading } = useModuleResources(moduleId);
  const { data: mcqSets, isLoading: mcqsLoading } = useModuleMcqSets(moduleId);
  const { data: essays, isLoading: essaysLoading } = useModuleEssays(moduleId);
  const { data: practicals, isLoading: practicalsLoading } = useModulePracticals(moduleId);

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
                <h1 className="text-3xl font-heading font-bold">{module?.name}</h1>
                {module?.description && (
                  <p className="text-muted-foreground">{module.description}</p>
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

          {/* Videos Tab (Lectures) */}
          <TabsContent value="videos" className="mt-6">
            {lecturesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : lectures && lectures.length > 0 ? (
              <div className="space-y-3">
                {lectures.map((lecture) => (
                  <Card key={lecture.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                        <Video className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{lecture.title}</h3>
                        {lecture.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{lecture.description}</p>
                        )}
                        {lecture.duration && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Clock className="w-3 h-3" />
                            <span>{lecture.duration}</span>
                          </div>
                        )}
                      </div>
                      {lecture.video_url && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={lecture.video_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Watch
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              renderEmptyState(<Video className="w-6 h-6 text-muted-foreground" />, "No videos available yet.")
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
            ) : mcqSets && mcqSets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mcqSets.map((mcqSet) => (
                  <Card key={mcqSet.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{mcqSet.title}</CardTitle>
                      {mcqSet.description && (
                        <CardDescription>{mcqSet.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {mcqSet.time_limit_minutes && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{mcqSet.time_limit_minutes} min</span>
                          </div>
                        )}
                      </div>
                      <Button className="w-full mt-3" size="sm">
                        Start Quiz
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              renderEmptyState(<HelpCircle className="w-6 h-6 text-muted-foreground" />, "No MCQs available yet.")
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
