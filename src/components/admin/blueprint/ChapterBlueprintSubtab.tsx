import { useState, useMemo, useCallback, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronRight, ChevronDown, Download, Upload } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useChapterBlueprintConfigs,
  COMPONENT_COLUMNS,
  configKey,
  type ChapterBlueprintConfig,
} from '@/hooks/useChapterBlueprintConfig';
import { useMergedModuleConfig, expandModuleIds } from '@/hooks/useMergedModuleConfig';
import { BlueprintCellPopover } from './BlueprintCellPopover';
import { exportBlueprintToExcel } from './blueprintExcelExport';
import { importBlueprintFromExcel } from './blueprintExcelImport';
import { useChapterSections } from '@/hooks/useSections';

interface Props {
  years: { id: string; name: string }[];
  modules: { id: string; name: string; year_id: string }[];
}

/**
 * Get the effective module ID for blueprint configs.
 * When merged mode is ON and selectedId is the host (e.g. 523),
 * blueprint configs come from the first guest (e.g. 423).
 */
function getEffectiveBlueprintModule(
  selectedModuleId: string,
  mergedConfig: ReturnType<typeof useMergedModuleConfig>['data']
): string {
  if (!mergedConfig?.enabled) return selectedModuleId;
  const guests = mergedConfig.chapterMerge[selectedModuleId];
  if (guests && guests.length > 0) return guests[0]; // use guest (423) as blueprint source
  return selectedModuleId;
}

/** Fetch chapters for multiple module IDs */
function useMultiModuleChapters(moduleIds: string[]) {
  return useQuery({
    queryKey: ['multi-module-chapters', ...moduleIds],
    queryFn: async () => {
      if (moduleIds.length === 0) return [];
      const { data, error } = await supabase
        .from('module_chapters')
        .select('*')
        .in('module_id', moduleIds)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data as { id: string; module_id: string; chapter_number: number; title: string; order_index: number }[];
    },
    enabled: moduleIds.length > 0,
  });
}

function getLevelStyle(level: string) {
  switch (level) {
    case 'high':
      return 'bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25';
    case 'average':
      return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/25';
    case 'low':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25';
    default:
      return '';
  }
}

function getLevelLabel(level: string) {
  switch (level) {
    case 'high': return 'H';
    case 'average': return 'A';
    case 'low': return 'L';
    default: return '—';
  }
}

