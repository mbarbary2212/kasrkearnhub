import { Badge } from '@/components/ui/badge';
import { Image } from 'lucide-react';
import { ContentAdminTable, ColumnConfig } from '@/components/admin/ContentAdminTable';
import type { OsceQuestion } from '@/hooks/useOsceQuestions';
import type { Section } from '@/hooks/useSections';
import { useChapterConcepts } from '@/hooks/useConcepts';

interface OsceAdminTableProps {
  questions: OsceQuestion[];
  sections?: Section[];
  chapterId?: string;
  topicId?: string;
  moduleId: string;
  onEdit: (question: OsceQuestion) => void;
  onDelete: (question: OsceQuestion) => void;
}

export function OsceAdminTable({
  questions,
  sections = [],
  chapterId,
  topicId,
  moduleId,
  onEdit,
  onDelete,
}: OsceAdminTableProps) {
  const { data: concepts = [] } = useChapterConcepts(chapterId);

  const columns: ColumnConfig<OsceQuestion>[] = [
    {
      key: 'select',
      header: '',
      className: 'w-10',
    },
    {
      key: 'history_text',
      header: 'History',
      render: (q) => (
        <span className="line-clamp-2 max-w-[300px] text-sm">
          {q.history_text || 'No history'}
        </span>
      ),
    },
    {
      key: 'image_url' as keyof OsceQuestion,
      header: 'Image',
      className: 'w-20',
      render: (q) => (
        q.image_url ? (
          <div className="w-12 h-12 rounded border overflow-hidden bg-muted">
            <img 
              src={q.image_url} 
              alt="OSCE" 
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center">
            <Image className="w-4 h-4 text-muted-foreground" />
          </div>
        )
      ),
    },
    {
      key: 'statement_1' as keyof OsceQuestion,
      header: 'Statements',
      className: 'w-20',
      render: (q) => {
        const count = [q.statement_1, q.statement_2, q.statement_3, q.statement_4, q.statement_5]
          .filter(Boolean).length;
        return <Badge variant="secondary">{count}</Badge>;
      },
    },
    {
      key: 'concept',
      header: 'Concept',
      className: 'w-32',
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
      contentTable="osce_questions"
      chapterId={chapterId}
      topicId={topicId}
      moduleId={moduleId}
      sections={sections}
      concepts={concepts}
      onEdit={onEdit}
      onDelete={onDelete}
      csvExportConfig={{
        filename: 'osce-questions-export',
        columns: [
          { key: 'history_text', header: 'History' },
          { key: 'statement_1', header: 'Statement 1' },
          { key: 'answer_1', header: 'Answer 1' },
          { key: 'statement_2', header: 'Statement 2' },
          { key: 'answer_2', header: 'Answer 2' },
          { key: 'statement_3', header: 'Statement 3' },
          { key: 'answer_3', header: 'Answer 3' },
          { key: 'statement_4', header: 'Statement 4' },
          { key: 'answer_4', header: 'Answer 4' },
          { key: 'statement_5', header: 'Statement 5' },
          { key: 'answer_5', header: 'Answer 5' },
          { 
            key: 'concept_name', 
            header: 'Concept',
            getValue: (item) => {
              const concept = concepts.find(c => c.id === (item as any).concept_id);
              return concept?.title || '';
            }
          },
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
