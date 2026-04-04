import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useAuthContext } from '@/contexts/AuthContext';
import { useYears } from '@/hooks/useYears';
import { useAllModulesWithPermissions } from '@/hooks/useModuleAdmin';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { BookOpen, ChevronRight, LayoutGrid, List, Lock, Stethoscope, Pencil } from 'lucide-react';
import { getModuleImage, getModuleGradient } from '@/lib/moduleImages';
import { cn } from '@/lib/utils';

export default function AdminLearningPage() {
  const navigate = useNavigate();
  const { isSuperAdmin, isPlatformAdmin } = useAuthContext();
  const { data: years, isLoading: yearsLoading } = useYears();
  const { data: permData, isLoading: modulesLoading } = useAllModulesWithPermissions();
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  const isLoading = yearsLoading || modulesLoading;
  const modules = permData?.modules ?? [];
  const editableIds = permData?.editableIds ?? new Set<string>();
  const isFullAccess = isSuperAdmin || isPlatformAdmin;

  // Set default year once loaded
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

  // Separate editable first, then view-only, both alphabetical
  const sortedModules = useMemo(() => {
    const editable = filteredModules.filter(m => editableIds.has(m.id));
    const viewOnly = filteredModules.filter(m => !editableIds.has(m.id));
    const sort = (a: typeof modules[0], b: typeof modules[0]) =>
      (a.display_order ?? 0) - (b.display_order ?? 0) || a.name.localeCompare(b.name);
    return [...editable.sort(sort), ...viewOnly.sort(sort)];
  }, [filteredModules, editableIds]);

  // Count editable modules per year for badges
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
      <MainLayout>
        <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="w-full aspect-[2.5]" />
                <div className="p-2 space-y-1"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-full" /></div>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-xl md:text-2xl font-heading font-bold">Content Management</h1>
            <p className="text-sm text-muted-foreground">
              {isFullAccess
                ? 'Browse and manage all modules'
                : 'Your modules are highlighted. Others are view-only.'}
            </p>
          </div>
        </div>

        {/* Year Selector + View Toggle */}
        <div className="flex items-center justify-between flex-wrap gap-2">
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
          <div className="flex items-center gap-1 border rounded-md p-0.5">
            <Button variant={viewMode === 'cards' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2 gap-1.5" onClick={() => setViewMode('cards')}>
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Cards</span>
            </Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2 gap-1.5" onClick={() => setViewMode('list')}>
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">List</span>
            </Button>
          </div>
        </div>

        {/* Year accent bar */}
        {selectedYear?.color && (
          <div
            className="h-1.5 rounded-full"
            style={{ background: selectedYear.color }}
          />
        )}

        {/* Module Grid / List */}
        {sortedModules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No modules in this year.</p>
            </CardContent>
          </Card>
        ) : viewMode === 'cards' ? (
          <div className={cn("grid gap-3 w-full",
            sortedModules.length <= 4 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
          )}>
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
                        <Stethoscope className="absolute bottom-3 right-3 w-10 h-10 text-white/10" />
                        <span className="text-2xl font-heading font-bold text-white/80 tracking-wider">
                          {mod.slug?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    {!canEdit && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Lock className="w-6 h-6 text-white/70" />
                      </div>
                    )}
                    {canEdit && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-primary/90 text-primary-foreground text-[10px] h-5 px-1.5 gap-1">
                          <Pencil className="w-2.5 h-2.5" />
                          Manage
                        </Badge>
                      </div>
                    )}
                  </AspectRatio>
                  <div className="p-2.5">
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "font-heading font-semibold truncate text-xs sm:text-sm",
                          canEdit ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {mod.slug?.toUpperCase()} — {mod.name}
                        </p>
                        {!canEdit && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Lock className="w-2.5 h-2.5" /> View only
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-0.5" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          /* List view */
          <div className="border rounded-lg divide-y">
            {sortedModules.map((mod) => {
              const canEdit = editableIds.has(mod.id);
              return (
                <div
                  key={mod.id}
                  className={cn(
                    "flex items-center gap-3 py-3 px-4 cursor-pointer transition-colors group",
                    canEdit ? "hover:bg-muted/50" : "opacity-55 hover:opacity-75"
                  )}
                  onClick={() => navigate(`/module/${mod.id}`)}
                >
                  {canEdit ? (
                    <Pencil className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={cn(
                    "text-xs font-mono font-semibold min-w-[4.5rem]",
                    canEdit ? "text-primary" : "text-muted-foreground"
                  )}>
                    {mod.slug?.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      "text-sm font-medium truncate block",
                      canEdit ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {mod.name}
                    </span>
                  </div>
                  {canEdit && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                      Manage
                    </Badge>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
