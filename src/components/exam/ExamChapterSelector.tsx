import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ModuleChapter } from '@/hooks/useChapters';

interface ExamChapterSelectorProps {
  chapters: ModuleChapter[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function ExamChapterSelector({ chapters, selectedIds, onChange }: ExamChapterSelectorProps) {
  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((c) => c !== id)
        : [...selectedIds, id]
    );
  };

  const allSelected = chapters.length > 0 && selectedIds.length === chapters.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Checkbox
          id="select-all-chapters"
          checked={allSelected}
          onCheckedChange={() =>
            onChange(allSelected ? [] : chapters.map((c) => c.id))
          }
        />
        <Label htmlFor="select-all-chapters" className="text-xs font-medium">
          {allSelected ? 'Deselect All' : 'Select All'}
        </Label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
        {chapters.map((ch) => (
          <div key={ch.id} className="flex items-center gap-2">
            <Checkbox
              id={`ch-${ch.id}`}
              checked={selectedIds.includes(ch.id)}
              onCheckedChange={() => toggle(ch.id)}
            />
            <Label htmlFor={`ch-${ch.id}`} className="text-xs truncate">
              {ch.title}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
