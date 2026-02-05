import { Badge } from '@/components/ui/badge';
import { FileText, Network, Image } from 'lucide-react';
import { ContentAdminTable, ColumnConfig } from '@/components/admin/ContentAdminTable';
import type { StudyResource, MindMapContent } from '@/hooks/useStudyResources';
import type { Section } from '@/hooks/useSections';

interface MindMapAdminTableProps {
  resources: StudyResource[];
  sections?: Section[];
  chapterId?: string;
  moduleId?: string;
  onEdit: (resource: StudyResource) => void;
  onDelete: (resource: StudyResource) => void;
}

export function MindMapAdminTable({
  resources,
  sections = [],
  chapterId,
  moduleId,
  onEdit,
  onDelete,
}: MindMapAdminTableProps) {
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
        <span className="line-clamp-2 max-w-[250px] text-sm font-medium">{r.title}</span>
      ),
    },
    {
      key: 'content' as keyof StudyResource,
      header: 'Type',
      className: 'w-28',
      render: (r) => {
        const content = r.content as MindMapContent;
        const isPdf = content.imageUrl?.toLowerCase().endsWith('.pdf');
        const isNodeBased = !content.imageUrl && Array.isArray(content.nodes) && content.nodes.length > 0;
        
        if (isPdf) {
          return (
            <Badge variant="outline" className="gap-1">
              <FileText className="w-3 h-3" />
              PDF
            </Badge>
          );
        }
        if (isNodeBased) {
          return (
            <Badge variant="outline" className="gap-1">
              <Network className="w-3 h-3" />
              Node Map
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="gap-1">
            <Image className="w-3 h-3" />
            Image
          </Badge>
        );
      },
    },
    {
      key: 'content' as keyof StudyResource,
      header: 'Preview',
      className: 'w-24',
      render: (r) => {
        const content = r.content as MindMapContent;
        if (content.imageUrl && !content.imageUrl.toLowerCase().endsWith('.pdf')) {
          return (
            <img 
              src={content.imageUrl} 
              alt={r.title}
              className="w-16 h-10 object-cover rounded border"
            />
          );
        }
        return <span className="text-muted-foreground text-xs">—</span>;
      },
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
      data={resources}
      columns={columns}
      contentTable="study_resources"
      chapterId={chapterId}
      moduleId={moduleId}
      sections={sections}
      onEdit={onEdit}
      onDelete={onDelete}
      csvExportConfig={{
        filename: 'mind-maps-export',
        columns: [
          { key: 'title', header: 'Title' },
          { 
            key: 'content', 
            header: 'Type',
            getValue: (item) => {
              const content = item.content as MindMapContent;
              if (content.imageUrl?.toLowerCase().endsWith('.pdf')) return 'PDF';
              if (!content.imageUrl && content.nodes?.length) return 'Node Map';
              return 'Image';
            }
          },
          { 
            key: 'content', 
            header: 'Description',
            getValue: (item) => {
              const content = item.content as MindMapContent;
              return content.description || '';
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
