import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useYears } from '@/hooks/useYears';
import { useAllModulesWithPermissions } from '@/hooks/useModuleAdmin';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, ChevronRight, Lock, Stethoscope, Pencil } from 'lucide-react';
import { getModuleImage, getModuleGradient } from '@/lib/moduleImages';
import { cn } from '@/lib/utils';

export function AdminModuleBrowser() {
  const navigate = useNavigate();
  const { isSuperAdmin, isPlatformAdmin } = useAuthContext();
  const { data: years, isLoading: yearsLoading } = useYears();
  const { data: permData, isLoading: modulesLoading } = useAllModulesWithPermissions();
  const [selectedYearId, setSelectedYearId] = useState<string>('');

  const isLoading = yearsLoading || modulesLoading;
  const modules = permData?.modules ?? [];
  const editableIds = permData?.editableIds ?? new Set<string>();
  const isFullAccess = isSuperAdmin || isPlatformAdmin;

  useMemo(() => {
    if (years?.length && !selectedYearId) {
      setSelectedYearId(years[0].id);
    }
  }, [years, selectedYearId]);

  const selectedYear = years?.find(y => y.id === selectedYearId);
  const filteredModules = useMemo(() => {
    if (!selectedYearId) return modules;
    return modules.filter(m => m.year_id === selectedYearId);
  }, [modules, selectedYearId]);

  const sortedModules = useMemo(() => {
    const editable = filteredModules.filter(m => editableIds.has(m.id));
    const viewOnly = filteredModules.filter(m => !editableIds.has(m.id));
    const sort = (a: typeof modules[0], b: typeof modules[0]) =>
      (a.display_order ?? 0) - (b.display_order ?? 0) || a.name.localeCompare(b.name);
    return [...editable.sort(sort), ...viewOnly.sort(sort)];
  }, [filteredModules, editableIds]);

  const editableCountForYear = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of modules) {
      if (editableIds.has(m.id)) {
        map.set(m.year_id, (map.get(m.year_id) || 0) + 1);
      }
    }
    return map;
  }, [modules, editableIds]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="w-full aspect-[2.5]" />
              <div className="p-2 space-y-1"><Skeleton className="h-3.5 w-3/4" /></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BookOpen className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-heading font-bold">Your Modules</h2>
      </div>

      {/* Year Selector */}
      <div className="flex items-center gap-2">
        <Select value={selectedYearId} onValueChange={setSelectedYearId}>
          <SelectTrigger className="h-8 w-[160px] bg-background text-xs">
            <SelectValue placeholder="Select Year" />
          </SelectTrigger>
          <SelectContent>
            {years?.map((year) => {
              const count = editableCountForYear.get(year.id) || 0;
              return (
                <SelectItem key={year.id} value={year.id}>
                  <span className="flex items-center gap-2">
                    {year.name}
                    {!isFullAccess && count > 0 && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-1">
                        {count} yours
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {selectedYear && (
          <Badge variant="outline" className="text-xs h-6">
            {filteredModules.length} module{filteredModules.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Year accent bar */}
      {selectedYear?.color && (
        <div className="h-1 rounded-full" style={{ background: selectedYear.color }} />
      )}

      {/* Module Grid */}
      {sortedModules.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            <BookOpen className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No modules in this year.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {sortedModules.map((mod) => {
            const canEdit = editableIds.has(mod.id);
            const image = getModuleImage(mod.slug, mod.image_url);
            const gradient = getModuleGradient(mod.slug);

            return (
              <Card
                key={mod.id}
                className={cn(
                  "overflow-hidden cursor-pointer transition-all duration-300 group",
                  canEdit
                    ? "hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
                    : "opacity-55 hover:opacity-75"
                )}
                onClick={() => navigate(`/module/${mod.id}`)}
              >
                <AspectRatio ratio={16 / 9}>
                  {image ? (
                    <img
                      src={image}
                      alt={mod.name}
                      className={cn(
                        "w-full h-full object-cover transition-transform duration-300",
                        canEdit ? "group-hover:scale-105" : "grayscale"
                      )}
                    />
                  ) : (
                    <div className={cn('w-full h-full bg-gradient-to-br flex flex-col items-center justify-center relative', gradient)}>
                      <Stethoscope className="absolute bottom-2 right-2 w-8 h-8 text-white/10" />
                      <span className="text-xl font-heading font-bold text-white/80 tracking-wider">
                        {mod.slug?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  {!canEdit && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-white/70" />
                    </div>
                  )}
                  {canEdit && (
                    <div className="absolute top-1.5 right-1.5">
                      <Badge className="bg-primary/90 text-primary-foreground text-[9px] h-4 px-1 gap-0.5">
                        <Pencil className="w-2 h-2" />
                        Manage
                      </Badge>
                    </div>
                  )}
                </AspectRatio>
                <div className="p-2">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        "font-heading font-semibold truncate text-xs",
                        canEdit ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {mod.slug?.toUpperCase()} — {mod.name}
                      </p>
                      {!canEdit && (
                        <p className="text-[9px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Lock className="w-2 h-2" /> View only
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-0.5" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
