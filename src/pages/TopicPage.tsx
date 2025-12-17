import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { topics, getVideosByTopic, getQuizzesByTopic, getCasesByTopic } from '@/data/mockData';
import { ArrowLeft, PlayCircle, ClipboardList, Stethoscope } from 'lucide-react';
import VideoList from '@/components/content/VideoList';
import QuizList from '@/components/content/QuizList';
import CaseList from '@/components/content/CaseList';

export default function TopicPage() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  
  const topic = topics.find(t => t.id === topicId);
  const videos = getVideosByTopic(topicId || '');
  const quizzes = getQuizzesByTopic(topicId || '');
  const cases = getCasesByTopic(topicId || '');

  if (!topic) {
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

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-heading font-bold">{topic.name}</h1>
            <p className="text-muted-foreground">{topic.description}</p>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4" />
              Videos ({videos.length})
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Quizzes ({quizzes.length})
            </TabsTrigger>
            <TabsTrigger value="cases" className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Cases ({cases.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos">
            <VideoList videos={videos} />
          </TabsContent>

          <TabsContent value="quizzes">
            <QuizList quizzes={quizzes} />
          </TabsContent>

          <TabsContent value="cases">
            <CaseList cases={cases} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
