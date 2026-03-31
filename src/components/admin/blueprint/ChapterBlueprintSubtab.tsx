import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useModuleChapters } from '@/hooks/useChapters';
import {
  useChapterBlueprintConfigs,
  useUpsertChapterBlueprintConfig,
  useDeleteChapterBlueprintConfig,
  COMPONENT_COLUMNS,
  INCLUSION_LEVELS,
  type InclusionLevel,
  type ChapterBlueprintConfig,
} from '@/hooks/useChapterBlueprintConfig';

interface Props {
  years: { id: string; name: string }[];
  modules: { id: string; name: string; year_id: string }[];
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

function CellPopover({
  config,
  chapterId,
  moduleId,
  componentType,
}: {
  config: ChapterBlueprintConfig | undefined;
  chapterId: string;
  moduleId: string;
  componentType: string;
}) {
  const [open, setOpen] = useState(false);
  const upsert = useUpsertChapterBlueprintConfig();
  const remove = useDeleteChapterBlueprintConfig();

  const handleSelect = (level: InclusionLevel) => {
    upsert.mutate({
      chapter_id: chapterId,
      module_id: moduleId,
      exam_type: 'written',
      component_type: componentType,
      inclusion_level: level,
    });
    setOpen(false);
  };

  const handleClear = () => {
    if (config) {
      remove.mutate({ id: config.id, module_id: moduleId });
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full h-full min-h-[32px] flex items-center justify-center rounded transition-colors hover:bg-muted/50"
        >
          {config ? (
            <Badge variant="outline" className={`text-xs font-semibold px-2 py-0.5 cursor-pointer ${getLevelStyle(config.inclusion_level)}`}>
              {getLevelLabel(config.inclusion_level)}
            </Badge>
          ) : (
            <span className="text-muted-foreground/40 text-sm">—</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-1.5" align="center" side="bottom">
        <div className="space-y-0.5">
          {INCLUSION_LEVELS.map((l) => (
            <Button
              key={l.value}
              variant={config?.inclusion_level === l.value ? 'secondary' : 'ghost'}
              size="sm"
              className="w-full justify-start text-xs h-7"
              onClick={() => handleSelect(l.value)}
            >
              <Badge variant="outline" className={`mr-2 text-[10px] px-1.5 py-0 ${getLevelStyle(l.value)}`}>
                {getLevelLabel(l.value)}
              </Badge>
              {l.label}
            </Button>
          ))}
          {config && (
            <>
              <div className="border-t my-1" />
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs h-7 text-muted-foreground"
                onClick={handleClear}
              >
                Clear
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ChapterBlueprintSubtab({ years, modules }: Props) {
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');

  const filteredModules = selectedYearId ? modules.filter(m => m.year_id === selectedYearId) : modules;
  const { data: chapters = [], isLoading: chaptersLoading } = useModuleChapters(selectedModuleId || undefined);
  const { data: configs = [], isLoading: configsLoading } = useChapterBlueprintConfigs(selectedModuleId || undefined);

  const configMap = useMemo(() => {
    const map = new Map<string, ChapterBlueprintConfig>();
    for (const c of configs) {
      map.set(`${c.chapter_id}::${c.component_type}`, c);
    }
    return map;
  }, [configs]);

  const isLoading = chaptersLoading || configsLoading;

  return (
    <div className="space-y-4">
      {/* Selectors */}
      <div className="flex flex-wrap gap-3">
        <div className="w-48">
          <Label className="text-xs mb-1 block">Year</Label>
          <Select value={selectedYearId} onValueChange={(v) => { setSelectedYearId(v); setSelectedModuleId(''); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select year" /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <Label className="text-xs mb-1 block">Module</Label>
          <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select module" /></SelectTrigger>
            <SelectContent>
              {filteredModules.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

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
                {chapters.map((ch) => (
                  <tr key={ch.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="py-1.5 px-3 font-medium text-sm">
                      <span className="text-muted-foreground mr-1">Ch {ch.chapter_number}:</span>
                      {ch.title}
                    </td>
                    {COMPONENT_COLUMNS.map(col => (
                      <td key={col.key} className="py-1 px-1 text-center">
                        <CellPopover
                          config={configMap.get(`${ch.id}::${col.key}`)}
                          chapterId={ch.id}
                          moduleId={selectedModuleId}
                          componentType={col.key}
                        />
                      </td>
                    ))}
                  </tr>
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
