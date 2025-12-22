import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useModule } from '@/hooks/useModules';
import { 
  ArrowLeft, 
  ClipboardCheck,
  HelpCircle,
  Stethoscope,
  Image,
  PenTool,
  BookOpen,
} from 'lucide-react';

export default function MockExamPage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { data: module, isLoading: moduleLoading } = useModule(moduleId || '');

  const examTypes = [
    {
      id: 'mcq',
      title: 'MCQ Exam',
      description: 'Multiple choice questions to test your knowledge',
      icon: HelpCircle,
      available: false,
    },
    {
      id: 'osce',
      title: 'OSCE Exam',
      description: 'Objective structured clinical examination scenarios',
      icon: Stethoscope,
      available: false,
    },
    {
      id: 'image',
      title: 'Image Exam',
      description: 'Identify and interpret clinical images',
      icon: Image,
      available: false,
    },
    {
      id: 'essay',
      title: 'Essay Exam',
      description: 'Short answer and essay-type questions',
      icon: PenTool,
      available: false,
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/module/${moduleId}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            {moduleLoading ? (
              <>
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-8 w-96" />
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{module?.name}</p>
                <h1 className="text-2xl font-heading font-semibold flex items-center gap-2">
                  <ClipboardCheck className="w-6 h-6" />
                  Mock Exam
                </h1>
              </>
            )}
          </div>
        </div>

        {/* Exam Type Selection */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-medium mb-2">Choose Exam Type</h2>
            <p className="text-sm text-muted-foreground">
              Select the type of exam you want to take. You can choose the scope (whole module or specific chapters) after selecting the exam type.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {examTypes.map((exam) => (
              <Card 
                key={exam.id} 
                className={`transition-all ${
                  exam.available 
                    ? 'hover:shadow-md cursor-pointer hover:border-primary' 
                    : 'opacity-60'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <exam.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{exam.title}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {exam.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button 
                    className="w-full" 
                    variant={exam.available ? "default" : "secondary"}
                    disabled={!exam.available}
                  >
                    {exam.available ? 'Start Exam' : 'Coming Soon'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Scope Selection Placeholder */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Exam Scope
            </CardTitle>
            <CardDescription>
              After selecting an exam type, you'll be able to choose:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Whole module - All chapters included
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Specific book(s) - Select one or more books
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Specific chapter(s) - Select individual chapters
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
