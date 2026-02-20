import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { ContentAdminTable, type ColumnConfig } from '@/components/admin/ContentAdminTable';
import { useChapterSections, useTopicSections } from '@/hooks/useSections';
import type { MatchingQuestion } from '@/hooks/useMatchingQuestions';

interface MatchingAdminTableProps {
  questions: MatchingQuestion[];
  chapterId?: string | null;
  topicId?: string | null;
  moduleId?: string;
  onEdit?: (question: MatchingQuestion) => void;
  onDelete?: (question: MatchingQuestion) => void;
}

export function MatchingAdminTable({
  questions,
  chapterId,
  topicId,
  moduleId,
  onEdit,
  onDelete,
}: MatchingAdminTableProps) {
  const { data: chapterSections = [] } = useChapterSections(chapterId ?? undefined);
  const { data: topicSections = [] } = useTopicSections(topicId ?? undefined);
  const sections = chapterId ? chapterSections : topicSections;

  const columns: ColumnConfig<MatchingQuestion>[] = useMemo(() => [
    {
      key: 'select',
      header: '',
      className: 'w-10',
    },
    {
      key: 'instruction',
      header: 'Instruction',
      render: (item) => (
        <span className="text-sm line-clamp-2 max-w-[300px]" title={item.instruction}>
          {item.instruction}
        </span>
      ),
    },
    {
      key: 'column_a_items' as keyof MatchingQuestion,
      header: 'Pairs',
      className: 'w-20 text-center',
      render: (item) => {
        const count = Array.isArray(item.column_a_items) ? item.column_a_items.length : 0;
        return (
          <Badge variant="secondary" className="text-xs">
            {count}
          </Badge>
        );
      },
    },
    {
      key: 'difficulty',
      header: 'Difficulty',
      className: 'w-24',
      render: (item) => {
        if (!item.difficulty) return <span className="text-muted-foreground">—</span>;
        const colorClass = {
          easy: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
          medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
          hard: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        }[item.difficulty] || '';
        return (
          <Badge variant="secondary" className={`text-xs capitalize ${colorClass}`}>
            {item.difficulty}
          </Badge>
        );
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
      data={questions}
      columns={columns}
      contentTable="matching_questions"
      chapterId={chapterId ?? undefined}
      topicId={topicId ?? undefined}
      sections={sections}
      onEdit={onEdit}
      onDelete={onDelete}
      emptyMessage="No matching questions available"
    />
  );
}
