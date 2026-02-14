import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { useStudentDashboard } from '@/hooks/useStudentDashboard';
import { ModuleLearningTab } from '@/components/module/ModuleLearningTab';
import { ModuleFormativeTab } from '@/components/module/ModuleFormativeTab';
import { ModuleConnectTab } from '@/components/module/ModuleConnectTab';
import {
  ArrowLeft, 
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  MessageCircle,
  Megaphone,
  Mail,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ModuleSection = 'learning' | 'formative' | 'connect' | 'coach';

export default function ModulePage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isTeacher, isPlatformAdmin, isSuperAdmin } = useAuthContext();
  const [activeSection, setActiveSection] = useState<ModuleSection>('learning');

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

  // Dashboard data for Study Coach tabs (Overview & Unlocks)
  const { data: coachDashboard } = useStudentDashboard({
    yearId: module?.year_id,
    moduleId: actualModuleId,
  });

  // Per-section color map
  const sectionColors: Record<ModuleSection, { activeBg: string; activeBgDark: string; border: string; text: string; icon: string; mobileBg: string }> = {
    learning:  { activeBg: 'bg-blue-50',   activeBgDark: 'dark:bg-blue-950/30',   border: 'border-l-blue-600',   text: 'text-blue-700 dark:text-blue-300',   icon: 'text-blue-600 dark:text-blue-400',   mobileBg: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' },
    connect:   { activeBg: 'bg-teal-50',   activeBgDark: 'dark:bg-teal-950/30',   border: 'border-l-teal-500',   text: 'text-teal-700 dark:text-teal-300',   icon: 'text-teal-500 dark:text-teal-400',   mobileBg: 'bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300' },
    formative: { activeBg: 'bg-violet-50', activeBgDark: 'dark:bg-violet-950/30', border: 'border-l-violet-500', text: 'text-violet-700 dark:text-violet-300', icon: 'text-violet-500 dark:text-violet-400', mobileBg: 'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300' },
    coach:     { activeBg: 'bg-amber-50',  activeBgDark: 'dark:bg-amber-950/30',  border: 'border-l-amber-500',  text: 'text-amber-700 dark:text-amber-300',  icon: 'text-amber-500 dark:text-amber-400',  mobileBg: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' },
  };

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

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/year/${year?.number || 1}`)}>
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
                <h1 className="text-xl md:text-2xl font-heading font-semibold truncate">{module?.name}</h1>
                {module?.description && (
                  <p className="text-muted-foreground text-xs md:text-sm line-clamp-1">{module.description}</p>
                )}
              </>
            )}
          </div>
        </div>

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

          {/* Desktop: Vertical Navigation Rail */}
          <div className="hidden md:block w-[200px] flex-shrink-0">
            <nav className="sticky top-4 bg-white/70 dark:bg-card/70 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-white/10 shadow-lg p-1.5">
              <div className="flex flex-col gap-0.5">
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
                        "relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 text-left",
                        isActive 
                          ? cn("font-semibold border-l-4", colors.activeBg, colors.activeBgDark, colors.border, colors.text)
                          : "text-muted-foreground hover:bg-gray-50/80 dark:hover:bg-white/5 hover:translate-y-[-1px]"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? colors.icon : "opacity-70")} />
                      <span className="flex-1">{section.label}</span>
                      
                      {/* Connect badges */}
                      {isConnect && (unreadCounts?.announcements || 0) + (unreadCounts?.replies || 0) > 0 && (
                        <div className="flex gap-1">
                          {(unreadCounts?.announcements || 0) > 0 && (
                            <span className={cn(
                              "flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full",
                              isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-destructive text-destructive-foreground"
                            )}>
                              <Megaphone className="w-3 h-3 mr-0.5" />
                              {unreadCounts.announcements}
                            </span>
                          )}
                          {(unreadCounts?.replies || 0) > 0 && (
                            <span className={cn(
                              "flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full",
                              isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground"
                            )}>
                              <Mail className="w-3 h-3 mr-0.5" />
                              {unreadCounts.replies}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Study Coach badge */}
                      {isCoach && coachBadgeCount > 0 && (
                        <span className={cn(
                          "flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full",
                          isActive ? "bg-amber-200/40 text-amber-900" : "bg-amber-500 text-white"
                        )}>
                          <Sparkles className="w-3 h-3 mr-0.5" />
                          {coachBadgeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Vertical Divider (desktop only) */}
          <div className="hidden md:block w-px bg-transparent mx-4 self-stretch min-h-[200px] shadow-[2px_0_12px_-2px_rgba(0,0,0,0.08)]" />

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
