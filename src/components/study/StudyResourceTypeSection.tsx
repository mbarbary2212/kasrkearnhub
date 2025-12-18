import { useState } from 'react';
import { Trash2, Edit2, GripVertical, ChevronDown, ChevronRight, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  useDeleteStudyResource,
} from '@/hooks/useStudyResources';
import { toast } from 'sonner';

interface StudyResourceTypeSectionProps {
  resources: StudyResource[];
  resourceType: StudyResourceType;
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
  chapterId: string;
}

export function StudyResourceTypeSection({
  resources,
  resourceType,
  canManage = false,
  onEdit,
  chapterId,
}: StudyResourceTypeSectionProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const deleteResource = useDeleteStudyResource();

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

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteResource.mutateAsync({ id: deleteId, chapterId });
      toast.success('Resource deleted');
      setDeleteId(null);
    } catch (error) {
      toast.error('Failed to delete resource');
    }
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

  if (resources.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No items yet. {canManage && 'Add your first item above.'}
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {resources.map((resource) => (
          <Collapsible
            key={resource.id}
            open={expandedItems.has(resource.id)}
            onOpenChange={() => toggleExpanded(resource.id)}
          >
            <Card className="overflow-hidden">
              <CollapsibleTrigger asChild>
                <CardHeader className="py-3 px-4 cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {canManage && (
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    )}
                    {expandedItems.has(resource.id) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-sm font-medium flex-1">
                      {resource.title}
                    </CardTitle>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handlePrint(resource)}
                      >
                        <Printer className="w-3 h-3" />
                      </Button>
                      {canManage && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => onEdit?.(resource)}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(resource.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
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
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this resource? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
