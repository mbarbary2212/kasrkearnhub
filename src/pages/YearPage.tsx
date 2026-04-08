import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Skeleton } from '@/components/ui/skeleton';
import { useYear } from '@/hooks/useYears';
import { useModulesByYearNumber } from '@/hooks/useModules';
import { useAuthContext } from '@/contexts/AuthContext';
import { ArrowLeft, BookOpen, ChevronRight, LayoutGrid, List, Lock, Play, Stethoscope } from 'lucide-react';
import { getYearIcon } from '@/lib/yearIcons';
import { getModuleImage, getModuleGradient } from '@/lib/moduleImages';
import { cn } from '@/lib/utils';
import { useModuleReadinessBatch } from '@/hooks/useModuleReadinessBatch';
import { ModuleReadinessBar } from '@/components/module/ModuleReadinessBar';
import { useLastPosition, buildResumeUrl, buildResumeLabel } from '@/hooks/useLastPosition';
import { formatDistanceToNow } from 'date-fns';
import { useMergedModuleConfig } from '@/hooks/useMergedModuleConfig';
import { useLastPosition, buildResumeUrl, buildResumeLabel } from '@/hooks/useLastPosition';
import { formatDistanceToNow } from 'date-fns';

export default function YearPage() {
  const { yearId } = useParams();
  const navigate = useNavigate();
  const auth = useAuthContext();
  const yearNumber = parseInt(yearId || '1', 10);

  const handleGoHome = () => {
    navigate('/');
  };
  const isStudent = !!auth.user && !auth.isAdmin && !auth.isTeacher && !auth.isPlatformAdmin && !auth.isSuperAdmin;
  const { data: lastPosition } = useLastPosition();

  const { data: year, isLoading: yearLoading } = useYear(yearNumber);
  const { data: rawModules, isLoading: modulesLoading } = useModulesByYearNumber(yearNumber);
  const { data: mergedConfig } = useMergedModuleConfig();
  const isStudentView = !auth.isAdmin && !auth.isTeacher && !auth.isPlatformAdmin && !auth.isSuperAdmin;

  const modules = useMemo(() => {
    if (!rawModules) return undefined;
    if (!mergedConfig?.enabled || !isStudentView) return rawModules;
    return rawModules.filter(m => !mergedConfig.hiddenModules.includes(m.id));
  }, [rawModules, mergedConfig, isStudentView]);

  const moduleIds = useMemo(() => (modules || []).map(m => m.id), [modules]);
  const { data: readinessMap = {} } = useModuleReadinessBatch(moduleIds);

  const [viewMode, setViewMode] = useState<'cards' | 'list'>(() => {
    return (localStorage.getItem('yearPageViewMode') as 'cards' | 'list') || 'cards';
  });

  const toggleViewMode = (mode: 'cards' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('yearPageViewMode', mode);
  };

  const isLoading = yearLoading || modulesLoading;

  if (!yearLoading && !year) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Year not found.</p>
          <Button onClick={handleGoHome} className="mt-4">
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
          <Button variant="ghost" size="icon" onClick={handleGoHome}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          {((year as any)?.image_url || getYearIcon(yearNumber)) && (
            <img 
              src={(year as any)?.image_url || getYearIcon(yearNumber)} 
              alt={`Year ${yearNumber}`}
              className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover shadow-md
                         animate-scale-in
                         hover:scale-105 hover:shadow-lg transition-all duration-300"
            />
          )}
          
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

        {/* Continue where you left off */}
        {isStudent && lastPosition?.module_id && (
          <button
            onClick={() => navigate(buildResumeUrl(lastPosition))}
            className="w-full group"
          >
            <Card className="p-4 flex items-center gap-4 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Play className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium">Continue where you left off</p>
                <p className="text-xs text-muted-foreground truncate">
                  {buildResumeLabel(lastPosition)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {formatDistanceToNow(new Date(lastPosition.updated_at), { addSuffix: true })}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Card>
          </button>
        )}

        {/* Modules Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading font-semibold">Modules</h2>
            <div className="flex items-center gap-1 border rounded-md p-0.5">
              <Button
                variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 gap-1.5"
                onClick={() => toggleViewMode('cards')}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">Cards</span>
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 gap-1.5"
                onClick={() => toggleViewMode('list')}
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">List</span>
              </Button>
            </div>
          </div>

          {isLoading ? (
            viewMode === 'cards' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="w-full aspect-[2.5]" />
                    <div className="p-2 space-y-1">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="border rounded-lg divide-y">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-3 px-4">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-4 flex-1 max-w-xs" />
                    <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
                  </div>
                ))}
              </div>
            )
          ) : modules && modules.length > 0 ? (
            viewMode === 'cards' ? (
              <div className={cn("grid gap-3 mx-auto w-full", 
                modules.length <= 4 ? "grid-cols-2 max-w-xl" 
                : modules.length <= 6 ? "grid-cols-2 sm:grid-cols-3 max-w-xl sm:max-w-3xl" 
                : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 max-w-xl sm:max-w-3xl lg:max-w-5xl"
              )}>
                {modules.map((module) => {
                  const isAssigned = auth.isModuleAdmin && !auth.isTeacher
                    ? auth.moduleAdminModuleIds.includes(module.id)
                    : true;
                  const image = getModuleImage(module.slug, (module as any).image_url);
                  const gradient = getModuleGradient(module.slug);

                  if (!isAssigned) {
                    return (
                      <Card key={module.id} className="overflow-hidden opacity-50 cursor-default">
                        <AspectRatio ratio={16 / 9}>
                          {image ? (
                            <img src={image} alt={module.name} className="w-full h-full object-cover grayscale" />
                          ) : (
                            <div className={cn('w-full h-full bg-gradient-to-br flex flex-col items-center justify-center relative', gradient)}>
                              <Stethoscope className="absolute bottom-3 right-3 w-10 h-10 text-white/10" />
                              <span className="text-2xl font-heading font-bold text-white/80 tracking-wider">{module.slug?.toUpperCase()}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Lock className="w-8 h-8 text-white/70" />
                          </div>
                        </AspectRatio>
                        <div className="p-2.5">
                          <p className="font-heading font-semibold text-muted-foreground truncate text-xs sm:text-sm">{module.slug?.toUpperCase()} — {module.name}</p>
                        </div>
                      </Card>
                    );
                  }

                  return (
                    <Card
                      key={module.id}
                      className="overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 group"
                      onClick={() => navigate(`/module/${module.id}`)}
                    >
                      <AspectRatio ratio={16 / 9}>
                        {image ? (
                          <img src={image} alt={module.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        ) : (
                          <div className={cn('w-full h-full bg-gradient-to-br flex flex-col items-center justify-center relative', gradient)}>
                            <Stethoscope className="absolute bottom-3 right-3 w-10 h-10 text-white/10" />
                            <span className="text-2xl font-heading font-bold text-white/80 tracking-wider">{module.slug?.toUpperCase()}</span>
                          </div>
                        )}
                      </AspectRatio>
                      <div className="p-2.5">
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0 flex-1">
                            <p className="font-heading font-semibold text-foreground truncate text-xs sm:text-sm">
                              {mergedConfig?.enabled && mergedConfig.display[module.id]
                                ? mergedConfig.display[module.id].displayName
                                : `${module.slug?.toUpperCase()} — ${module.name}`}
                            </p>
                            {mergedConfig?.enabled && mergedConfig.display[module.id] && (
                              <div className="flex gap-1 mt-0.5">
                                {mergedConfig.display[module.id].tags.map(tag => (
                                  <span key={tag} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
                                ))}
                              </div>
                            )}
                            {module.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-2">{module.description}</p>
                            )}
                            <ModuleReadinessBar readiness={readinessMap[module.id] ?? null} />
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-0.5" />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              /* List view — compact rows */
              <div className="border rounded-lg divide-y">
                {modules.map((module) => {
                  const isAssigned = auth.isModuleAdmin && !auth.isTeacher
                    ? auth.moduleAdminModuleIds.includes(module.id)
                    : true;

                  if (!isAssigned) {
                    return (
                      <div key={module.id} className="flex items-center gap-3 py-3 px-4 opacity-50">
                        <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium text-muted-foreground truncate">
                          {module.slug?.toUpperCase()} — {module.name}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={module.id}
                      className="flex items-center gap-3 py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors group"
                      onClick={() => navigate(`/module/${module.id}`)}
                    >
                      <span className="text-xs font-mono font-semibold text-primary min-w-[4.5rem]">
                        {module.slug?.toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate block">
                          {mergedConfig?.enabled && mergedConfig.display[module.id]
                            ? mergedConfig.display[module.id].displayName
                            : module.name}
                        </span>
                        {mergedConfig?.enabled && mergedConfig.display[module.id] && (
                          <div className="flex gap-1">
                            {mergedConfig.display[module.id].tags.map(tag => (
                              <span key={tag} className="text-[10px] font-mono px-1 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="w-24 flex-shrink-0">
                        <ModuleReadinessBar readiness={readinessMap[module.id] ?? null} />
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            )
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
