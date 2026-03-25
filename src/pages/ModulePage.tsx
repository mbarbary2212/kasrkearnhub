import { useState, useEffect, useMemo } from 'react';
import * as Sentry from '@sentry/react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useModule } from '@/hooks/useModules';
import { useModuleChapters } from '@/hooks/useChapters';
import { useAuthContext } from '@/contexts/AuthContext';
import { useYearById } from '@/hooks/useYears';
import { useIsModuleAdmin } from '@/hooks/useModuleAdmin';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useModules } from '@/hooks/useModules';
import { LearningHubTabs } from '@/components/dashboard/LearningHubTabs';
import { useLastPosition, buildResumeUrl, buildResumeLabel } from '@/hooks/useLastPosition';
import { useStudentDashboard } from '@/hooks/useStudentDashboard';
import { ModuleLearningTab } from '@/components/module/ModuleLearningTab';
import { ModuleFormativeTab } from '@/components/module/ModuleFormativeTab';
import { ModuleConnectTab } from '@/components/module/ModuleConnectTab';
import { useModuleBooks } from '@/hooks/useModuleBooks';
import {
  ArrowLeft, 
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Home,
  MessageCircle,
  Megaphone,
  Mail,
  Play,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ModuleDashboard } from '@/components/module/ModuleDashboard';
import { cn } from '@/lib/utils';
import { useTrackPosition } from '@/hooks/useTrackPosition';
import { formatDistanceToNow } from 'date-fns';

type ModuleSection = 'dashboard' | 'learning' | 'formative' | 'connect' | 'coach';

