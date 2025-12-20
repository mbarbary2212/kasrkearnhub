import { Edit2, Printer, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudyResource, TableContent } from '@/hooks/useStudyResources';
import { requestResourceDelete } from '@/components/content/ResourcesDeleteManager';

interface TableResourceViewProps {
  resources: StudyResource[];
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
}

export function TableResourceView({ resources, canManage, onEdit }: TableResourceViewProps) {
  if (resources.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tables available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {resources.map((resource) => (
        <TableCard
          key={resource.id}
          resource={resource}
          canManage={canManage}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}

interface TableCardProps {
  resource: StudyResource;
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
}

function TableCard({ resource, canManage, onEdit }: TableCardProps) {
  const content = resource.content as TableContent;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    requestResourceDelete('table', resource.id, resource.title);
  };

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const tableContent = resource.content as TableContent;
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${resource.title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h2 { margin-bottom: 16px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background: #f0f0f0; font-weight: 600; }
        </style>
      </head>
      <body>
        <h2>${resource.title}</h2>
        <table>
          <thead>
            <tr>${tableContent.headers?.map((h) => `<th>${h}</th>`).join('') || ''}</tr>
          </thead>
          <tbody>
            ${tableContent.rows?.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('') || ''}
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!content.headers || !content.rows) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 text-base font-semibold text-foreground">{resource.title}</div>
        <p className="text-sm text-muted-foreground">Invalid table data</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-base font-semibold text-foreground">{resource.title}</div>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={handlePrint}
            title="Print table"
          >
            <Printer className="w-3 h-3" />
          </Button>
          {canManage && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(resource);
                }}
              >
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              {content.headers.map((header, i) => (
                <th
                  key={i}
                  className="border border-border px-3 py-2 text-left text-sm font-semibold bg-muted"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {content.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-accent/30">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="border border-border px-3 py-2 text-sm">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
