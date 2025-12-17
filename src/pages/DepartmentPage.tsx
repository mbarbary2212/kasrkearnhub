import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDepartment } from '@/hooks/useDepartments';
import { useTopics } from '@/hooks/useTopics';
import { ArrowLeft, BookOpen, ChevronRight } from 'lucide-react';

export default function DepartmentPage() {
  const { departmentId } = useParams();
  const navigate = useNavigate();
  
  const { data: department, isLoading: deptLoading } = useDepartment(departmentId || '');
  const { data: topics, isLoading: topicsLoading } = useTopics(department?.id);

  const isLoading = deptLoading || topicsLoading;

  if (!deptLoading && !department) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Department not found.</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go Home
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            {deptLoading ? (
              <>
                <Skeleton className="h-9 w-48 mb-2" />
                <Skeleton className="h-5 w-72" />
              </>
            ) : (
              <>
                <h1 className="text-3xl font-heading font-bold">{department?.name}</h1>
                <p className="text-muted-foreground">{department?.description}</p>
              </>
            )}
          </div>
        </div>

        {/* Topics List */}
        <section>
          <h2 className="text-xl font-heading font-semibold mb-4">Topics</h2>
          
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : topics && topics.length > 0 ? (
            <div className="space-y-3">
              {topics.map((topic, index) => (
                <Card
                  key={topic.id}
                  className="cursor-pointer transition-all hover:shadow-md hover:bg-muted/50 group"
                  onClick={() => navigate(`/topic/${topic.id}`)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                        <span className="font-semibold text-secondary-foreground">{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-medium">{topic.name}</h3>
                        <p className="text-sm text-muted-foreground">{topic.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No topics available for this department yet.</p>
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}
