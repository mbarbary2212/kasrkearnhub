import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useTopic } from '@/hooks/useTopics';
import { useLectures, useResources, useMcqSets, useEssays, usePracticals, useClinicalCases } from '@/hooks/useContent';
import { ArrowLeft, PlayCircle, FileText, ClipboardList, PenTool, Beaker, Stethoscope, BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import VideoList from '@/components/content/VideoList';

export default function TopicPage() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  
  const { data: topicData, isLoading: topicLoading } = useTopic(topicId);
  const { data: lectures } = useLectures(topicId);
  const { data: resources } = useResources(topicId);
  const { data: mcqSets } = useMcqSets(topicId);
  const { data: essays } = useEssays(topicId);
  const { data: practicals } = usePracticals(topicId);
  const { data: clinicalCases } = useClinicalCases(topicId);

  if (!topicLoading && !topicData) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Topic not found.</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go Home
          </Button>
        </div>
      </MainLayout>
    );
  }

  const renderEmptyState = (icon: React.ReactNode, message: string) => (
    <div className="text-center py-12">
      {icon}
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
          <div>
            {topicLoading ? (
              <>
                <Skeleton className="h-9 w-48 mb-2" />
                <Skeleton className="h-5 w-72" />
              </>
            ) : (
              <>
                <h1 className="text-3xl font-heading font-bold">{topicData?.name}</h1>
                <p className="text-muted-foreground">{topicData?.description}</p>
              </>
            )}
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="lectures" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="lectures" className="flex items-center gap-1 text-xs md:text-sm">
              <PlayCircle className="w-4 h-4" />
              <span className="hidden md:inline">Lectures</span>
              <span className="md:hidden">({lectures?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-1 text-xs md:text-sm">
              <FileText className="w-4 h-4" />
              <span className="hidden md:inline">Resources</span>
              <span className="md:hidden">({resources?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="mcqs" className="flex items-center gap-1 text-xs md:text-sm">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden md:inline">MCQs</span>
              <span className="md:hidden">({mcqSets?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="essays" className="flex items-center gap-1 text-xs md:text-sm">
              <PenTool className="w-4 h-4" />
              <span className="hidden md:inline">Essays</span>
              <span className="md:hidden">({essays?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="practicals" className="flex items-center gap-1 text-xs md:text-sm">
              <Beaker className="w-4 h-4" />
              <span className="hidden md:inline">Practical</span>
              <span className="md:hidden">({practicals?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="cases" className="flex items-center gap-1 text-xs md:text-sm">
              <Stethoscope className="w-4 h-4" />
              <span className="hidden md:inline">Cases</span>
              <span className="md:hidden">({clinicalCases?.length || 0})</span>
            </TabsTrigger>
          </TabsList>

          {/* Lectures Tab */}
          <TabsContent value="lectures">
            <VideoList videos={lectures || []} />
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources">
            {resources && resources.length > 0 ? (
              <div className="grid gap-4">
                {resources.map((resource) => (
                  <Card key={resource.id}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-primary" />
                        <div>
                          <CardTitle className="text-lg">{resource.title}</CardTitle>
                          <CardDescription>{resource.resource_type.toUpperCase()}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    {resource.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{resource.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              renderEmptyState(
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />,
                "No resources available yet."
              )
            )}
          </TabsContent>

          {/* MCQs Tab */}
          <TabsContent value="mcqs">
            {mcqSets && mcqSets.length > 0 ? (
              <div className="grid gap-4">
                {mcqSets.map((mcq) => (
                  <Card key={mcq.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <ClipboardList className="w-8 h-8 text-primary" />
                        <div>
                          <CardTitle className="text-lg">{mcq.title}</CardTitle>
                          {mcq.time_limit_minutes && (
                            <CardDescription>{mcq.time_limit_minutes} minutes</CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {mcq.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{mcq.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              renderEmptyState(
                <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />,
                "No MCQs available yet."
              )
            )}
          </TabsContent>

          {/* Essays Tab */}
          <TabsContent value="essays">
            {essays && essays.length > 0 ? (
              <div className="grid gap-4">
                {essays.map((essay) => (
                  <Card key={essay.id}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <PenTool className="w-8 h-8 text-primary" />
                        <CardTitle className="text-lg">{essay.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{essay.question}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              renderEmptyState(
                <PenTool className="w-12 h-12 text-muted-foreground mx-auto mb-4" />,
                "No essays available yet."
              )
            )}
          </TabsContent>

          {/* Practicals Tab */}
          <TabsContent value="practicals">
            {practicals && practicals.length > 0 ? (
              <div className="grid gap-4">
                {practicals.map((practical) => (
                  <Card key={practical.id}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Beaker className="w-8 h-8 text-primary" />
                        <CardTitle className="text-lg">{practical.title}</CardTitle>
                      </div>
                    </CardHeader>
                    {practical.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{practical.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              renderEmptyState(
                <Beaker className="w-12 h-12 text-muted-foreground mx-auto mb-4" />,
                "No practicals available yet."
              )
            )}
          </TabsContent>

          {/* Clinical Cases Tab */}
          <TabsContent value="cases">
            {clinicalCases && clinicalCases.length > 0 ? (
              <div className="grid gap-4">
                {clinicalCases.map((caseItem) => (
                  <Card key={caseItem.id}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Stethoscope className="w-8 h-8 text-primary" />
                        <CardTitle className="text-lg">{caseItem.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{caseItem.presentation}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              renderEmptyState(
                <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-4" />,
                "No clinical cases available yet."
              )
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
