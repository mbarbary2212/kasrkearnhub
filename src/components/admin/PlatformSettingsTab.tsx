import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Trash2, GraduationCap, Layers, Brain, Stethoscope, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { useArchiveLegacyOsce } from '@/hooks/useOsceQuestions';
import { StudentExperienceSection } from '@/components/admin/settings-sections/StudentExperienceSection';
import { CurriculumSection } from '@/components/admin/settings-sections/CurriculumSection';
import { AIAndModelsSection } from '@/components/admin/settings-sections/AIAndModelsSection';
import { DiagnosticsSection } from '@/components/admin/settings-sections/DiagnosticsSection';
import { NotificationsSection } from '@/components/admin/settings-sections/NotificationsSection';

function CollapsibleSettingsCard({ icon, title, description, children, defaultOpen = false }: {
  icon: ReactNode; title: string; description: string; children: ReactNode; defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              {icon}
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function ArchiveLegacyOsceCard() {
  const archiveLegacyOsce = useArchiveLegacyOsce();
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const handleArchiveLegacy = async () => {
    try {
      await archiveLegacyOsce.mutateAsync();
      setArchiveConfirmOpen(false);
    } catch (error) {
      console.error('Error archiving legacy OSCE:', error);
    }
  };

  return (
    <div className="mt-6 p-4 border border-destructive/30 rounded-lg bg-destructive/5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-destructive" />
          <Label className="text-base font-medium text-destructive">
            Archive Legacy OSCE Questions
          </Label>
        </div>
        <p className="text-sm text-muted-foreground">
          This will archive all old-format OSCE/Practical questions that don't fit the new Image + History + 5 T/F format.
          This is a one-time migration action.
        </p>
        <Dialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm" className="mt-2">
              Archive Legacy OSCE Questions
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Archive Legacy OSCE Questions?</DialogTitle>
              <DialogDescription>
                This will soft-delete ALL existing Practical/OSCE questions in the old format.
                They will be hidden from students and admin views. This action is logged in the audit trail.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setArchiveConfirmOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleArchiveLegacy}
                disabled={archiveLegacyOsce.isPending}
              >
                {archiveLegacyOsce.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Archive All Legacy OSCE
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

type SectionId = 'student' | 'curriculum' | 'ai-models' | 'diagnostics' | 'notifications';

const SECTION_DEFS: { id: SectionId; label: string; icon: React.ComponentType<{ className?: string }>; superAdminOnly?: boolean }[] = [
  { id: 'student',       label: 'Student Experience', icon: GraduationCap },
  { id: 'curriculum',    label: 'Curriculum',         icon: Layers,        superAdminOnly: true },
  { id: 'ai-models',     label: 'AI & Models',        icon: Brain },
  { id: 'diagnostics',   label: 'Diagnostics',        icon: Stethoscope,   superAdminOnly: true },
  { id: 'notifications', label: 'My Notifications',   icon: Mail },
];

export function PlatformSettingsTab() {
  const { isSuperAdmin } = useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const visibleSections = useMemo(
    () => SECTION_DEFS.filter((s) => !s.superAdminOnly || isSuperAdmin),
    [isSuperAdmin]
  );

  const urlSection = (searchParams.get('section') as SectionId | null) ?? null;
  const activeSection: SectionId =
    urlSection && visibleSections.some((s) => s.id === urlSection) ? urlSection : 'student';

  const setActiveSection = (id: SectionId) => {
    const next = new URLSearchParams(searchParams);
    next.set('section', id);
    // Preserve `tab` and any other params
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Left rail (desktop) / horizontal chips (mobile) */}
      <nav
        className="md:w-56 shrink-0 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0"
        aria-label="Settings sections"
      >
        {visibleSections.map((s) => {
          const Icon = s.icon;
          const active = s.id === activeSection;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={cn(
                'shrink-0 flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left',
                'whitespace-nowrap md:whitespace-normal',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{s.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Section content */}
      <div className="flex-1 min-w-0">
        {activeSection === 'student' && <StudentExperienceSection />}
        {activeSection === 'curriculum' && <CurriculumSection />}
        {activeSection === 'ai-models' && <AIAndModelsSection />}
        {activeSection === 'diagnostics' && <DiagnosticsSection />}
        {activeSection === 'notifications' && <NotificationsSection />}
      </div>
    </div>
  );
}

export { ArchiveLegacyOsceCard };
