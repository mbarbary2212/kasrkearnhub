import { useState } from 'react';
import { Trash2, Edit2, GripVertical, ChevronDown, ChevronRight, Printer } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  StudyResource,
  StudyResourceType,
  FlashcardContent,
  TableContent,
  AlgorithmContent,
  ExamTipContent,
  KeyImageContent,
  useReorderStudyResources,
} from '@/hooks/useStudyResources';
import { requestResourceDelete, ResourceKind } from '@/components/content/ResourcesDeleteManager';
import { toast } from 'sonner';

interface StudyResourceTypeSectionProps {
  resources: StudyResource[];
  resourceType: StudyResourceType;
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
  chapterId?: string;
  topicId?: string;
}

// Map study resource type to delete manager resource kind
const typeToKind: Record<StudyResourceType, ResourceKind> = {
  flashcard: 'flashcard',
  table: 'table',
  algorithm: 'algorithm',
  exam_tip: 'exam_tip',
  key_image: 'key_image',
  mind_map: 'mind_map',
  infographic: 'mind_map' as ResourceKind,
  clinical_case_worked: 'clinical_case_worked',
  guided_explanation: 'guided_explanation' as ResourceKind,
};

export function StudyResourceTypeSection({
  resources,
  resourceType,
  canManage = false,
  onEdit,
  chapterId,
}: StudyResourceTypeSectionProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [localResources, setLocalResources] = useState<StudyResource[]>(resources);
  const reorderResources = useReorderStudyResources();

  // Sync local state when props change
  if (JSON.stringify(resources.map(r => r.id)) !== JSON.stringify(localResources.map(r => r.id))) {
    setLocalResources(resources);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDelete = (resource: StudyResource) => {
    requestResourceDelete(typeToKind[resourceType], resource.id, resource.title);
  };

  const handlePrint = (resource: StudyResource) => {
    const printContent = generatePrintContent(resource);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localResources.findIndex((r) => r.id === active.id);
      const newIndex = localResources.findIndex((r) => r.id === over.id);

      const newOrder = arrayMove(localResources, oldIndex, newIndex);
      setLocalResources(newOrder);

      // Save new order to database
      const reorderData = newOrder.map((r, index) => ({
        id: r.id,
        display_order: index,
      }));

      try {
        await reorderResources.mutateAsync({ resources: reorderData, chapterId });
        toast.success('Order updated');
      } catch (error) {
        // Revert on error
        setLocalResources(resources);
        toast.error('Failed to update order');
      }
    }
  };

  if (resources.length === 0) {
    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={localResources.map((r) => r.id)}
        strategy={verticalListSortingStrategy}
        disabled={!canManage}
      >
        <div className="space-y-2">
          {localResources.map((resource) => (
            <SortableResourceItem
              key={resource.id}
              resource={resource}
              resourceType={resourceType}
              canManage={canManage}
              isExpanded={expandedItems.has(resource.id)}
              onToggleExpand={() => toggleExpanded(resource.id)}
              onEdit={() => onEdit?.(resource)}
              onDelete={() => handleDelete(resource)}
              onPrint={() => handlePrint(resource)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface SortableResourceItemProps {
  resource: StudyResource;
  resourceType: StudyResourceType;
  canManage: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPrint: () => void;
}

function SortableResourceItem({
  resource,
  resourceType,
  canManage,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onPrint,
}: SortableResourceItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: resource.id, disabled: !canManage });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <Card className={`overflow-hidden ${isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-3">
              {canManage && (
                <div
                  className="cursor-grab active:cursor-grabbing touch-none p-1 -m-1 hover:bg-accent rounded"
                  {...attributes}
                  {...listeners}
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-accent/50 -my-3 -mr-4 py-3 pr-4 rounded-r transition-colors">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <CardTitle className="text-sm font-medium flex-1">
                    {resource.title}
                  </CardTitle>
                </div>
              </CollapsibleTrigger>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={onPrint}
                >
                  <Printer className="w-3 h-3" />
                </Button>
                {canManage && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={onEdit}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={onDelete}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 px-4">
              <ResourceContentRenderer
                resource={resource}
                resourceType={resourceType}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

function ResourceContentRenderer({
  resource,
  resourceType,
}: {
  resource: StudyResource;
  resourceType: StudyResourceType;
}) {
  switch (resourceType) {
    case 'flashcard':
      return <FlashcardRenderer content={resource.content as FlashcardContent} />;
    case 'table':
      return <TableRenderer content={resource.content as TableContent} />;
    case 'algorithm':
      return <AlgorithmRenderer content={resource.content as AlgorithmContent} />;
    case 'exam_tip':
      return <ExamTipRenderer content={resource.content as ExamTipContent} />;
    case 'key_image':
      return <KeyImageRenderer content={resource.content as KeyImageContent} />;
    default:
      return <pre className="text-xs">{JSON.stringify(resource.content, null, 2)}</pre>;
  }
}

function FlashcardRenderer({ content }: { content: FlashcardContent }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="min-h-[120px] flex items-center justify-center p-4 bg-accent/30 rounded-lg cursor-pointer transition-all"
      onClick={() => setFlipped(!flipped)}
    >
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-1">{flipped ? 'Answer' : 'Question'}</p>
        <p className="font-medium">{flipped ? content.back : content.front}</p>
        <p className="text-xs text-muted-foreground mt-2">Click to flip</p>
      </div>
    </div>
  );
}

function TableRenderer({ content }: { content: TableContent }) {
  if (!content.headers || !content.rows) {
    return <p className="text-sm text-muted-foreground">Invalid table data</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted">
            {content.headers.map((header, i) => (
              <th key={i} className="border p-2 text-left font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {content.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-accent/30">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border p-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AlgorithmRenderer({ content }: { content: AlgorithmContent }) {
  if (!content.steps) {
    return <p className="text-sm text-muted-foreground">Invalid algorithm data</p>;
  }

  return (
    <div className="space-y-3">
      {content.steps.map((step, index) => (
        <div key={index} className="flex gap-3">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
            {index + 1}
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">{step.title}</p>
            {step.description && (
              <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ExamTipRenderer({ content }: { content: ExamTipContent }) {
  if (!content.tips) {
    return <p className="text-sm text-muted-foreground">Invalid exam tips data</p>;
  }

  return (
    <ul className="space-y-2">
      {content.tips.map((tip, index) => (
        <li key={index} className="flex gap-2 text-sm">
          <span className="text-primary">•</span>
          <span>{tip}</span>
        </li>
      ))}
    </ul>
  );
}

function KeyImageRenderer({ content }: { content: KeyImageContent }) {
  return (
    <div className="space-y-2">
      <div className="rounded-lg overflow-hidden bg-muted">
        <img
          src={content.imageUrl}
          alt={content.caption}
          className="w-full max-h-[400px] object-contain"
        />
      </div>
      <p className="text-sm text-center text-muted-foreground">{content.caption}</p>
      {content.labels && content.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center">
          {content.labels.map((label, i) => (
            <span key={i} className="text-xs bg-accent px-2 py-0.5 rounded">
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function generatePrintContent(resource: StudyResource): string {
  const content = resource.content;
  let body = '';

  switch (resource.resource_type) {
    case 'flashcard': {
      const fc = content as FlashcardContent;
      body = `
        <div class="flashcard">
          <h3>Question:</h3>
          <p>${fc.front}</p>
          <h3>Answer:</h3>
          <p>${fc.back}</p>
        </div>
      `;
      break;
    }
    case 'table': {
      const tc = content as TableContent;
      body = `
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%">
          <thead>
            <tr>${tc.headers?.map((h) => `<th style="background:#f0f0f0">${h}</th>`).join('') || ''}</tr>
          </thead>
          <tbody>
            ${tc.rows?.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('') || ''}
          </tbody>
        </table>
      `;
      break;
    }
    case 'algorithm': {
      const ac = content as AlgorithmContent;
      body = `
        <ol>
          ${ac.steps?.map((s) => `<li><strong>${s.title}</strong><br/>${s.description || ''}</li>`).join('') || ''}
        </ol>
      `;
      break;
    }
    case 'exam_tip': {
      const et = content as ExamTipContent;
      body = `
        <ul>
          ${et.tips?.map((t) => `<li>${t}</li>`).join('') || ''}
        </ul>
      `;
      break;
    }
    case 'key_image': {
      const ki = content as KeyImageContent;
      body = `
        <div style="text-align:center">
          <img src="${ki.imageUrl}" style="max-width:100%;max-height:600px" />
          <p><em>${ki.caption}</em></p>
        </div>
      `;
      break;
    }
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${resource.title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h2 { margin-bottom: 16px; }
      </style>
    </head>
    <body>
      <h2>${resource.title}</h2>
      ${body}
    </body>
    </html>
  `;
}
