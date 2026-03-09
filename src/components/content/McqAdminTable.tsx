import { Badge } from '@/components/ui/badge';
import { ContentAdminTable, ColumnConfig } from '@/components/admin/ContentAdminTable';
import type { Mcq } from '@/hooks/useMcqs';
import type { Section } from '@/hooks/useSections';

interface McqAdminTableProps {
  mcqs: Mcq[];
  sections?: Section[];
  chapterId?: string;
  topicId?: string;
  moduleId: string;
  onEdit: (mcq: Mcq) => void;
  onDelete: (mcq: Mcq) => void;
}

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  hard: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function McqAdminTable({
  mcqs,
  sections = [],
  chapterId,
  topicId,
  moduleId,
  onEdit,
  onDelete,
}: McqAdminTableProps) {
  const columns: ColumnConfig<Mcq>[] = [
    {
      key: 'select',
      header: '',
      className: 'w-10',
    },
    {
      key: 'stem',
      header: 'Question',
      render: (mcq) => (
        <span className="line-clamp-2 max-w-[300px] text-sm">{mcq.stem}</span>
      ),
    },
    {
      key: 'format',
      header: 'Format',
      className: 'w-20',
      render: (mcq) => (
        <Badge 
          variant="outline" 
          className={mcq.question_format === 'sba' 
            ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700'
            : 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700'
          }
        >
          {mcq.question_format === 'sba' ? 'SBA' : 'MCQ'}
        </Badge>
      ),
    },
    {
      key: 'difficulty',
      header: 'Difficulty',
      className: 'w-24',
      render: (mcq) => (
        <Badge variant="outline" className={difficultyColors[mcq.difficulty || 'medium']}>
          {mcq.difficulty || 'medium'}
        </Badge>
      ),
    },
    {
      key: 'section',
      header: 'Section',
      className: 'w-40',
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
    },
  ];

  return (
    <ContentAdminTable
      data={mcqs}
      columns={columns}
      contentTable="mcqs"
      chapterId={chapterId}
      topicId={topicId}
      moduleId={moduleId}
      sections={sections}
      onEdit={onEdit}
      onDelete={onDelete}
      csvExportConfig={{
        filename: 'mcqs-export',
        columns: [
          { key: 'stem', header: 'Stem' },
          { key: 'correct_key', header: 'Correct Key' },
          { key: 'difficulty', header: 'Difficulty' },
          { key: 'explanation', header: 'Explanation' },
          { 
            key: 'section_name', 
            header: 'Section',
            getValue: (item, sectionsList) => {
              const section = sectionsList?.find(s => s.id === item.section_id);
              return section?.name || '';
            }
          },
        ],
      }}
    />
  );
}
