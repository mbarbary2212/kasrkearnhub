import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookMarked, Volume2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { ManageModelsPanel } from '@/components/admin/ManageModelsPanel';
import { AISettingsPanel } from '@/components/admin/AISettingsPanel';
import { ExaminerAvatarsCard } from '@/components/admin/ExaminerAvatarsCard';

type SubSectionId = 'models' | 'cases' | 'bindings';

const SUB_SECTIONS: { id: SubSectionId; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { id: 'models',   label: 'Models',             icon: BookMarked, description: 'Catalog of available models' },
  { id: 'cases',    label: 'Interactive Cases',  icon: Volume2,    description: 'Live playback, STT, TTS & avatars' },
  { id: 'bindings', label: 'Feature Bindings',   icon: Sparkles,   description: 'Provider & model per content type' },
];

export function AIAndModelsSection() {
  const { isSuperAdmin } = useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlSub = searchParams.get('subsection') as SubSectionId | null;
  const activeSub: SubSectionId =
    urlSub && SUB_SECTIONS.some((s) => s.id === urlSub) ? urlSub : 'models';

  const setActiveSub = (id: SubSectionId) => {
    const next = new URLSearchParams(searchParams);
    next.set('subsection', id);
    setSearchParams(next, { replace: true });
  };

  // Non-super-admins only see Interactive Cases (avatars portion is open to them via ExaminerAvatarsCard).
  const visible = useMemo(
    () => (isSuperAdmin ? SUB_SECTIONS : SUB_SECTIONS.filter((s) => s.id === 'cases')),
    [isSuperAdmin]
  );
  const resolvedActive: SubSectionId = visible.some((s) => s.id === activeSub) ? activeSub : visible[0].id;

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Left rail (desktop) / horizontal chips (mobile) */}
      <nav
        className="md:w-52 shrink-0 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0"
        aria-label="AI & Models sections"
      >
        {visible.map((s) => {
          const Icon = s.icon;
          const active = s.id === resolvedActive;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSub(s.id)}
              className={cn(
                'shrink-0 flex items-start gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left',
                'whitespace-nowrap md:whitespace-normal',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex flex-col">
                <span>{s.label}</span>
                <span className={cn('text-[11px] hidden md:block', active ? 'text-primary/70' : 'text-muted-foreground/70')}>
                  {s.description}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* Section content */}
      <div className="flex-1 min-w-0 space-y-4">
        {resolvedActive === 'models' && isSuperAdmin && <ManageModelsPanel />}

        {resolvedActive === 'cases' && (
          <>
            {isSuperAdmin && (
              <AISettingsPanel
                interactiveCasesOnly
                key="cases-only"
              />
            )}
            <ExaminerAvatarsCard />
          </>
        )}

        {resolvedActive === 'bindings' && isSuperAdmin && (
          <AISettingsPanel
            bindingsOnly
            showRules={false}
          />
        )}
      </div>
    </div>
  );
}