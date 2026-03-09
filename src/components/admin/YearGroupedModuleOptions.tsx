import { SelectItem } from '@/components/ui/select';
import { useYears } from '@/hooks/useYears';

interface ModuleItem {
  id: string;
  name: string;
  slug?: string | null;
  year_id?: string | null;
  display_order?: number | null;
}

interface YearGroupedModuleOptionsProps {
  modules: ModuleItem[] | undefined;
  showSlug?: boolean;
}

export function YearGroupedModuleOptions({ modules, showSlug = true }: YearGroupedModuleOptionsProps) {
  const { data: years } = useYears();

  if (!years?.length || !modules?.length) {
    return (
      <>
        {modules?.map(m => (
          <SelectItem key={m.id} value={m.id}>
            {showSlug && m.slug ? `${m.slug.toUpperCase()}: ${m.name}` : m.name}
          </SelectItem>
        ))}
      </>
    );
  }

  return (
    <>
      {[...years]
        .sort((a, b) => a.number - b.number)
        .map(year => {
          const yearModules = modules
            .filter(m => m.year_id === year.id)
            .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
          if (!yearModules.length) return null;
          return (
            <div key={year.id}>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                {year.name}
              </div>
              {yearModules.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  {showSlug && m.slug ? `${m.slug.toUpperCase()}: ${m.name}` : m.name}
                </SelectItem>
              ))}
            </div>
          );
        })}
    </>
  );
}