export default function ModulePage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin, isTeacher, isPlatformAdmin, isSuperAdmin } = useAuthContext();
  const isStudentEarly = !isAdmin && !isTeacher && !isPlatformAdmin && !isSuperAdmin;
  const getSection = (): ModuleSection => {
    const param = searchParams.get('section');
    if (param === 'learning' || param === 'formative' || param === 'connect' || param === 'coach') return param;
    return 'learning';
  };
  const [activeSection, setActiveSection] = useState<ModuleSection>(getSection);

  // Sync activeSection when URL search params change (e.g. sidebar clicks)
  useEffect(() => {
    setActiveSection(getSection());
  }, [searchParams]);

  const { data: module, isLoading: moduleLoading } = useModule(moduleId || '');
  const actualModuleId = module?.id;
  const { data: year } = useYearById(module?.year_id || '');
  const { data: chapters, isLoading: chaptersLoading } = useModuleChapters(actualModuleId);
  
  // Get unread message counts for Connect tab badges
  const { data: unreadCounts } = useUnreadMessages(actualModuleId, module?.year_id);
  
  // Check module admin permissions
  const { canManageContent, isModuleAdmin } = useIsModuleAdmin(actualModuleId);
  
  // Platform admin can manage books/departments
  const canManageBooks = isPlatformAdmin || isSuperAdmin || isModuleAdmin;
  // Module admin, platform admin, or teachers can manage chapters
  const canManageChapters = canManageContent;

  // Track position for resume functionality
  useTrackPosition({
    year_number: year?.number ?? null,
    module_id: actualModuleId ?? null,
    module_name: module?.name ?? null,
    module_slug: module?.slug ?? null,
  });

  useEffect(() => {
    if (module?.name) {
      Sentry.addBreadcrumb({
        category: 'navigation',
        message: `Opened module: ${module.name}`,
        level: 'info',
      });
    }
  }, [module?.name]);

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

  // Fetch year modules for Study Coach
  const { data: yearModules = [] } = useModules(module?.year_id);
  const isStudent = !isAdmin && !isTeacher && !isPlatformAdmin && !isSuperAdmin;

  // Fetch books for module-level pills (students only)
  const { data: moduleBooks } = useModuleBooks(actualModuleId);
  const sortedModuleBooks = useMemo(() => {
    if (!moduleBooks) return [];
    return [...moduleBooks].sort((a, b) => a.display_order - b.display_order);
  }, [moduleBooks]);
  const hasMultipleBooks = sortedModuleBooks.length > 1;

  // Student book pill state
  const bookStorageKey = `kasrlearn_book_${actualModuleId}`;
  const [activeBookLabel, setActiveBookLabel] = useState<string | null>(null);

  // Initialize active book from localStorage once books are loaded
  useEffect(() => {
    if (!isStudent || !hasMultipleBooks || sortedModuleBooks.length === 0) return;
    const saved = localStorage.getItem(bookStorageKey);
    if (saved && sortedModuleBooks.some(b => b.book_label === saved)) {
      setActiveBookLabel(saved);
    } else {
      setActiveBookLabel(sortedModuleBooks[0]?.book_label || null);
    }
  }, [isStudent, hasMultipleBooks, sortedModuleBooks, bookStorageKey]);

  const handleSelectBookPill = (bookLabel: string) => {
    setActiveBookLabel(bookLabel);
    localStorage.setItem(bookStorageKey, bookLabel);
  };

  // Fetch last position for Continue card (students only)
  const { data: lastPos } = useLastPosition();
  const showContinueCard = isStudent && lastPos && lastPos.chapter_id && lastPos.module_id === actualModuleId;

  // Dashboard data for Study Coach tabs (Overview & Unlocks)
  const { data: coachDashboard } = useStudentDashboard({
    yearId: module?.year_id,
    moduleId: actualModuleId,
  });

  // Per-section color map
  const sectionColorEntries: Record<string, { activeBg: string; activeBgDark: string; border: string; text: string; icon: string; mobileBg: string }> = {
    dashboard: { activeBg: 'bg-primary/5',  activeBgDark: 'dark:bg-primary/10',    border: 'border-l-primary',    text: 'text-primary',                       icon: 'text-primary',                       mobileBg: 'bg-primary/10 text-primary' },
    learning:  { activeBg: 'bg-blue-50',   activeBgDark: 'dark:bg-blue-950/30',   border: 'border-l-blue-600',   text: 'text-blue-700 dark:text-blue-300',   icon: 'text-blue-600 dark:text-blue-400',   mobileBg: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' },
    connect:   { activeBg: 'bg-teal-50',   activeBgDark: 'dark:bg-teal-950/30',   border: 'border-l-teal-500',   text: 'text-teal-700 dark:text-teal-300',   icon: 'text-teal-500 dark:text-teal-400',   mobileBg: 'bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300' },
    formative: { activeBg: 'bg-violet-50', activeBgDark: 'dark:bg-violet-950/30', border: 'border-l-violet-500', text: 'text-violet-700 dark:text-violet-300', icon: 'text-violet-500 dark:text-violet-400', mobileBg: 'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300' },
    coach:     { activeBg: 'bg-amber-50',  activeBgDark: 'dark:bg-amber-950/30',  border: 'border-l-amber-500',  text: 'text-amber-700 dark:text-amber-300',  icon: 'text-amber-500 dark:text-amber-400',  mobileBg: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' },
  };
  const sectionColors = sectionColorEntries as Record<ModuleSection, typeof sectionColorEntries[string]>;

  // Section navigation items
  const sectionNav = [
    { id: 'learning' as ModuleSection, label: 'Learning', mobileLabel: 'Learning', icon: BookOpen },
    { id: 'connect' as ModuleSection, label: 'Connect', mobileLabel: 'Connect', icon: MessageCircle },
    { id: 'formative' as ModuleSection, label: 'Formative Assessment', mobileLabel: 'Formative', icon: ClipboardCheck },
    ...(isStudent ? [{ id: 'coach' as ModuleSection, label: 'Study Coach', mobileLabel: 'Coach', icon: CalendarDays }] : []),
  ];

  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in min-h-[60vh] bg-gradient-to-br from-blue-50/80 via-white to-blue-100/60 dark:from-blue-950/20 dark:via-background dark:to-blue-900/10 -mx-4 -mt-4 px-4 pt-4 rounded-xl">

        {/* Header + Book pills on same row */}
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="mt-0.5 flex-shrink-0" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            {moduleLoading ? (
              <>
                <Skeleton className="h-7 w-64 mb-1" />
                <Skeleton className="h-4 w-80" />
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <h1 className="text-xl md:text-2xl font-heading font-semibold truncate">{module?.name}</h1>
                  {/* Book/Department pills inline with title */}
                  {isStudent && hasMultipleBooks && activeBookLabel && (
                    <div className="flex flex-wrap gap-1.5">
                      {sortedModuleBooks.map((book) => (
                        <button
                          key={book.book_label}
                          onClick={() => handleSelectBookPill(book.book_label)}
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                            activeBookLabel === book.book_label
                              ? "bg-accent text-accent-foreground"
                              : "border border-border text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {book.description || book.book_label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {module?.description && (
                  <p className="text-muted-foreground text-xs md:text-sm line-clamp-1">{module.description}</p>
                )}
              </>
            )}
          </div>
        </div>
        {/* Continue Where You Left Off */}
        {showContinueCard && lastPos && (
          <div
            className="rounded-lg border border-primary/20 bg-primary/5 p-3 cursor-pointer
                       hover:border-primary/40 hover:bg-primary/10 transition-all duration-300 group"
            onClick={() => navigate(buildResumeUrl(lastPos))}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Play className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Continue where you left off</p>
                <p className="text-xs text-muted-foreground truncate">
                  {buildResumeLabel(lastPos)}
                  {' · '}
                  {formatDistanceToNow(new Date(lastPos.updated_at), { addSuffix: true })}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </div>
          </div>
        )}

        {/* Main Content Layout */}
        <div className="flex flex-col md:flex-row">
          {/* Mobile: Horizontal Navigation Tabs */}
          <div className="md:hidden mb-4">
            <nav className="flex gap-1.5 bg-white/70 dark:bg-card/70 backdrop-blur-lg rounded-xl border border-white/40 dark:border-white/10 shadow-lg p-1.5">
              {sectionNav.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                const isConnect = section.id === 'connect';
                const isCoach = section.id === 'coach';
                const colors = sectionColors[section.id];
                const coachBadgeCount = coachDashboard?.suggestions?.length || 0;
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "relative flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs transition-all duration-150",
                      isActive 
                        ? cn("font-semibold shadow-sm", colors.mobileBg)
                        : "text-muted-foreground hover:bg-gray-50/80 dark:hover:bg-white/5"
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", isActive ? colors.icon : "opacity-70")} />
                    <span>{section.mobileLabel}</span>
                    
                    {/* Connect badges */}
                    {isConnect && (unreadCounts?.announcements || 0) + (unreadCounts?.replies || 0) > 0 && (
                      <div className="absolute -top-1 -right-1 flex gap-0.5">
                        {(unreadCounts?.announcements || 0) > 0 && (
                          <span className="flex items-center justify-center min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full">
                            <Megaphone className="w-2.5 h-2.5 mr-0.5" />
                            {unreadCounts.announcements}
                          </span>
                        )}
                        {(unreadCounts?.replies || 0) > 0 && (
                          <span className="flex items-center justify-center min-w-[16px] h-4 px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                            <Mail className="w-2.5 h-2.5 mr-0.5" />
                            {unreadCounts.replies}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Study Coach badge */}
                    {isCoach && coachBadgeCount > 0 && (
                      <div className="absolute -top-1 -right-1">
                        <span className="flex items-center justify-center min-w-[16px] h-4 px-1 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                          <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                          {coachBadgeCount}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>


          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Learning Section */}
            {activeSection === 'learning' && actualModuleId && (
              <ModuleLearningTab
                moduleId={actualModuleId}
                chapters={chapters}
                chaptersLoading={chaptersLoading}
                selectorLabel="Department"
                canManageBooks={canManageBooks}
                canManageChapters={canManageChapters}
                externalActiveBookLabel={isStudent && hasMultipleBooks ? activeBookLabel : undefined}
              />
            )}

            {/* Formative Assessment Section */}
            {activeSection === 'formative' && actualModuleId && (
              <ModuleFormativeTab
                moduleId={actualModuleId}
                moduleName={module?.name || ''}
                chapters={chapters}
                selectorLabel="Department"
              />
            )}

            {/* Connect Section */}
            {activeSection === 'connect' && actualModuleId && (
              <ModuleConnectTab
                moduleId={actualModuleId}
                moduleName={module?.name || ''}
                moduleCode={module?.slug || ''}
                yearId={module?.year_id}
              />
            )}

            {/* Study Coach Section - Students only */}
            {activeSection === 'coach' && actualModuleId && coachDashboard && (
              <LearningHubTabs
                dashboard={coachDashboard}
                moduleSelected={true}
                modules={yearModules.map(m => ({
                  id: m.id,
                  name: m.name,
                  workload_level: m.workload_level as 'light' | 'medium' | 'heavy' | 'heavy_plus' | null | undefined,
                  page_count: m.page_count,
                }))}
                selectedYearName={year?.name || ''}
                selectedYearId={module?.year_id}
                selectedModuleId={actualModuleId}
                onNavigate={(moduleId, chapterId, tab) => {
                  navigate(`/module/${moduleId}/chapter/${chapterId}${tab ? `?tab=${tab}` : ''}`);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
