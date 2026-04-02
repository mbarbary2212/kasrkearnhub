import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useAuthContext } from '@/contexts/AuthContext';
import { useYears } from '@/hooks/useYears';
import { useUserManagedModules } from '@/hooks/useModuleAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ArrowRight, Layers } from 'lucide-react';

export default function AdminLearningPage() {
  const navigate = useNavigate();
  const { isSuperAdmin, isPlatformAdmin } = useAuthContext();
  const { data: years, isLoading: yearsLoading } = useYears();
  const { data: rawModules, isLoading: modulesLoading } = useUserManagedModules();

  const isLoading = yearsLoading || modulesLoading;

  // Sort modules alphabetically and group by year
  const modulesByYear = useMemo(() => {
    if (!rawModules?.length || !years?.length) return [];

    const sorted = [...rawModules].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );

    return years
      .slice()
      .sort((a, b) => a.number - b.number)
      .map(year => ({
        year,
        modules: sorted.filter(m => m.year_id === year.id),
      }))
      .filter(g => g.modules.length > 0);
  }, [rawModules, years]);

  // Flat alphabetical list (for when no year grouping needed)
  const allModulesSorted = useMemo(() => {
    if (!rawModules?.length) return [];
    return [...rawModules].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [rawModules]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
          <Skeleton className="h-8 w-48" />
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
        <div className="flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-xl md:text-2xl font-heading font-bold">Content Management</h1>
            <p className="text-sm text-muted-foreground">
              {isSuperAdmin || isPlatformAdmin
                ? 'Browse and manage all modules'
                : 'Browse and manage your assigned modules'}
            </p>
          </div>
        </div>

        {allModulesSorted.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No modules assigned to your account.</p>
              <p className="text-xs mt-1">Contact a platform admin to get access.</p>
            </CardContent>
          </Card>
        ) : (
          modulesByYear.map(({ year, modules }) => (
            <Card key={year.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  {year.name}
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    {modules.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0.5">
                {modules.map((mod) => (
                  <button
                    key={mod.id}
                    onClick={() => navigate(`/module/${mod.id}`)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {mod.slug && (
                        <span className="text-xs font-mono font-semibold text-muted-foreground uppercase w-14 flex-shrink-0">
                          {mod.slug}
                        </span>
                      )}
                      <span className="text-sm font-medium text-foreground truncate">{mod.name}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </button>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </MainLayout>
  );
}
