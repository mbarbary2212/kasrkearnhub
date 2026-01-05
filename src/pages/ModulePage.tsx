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
import { ModuleLearningTab } from '@/components/module/ModuleLearningTab';
import { ModuleFormativeTab } from '@/components/module/ModuleFormativeTab';
import { ModuleConnectTab } from '@/components/module/ModuleConnectTab';
import {
  ArrowLeft, 
  BookOpen,
  ClipboardCheck,
  MessageCircle,
  Megaphone,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ModuleSection = 'learning' | 'formative' | 'connect';

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
  const canManageBooks = isPlatformAdmin || isSuperAdmin;
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

  // Section navigation items
  const sectionNav = [
    { id: 'learning' as ModuleSection, label: 'Learning', mobileLabel: 'Learning', icon: BookOpen },
    { id: 'connect' as ModuleSection, label: 'Connect', mobileLabel: 'Connect', icon: MessageCircle },
    { id: 'formative' as ModuleSection, label: 'Formative Assessment', mobileLabel: 'Formative', icon: ClipboardCheck },
  ];

  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in">

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
            <nav className="flex gap-1.5 bg-muted/30 rounded-lg p-1.5">
              {sectionNav.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                const isConnect = section.id === 'connect';
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "relative flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
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
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Desktop: Vertical Navigation Rail */}
          <div className="hidden md:block w-[200px] flex-shrink-0">
            <nav className="sticky top-4 bg-muted/30 rounded-lg p-2">
              <div className="flex flex-col gap-1">
                {sectionNav.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  const isConnect = section.id === 'connect';
                  
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors text-left",
                        isActive 
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
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
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Vertical Divider (desktop only) */}
          <div className="hidden md:block w-px bg-border/50 mx-4 self-stretch min-h-[200px]" />

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
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
