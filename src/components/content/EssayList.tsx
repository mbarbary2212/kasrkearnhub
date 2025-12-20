import { useState } from 'react';
import { PenTool, Star, Edit2, Trash2, Printer, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ContentItemActions from '@/components/admin/ContentItemActions';
import { EssayDetailModal } from './EssayDetailModal';

interface Essay {
  id: string;
  title: string;
  question: string;
  model_answer?: string | null;
  rating?: number | null;
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
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleOpen = (index: number) => {
    setSelectedIndex(index);
    setDetailModalOpen(true);
  };

  const handlePrint = (essay: Essay, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${essay.title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
          h1 { font-size: 24px; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 12px; }
          .section { margin-bottom: 24px; }
          .section-label { font-weight: bold; color: #666; margin-bottom: 8px; }
          .section-content { white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>${essay.title}</h1>
        <div class="section">
          <div class="section-label">Question:</div>
          <div class="section-content">${essay.question}</div>
        </div>
        ${essay.model_answer ? `
        <div class="section">
          <div class="section-label">Answer:</div>
          <div class="section-content">${essay.model_answer}</div>
        </div>
        ` : ''}
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (essays.length === 0) {
    return (
      <div className="text-center py-12">
        <PenTool className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No short questions available yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {essays.map((essay, index) => (
          <Card 
            key={essay.id} 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleOpen(index)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">{essay.title}</h3>
                    {essay.rating && (
                      <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                        {essay.rating}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{essay.question}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpen(index);
                    }}
                    title="Open"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  {(canEdit || canDelete) && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => handlePrint(essay, e)}
                        title="Print"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
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
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Modal */}
      <EssayDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        essays={essays}
        initialIndex={selectedIndex}
      />
    </>
  );
}
