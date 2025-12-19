import { PenTool } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import ContentItemActions from '@/components/admin/ContentItemActions';

interface Essay {
  id: string;
  title: string;
  question: string;
}

interface EssayListProps {
  essays: Essay[];
  moduleId?: string;
  chapterId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  showFeedback?: boolean;
}

export default function EssayList({
  essays,
  moduleId,
  chapterId,
  canEdit = false,
  canDelete = false,
  showFeedback = true,
}: EssayListProps) {
  if (essays.length === 0) {
    return (
      <div className="text-center py-12">
        <PenTool className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No short questions available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {essays.map((essay) => (
        <Card key={essay.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <h3 className="font-medium mb-2">{essay.title}</h3>
              {moduleId && (
                <ContentItemActions
                  id={essay.id}
                  title={essay.title}
                  description={essay.question}
                  contentType="essay"
                  moduleId={moduleId}
                  chapterId={chapterId}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  showFeedback={showFeedback}
                />
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{essay.question}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
