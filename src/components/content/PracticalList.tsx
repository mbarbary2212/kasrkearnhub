import { FlaskConical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import ContentItemActions from '@/components/admin/ContentItemActions';

interface Practical {
  id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
}

interface PracticalListProps {
  practicals: Practical[];
  moduleId?: string;
  chapterId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  showFeedback?: boolean;
}

export default function PracticalList({
  practicals,
  moduleId,
  chapterId,
  canEdit = false,
  canDelete = false,
  showFeedback = true,
}: PracticalListProps) {
  if (practicals.length === 0) {
    return (
      <div className="text-center py-12">
        <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No practicals available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {practicals.map((practical) => (
        <Card key={practical.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
                <FlaskConical className="w-6 h-6 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium">{practical.title}</h3>
                  {moduleId && (
                    <ContentItemActions
                      id={practical.id}
                      title={practical.title}
                      description={practical.description}
                      videoUrl={practical.video_url}
                      contentType="practical"
                      moduleId={moduleId}
                      chapterId={chapterId}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      showFeedback={showFeedback}
                    />
                  )}
                </div>
                {practical.description && (
                  <p className="text-sm text-muted-foreground mt-1">{practical.description}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
