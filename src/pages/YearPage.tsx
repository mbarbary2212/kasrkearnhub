import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
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
            <div className="flex flex-col gap-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : modules && modules.length > 0 ? (
            <div className="flex flex-col gap-1">
              {modules.map((module, index) => (
                <div
                  key={module.id}
                  className="flex items-center gap-3 py-3 px-4 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 group border border-transparent hover:border-border"
                  onClick={() => navigate(`/module/${module.id}`)}
                >
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {module.slug?.toUpperCase()} — {module.name}
                    </p>
                    {module.description && (
                      <p className="text-sm text-muted-foreground truncate">{module.description}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                </div>
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
