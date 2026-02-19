import { Badge } from '@/components/ui/badge';
import { BookOpen, MessageCircleQuestion } from 'lucide-react';
import { ContentAdminTable, ColumnConfig } from '@/components/admin/ContentAdminTable';
import type { StudyResource, GuidedExplanationContent } from '@/hooks/useStudyResources';
import type { Section } from '@/hooks/useSections';
import { useChapterConcepts } from '@/hooks/useConcepts';

interface GuidedExplanationAdminTableProps {
  resources: StudyResource[];
  sections?: Section[];
  chapterId?: string;
  moduleId?: string;
  onEdit: (resource: StudyResource) => void;
  onDelete: (id: string) => void;
}

export function GuidedExplanationAdminTable({
  resources,
  sections = [],
  chapterId,
  moduleId,
  onEdit,
  onDelete,
}: GuidedExplanationAdminTableProps) {
  const { data: concepts = [] } = useChapterConcepts(chapterId);

  const columns: ColumnConfig<StudyResource>[] = [
    {
      key: 'select',
      header: '',
      className: 'w-10',
    },
    {
      key: 'title',
      header: 'Title',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-primary/10 flex-shrink-0">
            <MessageCircleQuestion className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="line-clamp-2 max-w-[250px] text-sm font-medium">{r.title}</span>
        </div>
      ),
    },
    {
      key: 'content' as keyof StudyResource,
      header: 'Topic',
      className: 'w-48',
      render: (r) => {
        const content = r.content as GuidedExplanationContent;
        return (
          <span className="line-clamp-1 text-sm text-muted-foreground max-w-[180px]">
            {content.topic || '—'}
          </span>
        );
      },
    },
    {
      key: 'content' as keyof StudyResource,
      header: 'Questions',
      className: 'w-28',
      render: (r) => {
        const content = r.content as GuidedExplanationContent;
        const count = content.guided_questions?.length || 0;
        return (
          <Badge variant="secondary" className="gap-1">
            <BookOpen className="w-3 h-3" />
            {count}
          </Badge>
        );
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

  // Adapter for onDelete since it expects the resource object but the prop takes id
  const handleDelete = (resource: StudyResource) => {
    onDelete(resource.id);
  };

  return (
    <ContentAdminTable
      data={resources}
      columns={columns}
      contentTable="study_resources"
      chapterId={chapterId}
      moduleId={moduleId}
      sections={sections}
      concepts={concepts}
      onEdit={onEdit}
      onDelete={handleDelete}
      csvExportConfig={{
        filename: 'guided-explanations-export',
        columns: [
          { key: 'title', header: 'Title' },
          { 
            key: 'content', 
            header: 'Topic',
            getValue: (item) => {
              const content = item.content as GuidedExplanationContent;
              return content.topic || '';
            }
          },
          { 
            key: 'content', 
            header: 'Questions Count',
            getValue: (item) => {
              const content = item.content as GuidedExplanationContent;
              return String(content.guided_questions?.length || 0);
            }
          },
          { 
            key: 'content', 
            header: 'Introduction',
            getValue: (item) => {
              const content = item.content as GuidedExplanationContent;
              return content.introduction || '';
            }
          },
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
