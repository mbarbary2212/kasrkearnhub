import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as Sentry from '@sentry/react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useModule } from '@/hooks/useModules';
import { useModuleChapters } from '@/hooks/useChapters';
import { useAuthContext } from '@/contexts/AuthContext';

import { useYearById } from '@/hooks/useYears';
import { useActiveYear } from '@/contexts/ActiveYearContext';
import { useIsModuleAdmin } from '@/hooks/useModuleAdmin';

import { useModules } from '@/hooks/useModules';
import { LearningHubTabs } from '@/components/dashboard/LearningHubTabs';
import { useLastPosition, buildResumeUrl, buildResumeLabel } from '@/hooks/useLastPosition';
import { useModuleAdmins } from '@/hooks/useContentAdmins';
import type { ContentAdmin } from '@/hooks/useContentAdmins';
import { ContentAdminCard } from '@/components/content/ContentAdminCard';
import { ChapterAdminAvatars } from '@/components/content/ChapterAdminAvatars';
import InquiryModal from '@/components/feedback/InquiryModal';
import { useStudentDashboard } from '@/hooks/useStudentDashboard';
import { ModuleLearningTab } from '@/components/module/ModuleLearningTab';
import { ModuleFormativeTab } from '@/components/module/ModuleFormativeTab';

import { useModuleBooks } from '@/hooks/useModuleBooks';
import {
  ArrowLeft, 
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Home,
  Play,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ModuleDashboard } from '@/components/module/ModuleDashboard';
import { cn } from '@/lib/utils';

import { formatDistanceToNow } from 'date-fns';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

type ModuleSection = 'dashboard' | 'learning' | 'formative' | 'coach';

export default function ModulePage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin, isTeacher, isPlatformAdmin, isSuperAdmin } = useAuthContext();
  const isStudentEarly = !isAdmin && !isTeacher && !isPlatformAdmin && !isSuperAdmin;
  const getSection = (): ModuleSection => {
    const param = searchParams.get('section');
    if (param === 'learning' || param === 'formative' || param === 'coach') return param;
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
  const { setActiveYear } = useActiveYear();
  const { data: chapters, isLoading: chaptersLoading } = useModuleChapters(actualModuleId);
  
  
  // Check module admin permissions
  const { canManageContent, isModuleAdmin } = useIsModuleAdmin(actualModuleId);
  
  // Platform admin can manage books/departments
  const canManageBooks = isPlatformAdmin || isSuperAdmin || isModuleAdmin;
  // Module admin, platform admin, or teachers can manage chapters
  const canManageChapters = canManageContent;


  // Sync active year to header
  useEffect(() => {
    if (year) {
      setActiveYear({ yearNumber: year.number, yearName: year.name });
    }
  }, [year, setActiveYear]);

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
    
    formative: { activeBg: 'bg-violet-50', activeBgDark: 'dark:bg-violet-950/30', border: 'border-l-violet-500', text: 'text-violet-700 dark:text-violet-300', icon: 'text-violet-500 dark:text-violet-400', mobileBg: 'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300' },
    coach:     { activeBg: 'bg-amber-50',  activeBgDark: 'dark:bg-amber-950/30',  border: 'border-l-amber-500',  text: 'text-amber-700 dark:text-amber-300',  icon: 'text-amber-500 dark:text-amber-400',  mobileBg: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' },
  };
  const sectionColors = sectionColorEntries as Record<ModuleSection, typeof sectionColorEntries[string]>;

  // Section navigation items
  const sectionNav = [
    { id: 'learning' as ModuleSection, label: 'Learning', mobileLabel: 'Learning', icon: BookOpen },
    { id: 'formative' as ModuleSection, label: 'Formative Assessment', mobileLabel: 'Formative', icon: ClipboardCheck },
    ...(isStudent ? [{ id: 'coach' as ModuleSection, label: 'Study Coach', mobileLabel: 'Coach', icon: CalendarDays }] : []),
  ];

  // Swipe gesture for mobile section navigation
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionIds = sectionNav.map(s => s.id);
  const handleSwipeLeft = useCallback(() => {
    const idx = sectionIds.indexOf(activeSection);
    if (idx < sectionIds.length - 1) setActiveSection(sectionIds[idx + 1]);
  }, [activeSection, sectionIds]);
  const handleSwipeRight = useCallback(() => {
    const idx = sectionIds.indexOf(activeSection);
    if (idx > 0) setActiveSection(sectionIds[idx - 1]);
  }, [activeSection, sectionIds]);
  useSwipeGesture(contentRef, { onSwipeLeft: handleSwipeLeft, onSwipeRight: handleSwipeRight });

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
                  {isStudent && <ModuleLeadRow moduleId={actualModuleId} moduleName={module?.name} />}
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
          {/* Mobile: Section nav handled by MobileBottomNav — hidden here */}


          {/* Main Content Area */}
          <div className="flex-1 min-w-0" ref={contentRef}>
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
                hideEmptyChapters={isStudent}
                chapterContentMap={coachDashboard?.chapters}
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

function ModuleLeadRow({ moduleId, moduleName }: { moduleId: string | undefined; moduleName?: string }) {
  const { data: admins } = useModuleAdmins(moduleId);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<ContentAdmin | null>(null);

  if (!admins || admins.length === 0) return null;

  return (
    <>
      <ChapterAdminAvatars
        moduleId={moduleId}
        moduleName={moduleName}
        onContactAdmin={(admin, role) => {
          setSelectedAdmin(admin);
          setInquiryOpen(true);
        }}
      />
      <InquiryModal
        isOpen={inquiryOpen}
        onClose={() => { setInquiryOpen(false); setSelectedAdmin(null); }}
        moduleId={moduleId}
        moduleName={moduleName}
        targetAdminId={selectedAdmin?.id}
        targetAdminName={selectedAdmin?.full_name || undefined}
        targetRole="module"
      />
    </>
  );
}
