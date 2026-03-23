import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Skeleton } from '@/components/ui/skeleton';
import { useYear } from '@/hooks/useYears';
import { useModulesByYearNumber, useModulesByIds } from '@/hooks/useModules';
import { useAuthContext } from '@/contexts/AuthContext';
import { ArrowLeft, BookOpen, ChevronRight, LayoutGrid, List, Lock, Stethoscope } from 'lucide-react';
import { getYearIcon } from '@/lib/yearIcons';
import { getModuleImage, getModuleGradient } from '@/lib/moduleImages';
import { cn } from '@/lib/utils';

export default function YearPage() {
  const { yearId } = useParams();
  const navigate = useNavigate();
  const auth = useAuthContext();
  const yearNumber = parseInt(yearId || '1', 10);

  const handleGoHome = () => {
    sessionStorage.setItem('skipAutoLogin', 'true');
    navigate('/');
  };

  const CROSS_LISTED_IDS = [
    'a6c13735-4299-4c40-8a41-500c6edcf723', // MED-422
    '153318ba-32b9-4f8e-9cbc-bdd8df9b9b10', // SUR-423
  ];

  const { data: year, isLoading: yearLoading } = useYear(yearNumber);
  const { data: modules, isLoading: modulesLoading } = useModulesByYearNumber(yearNumber);
  const { data: crossListedModules, isLoading: crossListedLoading } = useModulesByIds(
    yearNumber === 5 ? CROSS_LISTED_IDS : []
  );

  const [viewMode, setViewMode] = useState<'cards' | 'list'>(() => {
    return (localStorage.getItem('yearPageViewMode') as 'cards' | 'list') || 'cards';
  });

  const toggleViewMode = (mode: 'cards' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('yearPageViewMode', mode);
  };

  const isLoading = yearLoading || modulesLoading || (yearNumber === 5 && crossListedLoading);

  const allModules = yearNumber === 5 && crossListedModules && modules
    ? [...crossListedModules, ...modules]
    : modules;

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
          
          {getYearIcon(yearNumber) && (
            <img 
              src={getYearIcon(yearNumber)} 
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

        {/* Modules Grid */}
        <section>
          <h2 className="text-xl font-heading font-semibold mb-4">Modules</h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="w-full aspect-video" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </Card>
              ))}
            </div>
          ) : allModules && allModules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allModules.map((module) => {
                const isAssigned = auth.isModuleAdmin && !auth.isTeacher
                  ? auth.moduleAdminModuleIds.includes(module.id)
                  : true;
                const isYear4CrossListed = yearNumber === 4 && CROSS_LISTED_IDS.includes(module.id);
                const image = getModuleImage(module.slug);
                const gradient = getModuleGradient(module.slug);

                if (!isAssigned) {
                  return (
                    <Card
                      key={module.id}
                      className="overflow-hidden opacity-50 cursor-default"
                    >
                      <AspectRatio ratio={16 / 9}>
                        {image ? (
                          <img
                            src={image}
                            alt={module.name}
                            className="w-full h-full object-cover grayscale"
                          />
                        ) : (
                          <div className={cn(
                            'w-full h-full bg-gradient-to-br flex flex-col items-center justify-center relative',
                            gradient
                          )}>
                            <Stethoscope className="absolute bottom-3 right-3 w-10 h-10 text-white/10" />
                            <span className="text-2xl font-heading font-bold text-white/80 tracking-wider">
                              {module.slug?.toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Lock className="w-8 h-8 text-white/70" />
                        </div>
                      </AspectRatio>
                      <div className="p-4">
                        <p className="font-heading font-semibold text-muted-foreground truncate">
                          {module.slug?.toUpperCase()} — {module.name}
                        </p>
                      </div>
                    </Card>
                  );
                }

                return (
                  <Card
                    key={module.id}
                    className="overflow-hidden cursor-pointer transition-all duration-300
                               hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 group"
                    onClick={() => navigate(`/module/${module.id}`)}
                  >
                    <AspectRatio ratio={16 / 9}>
                      {image ? (
                        <img
                          src={image}
                          alt={module.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className={cn(
                          'w-full h-full bg-gradient-to-br flex flex-col items-center justify-center relative',
                          gradient
                        )}>
                          <Stethoscope className="absolute bottom-3 right-3 w-10 h-10 text-white/10" />
                          <span className="text-2xl font-heading font-bold text-white/80 tracking-wider">
                            {module.slug?.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </AspectRatio>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-heading font-semibold text-foreground truncate">
                            {module.slug?.toUpperCase()} — {module.name}
                          </p>
                          {module.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{module.description}</p>
                          )}
                          {isYear4CrossListed && (
                            <p className="text-xs text-muted-foreground italic mt-1">Also available in Year 5 this year</p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-0.5" />
                      </div>
                    </div>
                  </Card>
                );
              })}
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
