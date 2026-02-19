import { useMemo } from 'react';
import { Video, Youtube, HardDrive } from 'lucide-react';
import { ContentAdminTable, type ColumnConfig } from '@/components/admin/ContentAdminTable';
import { useChapterSections } from '@/hooks/useSections';
import { useChapterConcepts } from '@/hooks/useConcepts';
import { LECTURE_EXPORT_COLUMNS } from '@/lib/csvExport';
import { getVideoInfo, isValidVideoUrl } from '@/lib/video';

interface Lecture {
  id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
  videoUrl?: string | null;
  duration?: string | null;
  section_id?: string | null;
  concept_id?: string | null;
}

interface LecturesAdminTableProps {
  lectures: Lecture[];
  chapterId?: string;
  moduleId?: string;
  onEdit?: (lecture: Lecture) => void;
  onDelete?: (lecture: Lecture) => void;
}

export function LecturesAdminTable({
  lectures,
  chapterId,
  moduleId,
  onEdit,
  onDelete,
}: LecturesAdminTableProps) {
  const { data: sections = [] } = useChapterSections(chapterId);
  const { data: concepts = [] } = useChapterConcepts(chapterId);

  const columns: ColumnConfig<Lecture>[] = useMemo(() => [
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
      key: 'duration',
      header: 'Duration',
      className: 'w-24',
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.duration || '—'}
        </span>
      ),
    },
    {
      key: 'video_url' as keyof Lecture,
      header: 'Source',
      className: 'w-20',
      render: (item) => {
        const url = item.video_url || item.videoUrl;
        if (!url || !isValidVideoUrl(url)) {
          return <span className="text-muted-foreground text-xs">No video</span>;
        }
        const info = getVideoInfo(url);
        if (info.source === 'youtube') {
          return <Youtube className="h-4 w-4 text-destructive" aria-label="YouTube" />;
        }
        if (info.source === 'googledrive') {
          return <HardDrive className="h-4 w-4 text-primary" aria-label="Google Drive" />;
        }
        return <Video className="h-4 w-4 text-muted-foreground" />;
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
      data={lectures}
      columns={columns}
      contentTable="lectures"
      chapterId={chapterId}
      moduleId={moduleId}
      sections={sections}
      concepts={concepts}
      onEdit={onEdit}
      onDelete={onDelete}
      csvExportConfig={{
        filename: `lectures-${chapterId || 'export'}`,
        columns: LECTURE_EXPORT_COLUMNS as any,
      }}
      emptyMessage="No chapters available"
    />
  );
}
