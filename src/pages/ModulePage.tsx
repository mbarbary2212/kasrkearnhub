import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useModule } from '@/hooks/useModules';
import { useModuleChapters } from '@/hooks/useChapters';
import { useAuthContext } from '@/contexts/AuthContext';
import { useYearById } from '@/hooks/useYears';
import { ModuleLearningTab } from '@/components/module/ModuleLearningTab';
import { ModuleFormativeTab } from '@/components/module/ModuleFormativeTab';
import { ModuleConnectTab } from '@/components/module/ModuleConnectTab';
import { 
  ArrowLeft, 
  BookOpen,
  ClipboardCheck,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ModuleSection = 'learning' | 'formative' | 'connect';

export default function ModulePage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isTeacher } = useAuthContext();
  const [activeSection, setActiveSection] = useState<ModuleSection>('learning');

  const canManageContent = isAdmin || isTeacher;

  const { data: module, isLoading: moduleLoading } = useModule(moduleId || '');
  const actualModuleId = module?.id;
  const { data: year } = useYearById(module?.year_id || '');
  const { data: chapters, isLoading: chaptersLoading } = useModuleChapters(actualModuleId);

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
    { id: 'formative' as ModuleSection, label: 'Formative Assessment', mobileLabel: 'Formative', icon: ClipboardCheck },
    { id: 'connect' as ModuleSection, label: 'Connect', mobileLabel: 'Connect', icon: MessageCircle },
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
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{section.mobileLabel}</span>
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
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors text-left",
                        isActive 
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{section.label}</span>
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
              />
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