/** Section sub-rows for a single chapter */
function ChapterSectionRows({
  chapterId,
  moduleId,
  configMap,
}: {
  chapterId: string;
  moduleId: string;
  configMap: Map<string, ChapterBlueprintConfig>;
}) {
  const { data: sections = [], isLoading } = useChapterSections(chapterId);

  if (isLoading) {
    return (
      <tr>
        <td colSpan={COMPONENT_COLUMNS.length + 1} className="py-2 px-6 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> Loading sections…
        </td>
      </tr>
    );
  }

  if (sections.length === 0) {
    return (
      <tr>
        <td colSpan={COMPONENT_COLUMNS.length + 1} className="py-1.5 px-6 text-xs text-muted-foreground italic">
          No sections for this chapter
        </td>
      </tr>
    );
  }

  return (
    <>
      {sections.map((sec) => (
        <tr key={sec.id} className="border-b bg-muted/10 hover:bg-muted/20 transition-colors">
          <td className="py-1.5 px-3 text-sm pl-8">
            <span className="text-muted-foreground mr-1">→</span>
            {sec.section_number ? `${sec.section_number}. ` : ''}{sec.name}
          </td>
          {COMPONENT_COLUMNS.map(col => (
            <td key={col.key} className="py-1 px-1 text-center">
              <BlueprintCellPopover
                config={configMap.get(configKey(chapterId, sec.id, col.key))}
                chapterId={chapterId}
                moduleId={moduleId}
                sectionId={sec.id}
                componentType={col.key}
                getLevelStyle={getLevelStyle}
                getLevelLabel={getLevelLabel}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function ChapterBlueprintSubtab({ years, modules }: Props) {
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: mergedConfig } = useMergedModuleConfig();

  // Filter hidden modules from dropdown
  const filteredModules = useMemo(() => {
    let mods = selectedYearId ? modules.filter(m => m.year_id === selectedYearId) : modules;
    if (mergedConfig?.enabled && mergedConfig.hiddenModules.length > 0) {
      mods = mods.filter(m => !mergedConfig.hiddenModules.includes(m.id));
    }
    return mods;
  }, [selectedYearId, modules, mergedConfig]);

  const selectedModuleName = modules.find(m => m.id === selectedModuleId)?.name ?? 'Blueprint';

  // Expand module IDs for merged view
  const effectiveModuleIds = useMemo(
    () => selectedModuleId ? expandModuleIds([selectedModuleId], mergedConfig) : [],
    [selectedModuleId, mergedConfig]
  );

  // Effective blueprint module (for config loading)
  const blueprintModuleId = useMemo(
    () => selectedModuleId ? getEffectiveBlueprintModule(selectedModuleId, mergedConfig) : '',
    [selectedModuleId, mergedConfig]
  );

  // Fetch chapters for all effective modules
  const { data: chapters = [], isLoading: chaptersLoading } = useMultiModuleChapters(effectiveModuleIds);

  // Load configs for the blueprint source module
  const configModuleIds = useMemo(() => {
    const ids = new Set(effectiveModuleIds);
    if (blueprintModuleId) ids.add(blueprintModuleId);
    return Array.from(ids);
  }, [effectiveModuleIds, blueprintModuleId]);

  // Fetch configs for all relevant modules
  const { data: configs = [], isLoading: configsLoading } = useQuery({
    queryKey: ['chapter-blueprint-config-multi', ...configModuleIds],
    queryFn: async () => {
      if (configModuleIds.length === 0) return [];
      const { data, error } = await supabase
        .from('chapter_blueprint_config')
        .select('*')
        .in('module_id', configModuleIds);
      if (error) throw error;
      return data as ChapterBlueprintConfig[];
    },
    enabled: configModuleIds.length > 0,
  });

  const cfgMap = useMemo(() => {
    const map = new Map<string, ChapterBlueprintConfig>();
    for (const c of configs) {
      map.set(configKey(c.chapter_id, c.section_id, c.component_type), c);
    }
    return map;
  }, [configs]);

  // Group chapters by module for display
  const groupedChapters = useMemo(() => {
    if (effectiveModuleIds.length <= 1) return [{ moduleId: selectedModuleId, moduleName: '', chapters }];
    const groups: { moduleId: string; moduleName: string; chapters: typeof chapters }[] = [];
    for (const modId of effectiveModuleIds) {
      const mod = modules.find(m => m.id === modId);
      const modChapters = chapters.filter(ch => ch.module_id === modId);
      if (modChapters.length > 0) {
        // Use display name from merged config if available
        const displayName = mergedConfig?.display?.[modId]?.displayName ?? mod?.name ?? modId;
        groups.push({ moduleId: modId, moduleName: displayName, chapters: modChapters });
      }
    }
    return groups;
  }, [chapters, effectiveModuleIds, modules, mergedConfig, selectedModuleId]);

  const toggleChapter = useCallback((chId: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(chId)) next.delete(chId); else next.add(chId);
      return next;
    });
  }, []);

  const handleDownload = useCallback(() => {
    exportBlueprintToExcel(chapters, configs, selectedModuleName);
  }, [chapters, configs, selectedModuleName]);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';
    setPendingFile(file);
    setShowImportDialog(true);
  }, []);

  const executeImport = useCallback(async (replaceAll: boolean) => {
    if (!pendingFile) return;
    setShowImportDialog(false);
    setImporting(true);
    try {
      const buffer = await pendingFile.arrayBuffer();
      const result = await importBlueprintFromExcel(buffer, chapters, 'default', replaceAll);
      queryClient.invalidateQueries({ queryKey: ['chapter-blueprint-config'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-blueprint-config-multi'] });

      const parts = [
        replaceAll && result.replaced > 0 ? `${result.replaced} old entries removed` : '',
        `${result.upserted} imported`,
        result.cleared > 0 ? `${result.cleared} cleared` : '',
      ].filter(Boolean).join(', ');

      if (result.errors.length > 0) {
        toast.warning(`Imported (${parts}) with ${result.errors.length} warning(s)`, {
          description: result.errors.slice(0, 3).join('; '),
          duration: 8000,
        });
      } else {
        toast.success(`Blueprint import complete: ${parts}`);
      }
    } catch (err: any) {
      toast.error('Import failed: ' + (err.message || 'Unknown error'));
    } finally {
      setImporting(false);
      setPendingFile(null);
    }
  }, [pendingFile, chapters, queryClient]);

  const isLoading = chaptersLoading || configsLoading;

  return (
    <div className="space-y-4">
      {/* Selectors */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-48">
          <Label className="text-xs mb-1 block">Year</Label>
          <Select value={selectedYearId} onValueChange={(v) => { setSelectedYearId(v); setSelectedModuleId(''); setExpandedChapters(new Set()); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select year" /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <Label className="text-xs mb-1 block">Module</Label>
          <Select value={selectedModuleId} onValueChange={(v) => { setSelectedModuleId(v); setExpandedChapters(new Set()); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select module" /></SelectTrigger>
            <SelectContent>
              {filteredModules.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {selectedModuleId && chapters.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Download Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload Excel
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        )}
      </div>

      {/* Merged module indicator */}
      {effectiveModuleIds.length > 1 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded px-3 py-1.5">
          <Badge variant="outline" className="text-[10px]">Merged</Badge>
          Showing chapters from {effectiveModuleIds.length} modules (merged curriculum mode)
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium">Legend:</span>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getLevelStyle('high')}`}>H</Badge>
        <span>High</span>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getLevelStyle('average')}`}>A</Badge>
        <span>Average</span>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getLevelStyle('low')}`}>L</Badge>
        <span>Low</span>
        <span className="text-muted-foreground/40">—</span>
        <span>Not applicable</span>
      </div>

      {/* Table */}
      {!selectedModuleId ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Select a year and module to configure chapter blueprints.</p>
      ) : isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : chapters.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No chapters found for this module.</p>
      ) : (
        <ScrollArea className="w-full">
          <div className="min-w-[600px]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground w-[200px]">Chapter</th>
                  {COMPONENT_COLUMNS.map(col => (
                    <th key={col.key} className="text-center py-2 px-2 font-medium text-muted-foreground w-[90px]">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupedChapters.map((group) => (
                  <>
                    {/* Module group header for merged view */}
                    {effectiveModuleIds.length > 1 && (
                      <tr key={`group-${group.moduleId}`} className="bg-muted/40 border-b">
                        <td colSpan={COMPONENT_COLUMNS.length + 1} className="py-1.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {group.moduleName}
                        </td>
                      </tr>
                    )}
                    {group.chapters.map((ch) => {
                      const isExpanded = expandedChapters.has(ch.id);
                      return (
                        <> 
                          <tr key={ch.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="py-1.5 px-3 font-medium text-sm">
                              <button
                                className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                                onClick={() => toggleChapter(ch.id)}
                              >
                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                <span className="text-muted-foreground mr-1">Ch {ch.chapter_number}:</span>
                                {ch.title}
                              </button>
                            </td>
                            {COMPONENT_COLUMNS.map(col => (
                              <td key={col.key} className="py-1 px-1 text-center">
                                <BlueprintCellPopover
                                  config={cfgMap.get(configKey(ch.id, null, col.key))}
                                  chapterId={ch.id}
                                  moduleId={ch.module_id}
                                  sectionId={null}
                                  componentType={col.key}
                                  getLevelStyle={getLevelStyle}
                                  getLevelLabel={getLevelLabel}
                                />
                              </td>
                            ))}
                          </tr>
                          {isExpanded && (
                            <ChapterSectionRows
                              chapterId={ch.id}
                              moduleId={ch.module_id}
                              configMap={cfgMap}
                            />
                          )}
                        </>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
}
