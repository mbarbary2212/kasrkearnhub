import { Network, Image, GitBranch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ContentAdminTable, ColumnConfig } from '@/components/admin/ContentAdminTable';
import {
  StudyResource,
  StudyResourceType,
  MindMapContent,
  InfographicContent,
  useUpdateStudyResource,
} from '@/hooks/useStudyResources';
import type { Section } from '@/hooks/useSections';

const VISUAL_TYPES: { value: StudyResourceType; label: string; icon: React.ReactNode }[] = [
  { value: 'mind_map', label: 'Mind Map', icon: <Network className="w-3 h-3" /> },
  { value: 'infographic', label: 'Infographic', icon: <Image className="w-3 h-3" /> },
  { value: 'algorithm', label: 'Algorithm', icon: <GitBranch className="w-3 h-3" /> },
];

interface VisualResourcesAdminTableProps {
  resources: StudyResource[];
  sections?: Section[];
  chapterId?: string;
  topicId?: string;
  moduleId?: string;
  onEdit?: (resource: StudyResource) => void;
  onDelete?: (resource: StudyResource) => void;
}

function TypeChangeCell({
  resource,
}: {
  resource: StudyResource;
}) {
  const updateResource = useUpdateStudyResource();

  const handleChange = (newType: string) => {
    if (newType === resource.resource_type) return;
    updateResource.mutate(
      { id: resource.id, resource_type: newType as StudyResourceType },
      {
        onSuccess: () =>
          toast.success(`Moved to ${VISUAL_TYPES.find((t) => t.value === newType)?.label}`),
        onError: () => toast.error('Failed to change type'),
      },
    );
  };

  return (
    <Select value={resource.resource_type} onValueChange={handleChange}>
      <SelectTrigger className="h-7 text-xs w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {VISUAL_TYPES.map((t) => (
          <SelectItem key={t.value} value={t.value}>
            <div className="flex items-center gap-1.5">
              {t.icon}
              {t.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function getPreviewUrl(resource: StudyResource): string | undefined {
  const content = resource.content as MindMapContent & InfographicContent;
  const url = content.fileUrl || (content as any).imageUrl;
  if (
    url &&
    !url.toLowerCase().endsWith('.pdf') &&
    !url.toLowerCase().endsWith('.html') &&
    !url.toLowerCase().endsWith('.htm')
  ) {
    return url;
  }
  return undefined;
}

export function VisualResourcesAdminTable({
  resources,
  sections = [],
  chapterId,
  topicId,
  moduleId,
  onEdit,
  onDelete,
}: VisualResourcesAdminTableProps) {
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
      className: 'w-36',
      render: (r) => <TypeChangeCell resource={r} />,
    },
    {
      key: 'content' as keyof StudyResource,
      header: 'Preview',
      className: 'w-24',
      render: (r) => {
        const url = getPreviewUrl(r);
        if (url) {
          return (
            <img
              src={url}
              alt={r.title}
              className="w-14 h-9 object-cover rounded border"
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
      topicId={topicId}
      moduleId={moduleId}
      sections={sections}
      onEdit={onEdit}
      onDelete={onDelete}
      csvExportConfig={{
        filename: 'visual-resources-export',
        columns: [
          { key: 'title', header: 'Title' },
          {
            key: 'resource_type',
            header: 'Type',
            getValue: (item) => {
              const t = VISUAL_TYPES.find((v) => v.value === item.resource_type);
              return t?.label || item.resource_type;
            },
          },
          {
            key: 'content',
            header: 'Description',
            getValue: (item) => {
              const content = item.content as MindMapContent;
              return content.description || '';
            },
          },
          {
            key: 'section_name',
            header: 'Section',
            getValue: (item, sectionsList) => {
              const section = sectionsList?.find((s) => s.id === item.section_id);
              return section?.name || '';
            },
          },
        ],
      }}
      emptyMessage="No visual resources found."
    />
  );
}
