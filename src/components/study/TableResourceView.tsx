import { StudyResource, TableContent } from '@/hooks/useStudyResources';

interface TableResourceViewProps {
  resources: StudyResource[];
}

export function TableResourceView({ resources }: TableResourceViewProps) {
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
        <TableCard key={resource.id} resource={resource} />
      ))}
    </div>
  );
}

function TableCard({ resource }: { resource: StudyResource }) {
  const content = resource.content as TableContent;

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
      <div className="mb-3 text-base font-semibold text-foreground">{resource.title}</div>
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
