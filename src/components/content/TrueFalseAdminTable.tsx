import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { ContentAdminTable, ColumnConfig } from '@/components/admin/ContentAdminTable';
import type { TrueFalseQuestion } from '@/hooks/useTrueFalseQuestions';
import type { Section } from '@/hooks/useSections';

interface TrueFalseAdminTableProps {
  questions: TrueFalseQuestion[];
  sections?: Section[];
  chapterId?: string;
  topicId?: string;
  moduleId: string;
  onEdit: (question: TrueFalseQuestion) => void;
  onDelete: (question: TrueFalseQuestion) => void;
}

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  hard: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function TrueFalseAdminTable({
  questions,
  sections = [],
  chapterId,
  topicId,
  moduleId,
  onEdit,
  onDelete,
}: TrueFalseAdminTableProps) {
  const columns: ColumnConfig<TrueFalseQuestion>[] = [
    {
      key: 'select',
      header: '',
      className: 'w-10',
    },
    {
      key: 'statement',
      header: 'Statement',
      render: (q) => (
        <span className="line-clamp-2 max-w-[300px] text-sm">{q.statement}</span>
      ),
    },
    {
      key: 'correct_answer' as keyof TrueFalseQuestion,
      header: 'Answer',
      className: 'w-20',
      render: (q) => (
        <Badge variant="outline" className={q.correct_answer ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}>
          {q.correct_answer ? (
            <><Check className="w-3 h-3 mr-1" /> True</>
          ) : (
            <><X className="w-3 h-3 mr-1" /> False</>
          )}
        </Badge>
      ),
    },
    {
      key: 'difficulty',
      header: 'Difficulty',
      className: 'w-24',
      render: (q) => (
        <Badge variant="outline" className={difficultyColors[q.difficulty || 'medium']}>
          {q.difficulty || 'medium'}
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
      data={questions}
      columns={columns}
      contentTable="true_false_questions"
      chapterId={chapterId}
      topicId={topicId}
      moduleId={moduleId}
      sections={sections}
      onEdit={onEdit}
      onDelete={onDelete}
      csvExportConfig={{
        filename: 'true-false-questions-export',
        columns: [
          { key: 'statement', header: 'Statement' },
          { 
            key: 'correct_answer', 
            header: 'Correct Answer',
            getValue: (item) => item.correct_answer ? 'True' : 'False'
          },
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
