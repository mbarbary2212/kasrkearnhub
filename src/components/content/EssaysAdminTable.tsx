import { useMemo } from 'react';
import { Check, X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ContentAdminTable, type ColumnConfig } from '@/components/admin/ContentAdminTable';
import { useChapterSections } from '@/hooks/useSections';
import { ESSAY_EXPORT_COLUMNS } from '@/lib/csvExport';
import { Badge } from '@/components/ui/badge';
import { needsRubricUpgrade, hasStructuredRubric } from '@/types/essayRubric';

interface Essay {
  id: string;
  title: string;
  question: string;
  model_answer?: string | null;
  rating?: number | null;
  is_deleted?: boolean;
  section_id?: string | null;
  question_type?: string | null;
  max_points?: number | null;
  difficulty_level?: string | null;
  rubric_json?: unknown | null;
}

interface EssaysAdminTableProps {
  essays: Essay[];
  chapterId?: string;
  moduleId?: string;
  onEdit?: (essay: Essay) => void;
  onDelete?: (essay: Essay) => void;
}

export function EssaysAdminTable({
  essays,
  chapterId,
  moduleId,
  onEdit,
  onDelete,
}: EssaysAdminTableProps) {
  const { data: sections = [] } = useChapterSections(chapterId);

  const columns: ColumnConfig<Essay>[] = useMemo(() => [
    {
      key: 'select',
      header: '',
      className: 'w-10',
    },
    {
      key: 'title',
      header: 'Title',
      className: 'font-medium max-w-[150px]',
      render: (item) => (
        <span className="truncate block" title={item.title}>
          {item.title}
        </span>
      ),
    },
    {
      key: 'question',
      header: 'Question',
      render: (item) => (
        <span className="text-sm line-clamp-2 max-w-[300px] text-muted-foreground" title={item.question}>
          {item.question}
        </span>
      ),
    },
    {
      key: 'model_answer' as keyof Essay,
      header: 'Has Answer',
      className: 'w-24 text-center',
      render: (item) => (
        item.model_answer ? (
          <Check className="h-4 w-4 text-primary mx-auto" />
        ) : (
          <X className="h-4 w-4 text-muted-foreground mx-auto" />
        )
      ),
    },
    {
      key: 'question_type' as keyof Essay,
      header: 'Type',
      className: 'w-24',
      render: (item) => (
        <span className="text-sm text-muted-foreground">{item.question_type || 'Essay'}</span>
      ),
    },
    {
      key: 'max_points' as keyof Essay,
      header: 'Points',
      className: 'w-20 text-center',
      render: (item) => (
        <span className="text-sm text-muted-foreground">{item.max_points != null ? item.max_points : '—'}</span>
      ),
    },
    {
      key: 'difficulty_level' as keyof Essay,
      header: 'Difficulty',
      className: 'w-28',
      render: (item) => (
        <span className="text-sm text-muted-foreground">{item.difficulty_level || '—'}</span>
      ),
    },
    {
      key: 'rubric_json' as keyof Essay,
      header: 'Rubric',
      className: 'w-32 text-center',
      render: (item) => {
        if (needsRubricUpgrade(item.rubric_json)) {
          return (
            <Badge variant="destructive" className="text-[10px] gap-1">
              <AlertTriangle className="h-3 w-3" />
              Upgrade
            </Badge>
          );
        }
        if (hasStructuredRubric(item.rubric_json)) {
          return (
            <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 border-emerald-300 bg-emerald-50">
              <ShieldCheck className="h-3 w-3" />
              v1
            </Badge>
          );
        }
        return <span className="text-xs text-muted-foreground">None</span>;
      },
    },
    {
      key: 'section',
      header: 'Section',
      className: 'w-32',
    },
    {
      key: 'actions',
      header: '',
      className: 'w-20',
    },
  ], []);

  return (
    <ContentAdminTable
      data={essays}
      columns={columns}
      contentTable="essays"
      chapterId={chapterId}
      sections={sections}
      onEdit={onEdit}
      onDelete={onDelete}
      csvExportConfig={{
        filename: `essays-${chapterId || 'export'}`,
        columns: ESSAY_EXPORT_COLUMNS as any,
      }}
      emptyMessage="No short questions available"
    />
  );
}
