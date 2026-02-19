import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { Concept } from '@/hooks/useConcepts';

interface SortableConceptItemProps {
  concept: Concept;
  editingConcept: Concept | null;
  editName: string;
  setEditName: (name: string) => void;
  handleUpdateConcept: () => void;
  setEditingConcept: (concept: Concept | null) => void;
  startEdit: (concept: Concept) => void;
  setDeletingConcept: (concept: Concept | null) => void;
  isUpdating: boolean;
}

export function SortableConceptItem({
  concept,
  editingConcept,
  editName,
  setEditName,
  handleUpdateConcept,
  setEditingConcept,
  startEdit,
  setDeletingConcept,
  isUpdating,
}: SortableConceptItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: concept.id });

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

      {editingConcept?.id === concept.id ? (
        <div className="flex-1 flex items-center gap-2">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-8"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUpdateConcept();
              if (e.key === 'Escape') {
                setEditingConcept(null);
                setEditName('');
              }
            }}
          />
          <Button size="sm" onClick={handleUpdateConcept} disabled={isUpdating}>
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditingConcept(null);
              setEditName('');
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <span className="flex-1 text-sm font-medium">{concept.title}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => startEdit(concept)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => setDeletingConcept(concept)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}
