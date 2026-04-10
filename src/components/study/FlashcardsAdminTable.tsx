import { useMemo, useState } from 'react';
import { ContentAdminTable, type ColumnConfig } from '@/components/admin/ContentAdminTable';
import { StudyResource, FlashcardContent } from '@/hooks/useStudyResources';
import { useChapterSections } from '@/hooks/useSections';
import { FLASHCARD_EXPORT_COLUMNS } from '@/lib/csvExport';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface FlashcardsAdminTableProps {
  resources: StudyResource[];
  chapterId?: string;
  moduleId?: string;
  onEdit?: (resource: StudyResource) => void;
  onDelete?: (resource: StudyResource) => void;
}

// Helper type for table display
interface FlashcardRow {
  id: string;
  title: string;
  front: string;
  back: string;
  section_id: string | null;
  cardType: 'classic' | 'cloze';
  resource: StudyResource;
}

type CardTypeFilter = 'all' | 'classic' | 'cloze';

const CLOZE_REGEX = /\{\{c\d+::(.+?)\}\}/;

function detectCardType(content: FlashcardContent): 'classic' | 'cloze' {
  if (content.card_type === 'cloze' && content.cloze_text && CLOZE_REGEX.test(content.cloze_text)) {
    return 'cloze';
  }
  return 'classic';
}

export function FlashcardsAdminTable({
  resources,
  chapterId,
  moduleId,
  onEdit,
  onDelete,
}: FlashcardsAdminTableProps) {
  const { data: sections = [] } = useChapterSections(chapterId);
  const [cardTypeFilter, setCardTypeFilter] = useState<CardTypeFilter>('all');

  // Transform resources to flat rows for the table
  const allRows = useMemo((): FlashcardRow[] => {
    return resources.map(resource => {
      const content = resource.content as FlashcardContent;
      return {
        id: resource.id,
        title: resource.title,
        front: content?.front || '',
        back: content?.back || '',
        section_id: resource.section_id || null,
        cardType: detectCardType(content),
        resource,
      };
    });
  }, [resources]);

  const rows = useMemo(() => {
    if (cardTypeFilter === 'all') return allRows;
    return allRows.filter(r => r.cardType === cardTypeFilter);
  }, [allRows, cardTypeFilter]);

  const classicCount = useMemo(() => allRows.filter(r => r.cardType === 'classic').length, [allRows]);
  const clozeCount = useMemo(() => allRows.filter(r => r.cardType === 'cloze').length, [allRows]);

  const columns: ColumnConfig<FlashcardRow>[] = [
    {
      key: 'select',
      header: '',
      className: 'w-10',
    },
    {
      key: 'title',
      header: 'Title',
      className: 'font-medium',
    },
    {
      key: 'front',
      header: 'Front',
      render: (item) => (
        <span className="text-sm line-clamp-1 max-w-[200px]" title={item.front}>
          {item.front}
        </span>
      ),
    },
    {
      key: 'back',
      header: 'Back',
      render: (item) => (
        <span className="text-sm line-clamp-1 max-w-[200px] text-muted-foreground" title={item.back}>
          {item.back}
        </span>
      ),
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
  ];

  // CSV export config - map FlashcardRow back to expected format
  const csvData = useMemo(() => {
    return rows.map(row => ({
      title: row.title,
      content: { front: row.front, back: row.back },
      section_id: row.section_id,
    }));
  }, [rows]);

  return (
    <ContentAdminTable
      data={rows}
      columns={columns}
      contentTable="study_resources"
      chapterId={chapterId}
      sections={sections}
      onEdit={onEdit ? (row) => onEdit(row.resource) : undefined}
      onDelete={onDelete ? (row) => onDelete(row.resource) : undefined}
      csvExportConfig={{
        filename: `flashcards-${chapterId || 'export'}`,
        columns: FLASHCARD_EXPORT_COLUMNS as any,
      }}
      emptyMessage="No flashcards available"
    />
  );
}
