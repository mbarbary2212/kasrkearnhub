import { useMemo } from 'react';
import { ContentAdminTable, type ColumnConfig } from '@/components/admin/ContentAdminTable';
import { StudyResource, FlashcardContent } from '@/hooks/useStudyResources';
import { useChapterSections } from '@/hooks/useSections';
import { useChapterConcepts } from '@/hooks/useConcepts';
import { FLASHCARD_EXPORT_COLUMNS } from '@/lib/csvExport';

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
  concept_id: string | null;
  concept_auto_assigned: boolean | null;
  concept_ai_confidence: number | null;
  resource: StudyResource;
}

export function FlashcardsAdminTable({
  resources,
  chapterId,
  moduleId,
  onEdit,
  onDelete,
}: FlashcardsAdminTableProps) {
  const { data: sections = [] } = useChapterSections(chapterId);
  const { data: concepts = [] } = useChapterConcepts(chapterId);

  // Transform resources to flat rows for the table
  const rows = useMemo((): FlashcardRow[] => {
    return resources.map(resource => {
      const content = resource.content as FlashcardContent;
      return {
        id: resource.id,
        title: resource.title,
        front: content?.front || '',
        back: content?.back || '',
        section_id: resource.section_id || null,
        concept_id: resource.concept_id || null,
        concept_auto_assigned: resource.concept_auto_assigned ?? null,
        concept_ai_confidence: resource.concept_ai_confidence ?? null,
        resource,
      };
    });
  }, [resources]);

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
      key: 'concept',
      header: 'Concept',
      className: 'w-32',
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
      concept_id: row.concept_id,
    }));
  }, [rows]);

  return (
    <ContentAdminTable
      data={rows}
      columns={columns}
      contentTable="study_resources"
      chapterId={chapterId}
      moduleId={moduleId}
      sections={sections}
      concepts={concepts}
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
