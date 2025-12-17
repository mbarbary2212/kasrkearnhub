import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useYear } from '@/hooks/useYears';
import { useModulesByYearNumber } from '@/hooks/useModules';
import { ArrowLeft, BookOpen, ChevronRight } from 'lucide-react';

export default function YearPage() {
  const { yearId } = useParams();
  const navigate = useNavigate();
  const yearNumber = parseInt(yearId || '1', 10);

  const { data: year, isLoading: yearLoading } = useYear(yearNumber);
  const { data: modules, isLoading: modulesLoading } = useModulesByYearNumber(yearNumber);

  const isLoading = yearLoading || modulesLoading;

  if (!yearLoading && !year) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Year not found.</p>
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            {yearLoading ? (
              <>
                <Skeleton className="h-9 w-48 mb-2" />
                <Skeleton className="h-5 w-72" />
              </>
            ) : (
              <>
                <h1 className="text-3xl font-heading font-bold">{year?.name}</h1>
                <p className="text-muted-foreground">{year?.subtitle}</p>
              </>
            )}
          </div>
        </div>

        {/* Modules List */}
        <section>
          <h2 className="text-xl font-heading font-semibold mb-4">Modules</h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : modules && modules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((module, index) => (
                <Card
                  key={module.id}
                  className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 group border-0 shadow-md"
                  onClick={() => navigate(`/module/${module.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 ${year?.color || 'bg-primary'} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <span className="text-lg font-bold text-primary-foreground">{index + 1}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                    <CardTitle className="font-heading mt-3">{module.name}</CardTitle>
                    {module.description && (
                      <CardDescription className="line-clamp-2">{module.description}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No modules available for this year yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Check back later or contact your administrator.
              </p>
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}
