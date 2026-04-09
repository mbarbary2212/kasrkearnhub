import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react';
import {
  useUpsertChapterBlueprintConfig,
  useDeleteChapterBlueprintConfig,
  INCLUSION_LEVELS,
  QUESTION_TYPE_OPTIONS,
  type InclusionLevel,
  type ChapterBlueprintConfig,
} from '@/hooks/useChapterBlueprintConfig';

interface Props {
  config: ChapterBlueprintConfig | undefined;
  chapterId: string;
  moduleId: string;
  sectionId: string | null;
  componentType: string;
  getLevelStyle: (level: string) => string;
  getLevelLabel: (level: string) => string;
}

export function BlueprintCellPopover({
  config,
  chapterId,
  moduleId,
  sectionId,
  componentType,
  getLevelStyle,
  getLevelLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const upsert = useUpsertChapterBlueprintConfig();
  const remove = useDeleteChapterBlueprintConfig();

  useEffect(() => {
    if (open) {
      setSelectedTypes(config?.question_types ?? []);
    }
  }, [open, config?.question_types]);

  const handleSelect = (level: InclusionLevel) => {
    upsert.mutate({
      chapter_id: chapterId,
      module_id: moduleId,
      section_id: sectionId,
      exam_type: 'written',
      component_type: componentType,
      inclusion_level: level,
      question_types: selectedTypes,
    });
    setOpen(false);
  };

  const handleClear = () => {
    if (config) {
      remove.mutate({ id: config.id, module_id: moduleId });
    }
    setOpen(false);
  };

  const toggleType = (value: string) => {
    setSelectedTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const saveTypesOnly = () => {
    if (config) {
      upsert.mutate({
        chapter_id: chapterId,
        module_id: moduleId,
        section_id: sectionId,
        exam_type: 'written',
        component_type: componentType,
        inclusion_level: config.inclusion_level,
        question_types: selectedTypes,
      });
    }
    setOpen(false);
  };

  const typesCount = config?.question_types?.length ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full h-full min-h-[32px] flex flex-col items-center justify-center gap-0.5 rounded transition-colors hover:bg-muted/50"
        >
          {config ? (
            <>
              <Badge variant="outline" className={`text-xs font-semibold px-2 py-0.5 cursor-pointer ${getLevelStyle(config.inclusion_level)}`}>
                {getLevelLabel(config.inclusion_level)}
              </Badge>
              {typesCount > 0 && (
                <span className="text-[10px] text-muted-foreground">{typesCount} type{typesCount !== 1 ? 's' : ''}</span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground/40 text-sm">—</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1.5" align="center" side="bottom">
        <div className="space-y-0.5">
          {/* Clear button at top when config exists */}
          {config && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/10 mb-0.5"
              onClick={handleClear}
            >
              <X className="h-3 w-3 mr-1.5" />
              Clear (set to —)
            </Button>
          )}

          {config && <div className="border-t my-1" />}

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
              <p className="text-[10px] font-medium text-muted-foreground px-1 pt-0.5">Question Formats</p>
              <ScrollArea className="h-[180px]">
                <div className="space-y-0.5 pr-2">
                  {QUESTION_TYPE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedTypes.includes(opt.value)}
                        onCheckedChange={() => toggleType(opt.value)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-xs leading-tight">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-7 mt-1"
                onClick={saveTypesOnly}
              >
                Save formats
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
