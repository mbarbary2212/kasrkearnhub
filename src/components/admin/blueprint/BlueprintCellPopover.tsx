import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  useUpsertChapterBlueprintConfig,
  useDeleteChapterBlueprintConfig,
  INCLUSION_LEVELS,
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
  const upsert = useUpsertChapterBlueprintConfig();
  const remove = useDeleteChapterBlueprintConfig();

  const handleSelect = (level: InclusionLevel) => {
    upsert.mutate({
      chapter_id: chapterId,
      module_id: moduleId,
      section_id: sectionId,
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
