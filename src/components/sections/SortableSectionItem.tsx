import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { Section } from '@/hooks/useSections';

interface SortableSectionItemProps {
  section: Section;
  editingSection: Section | null;
  editName: string;
  setEditName: (name: string) => void;
  handleUpdateSection: () => void;
  setEditingSection: (section: Section | null) => void;
  startEdit: (section: Section) => void;
  setDeletingSection: (section: Section | null) => void;
  isUpdating: boolean;
}

export function SortableSectionItem({
  section,
  editingSection,
  editName,
  setEditName,
  handleUpdateSection,
  setEditingSection,
  startEdit,
  setDeletingSection,
  isUpdating,
}: SortableSectionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 rounded-md border bg-muted/30"
    >
      <GripVertical
        className="h-4 w-4 text-muted-foreground cursor-grab touch-none"
        {...attributes}
        {...listeners}
      />

      {editingSection?.id === section.id ? (
        <div className="flex-1 flex items-center gap-2">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-8"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUpdateSection();
              if (e.key === 'Escape') {
                setEditingSection(null);
                setEditName('');
              }
            }}
          />
          <Button
            size="sm"
            onClick={handleUpdateSection}
            disabled={isUpdating}
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditingSection(null);
              setEditName('');
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <span className="flex-1 text-sm font-medium">{section.name}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => startEdit(section)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => setDeletingSection(section)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}
