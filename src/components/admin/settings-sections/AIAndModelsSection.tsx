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
    <div className="flex flex-col gap-4">
      {/* Horizontal pill tabs at the top */}
      <nav
        className="flex gap-1 p-1 rounded-lg bg-muted/50 border w-fit max-w-full overflow-x-auto"
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
              title={s.description}
              className={cn(
                'shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                active
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="w-4 h-4" />
              {s.label}
            </button>
          );
        })}
      </nav>

      {/* Section content */}
      <div className="min-w-0 space-y-4">
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