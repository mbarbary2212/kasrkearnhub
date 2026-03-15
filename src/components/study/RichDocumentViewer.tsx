import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, ChevronDown, ChevronUp, BookOpen, FileText } from 'lucide-react';
import { SafeMarkdown } from '@/components/ui/SafeMarkdown';
import { cn } from '@/lib/utils';

interface RichDocumentViewerProps {
  title: string;
  content: string;
  documentType: 'socratic_tutorial' | 'summary';
  sectionName?: string | null;
  className?: string;
}

export function RichDocumentViewer({
  title,
  content,
  documentType,
  sectionName,
  className,
}: RichDocumentViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const isTutorial = documentType === 'socratic_tutorial';
  const Icon = isTutorial ? BookOpen : FileText;
  const typeLabel = isTutorial ? 'Socratic Tutorial' : 'Summary';

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !contentRef.current) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.8; color: #1a1a1a; }
          h1 { font-size: 24px; border-bottom: 2px solid #333; padding-bottom: 8px; }
          h2 { font-size: 20px; margin-top: 24px; color: #2a2a2a; }
          h3 { font-size: 16px; margin-top: 16px; }
          blockquote { border-left: 3px solid #666; padding-left: 16px; margin-left: 0; color: #444; font-style: italic; }
          ul, ol { padding-left: 24px; }
          li { margin-bottom: 4px; }
          strong { color: #000; }
          code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 14px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${contentRef.current.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const previewContent = content.length > 300 ? content.substring(0, 300) + '...' : content;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn(
              'p-2 rounded-lg shrink-0',
              isTutorial ? 'bg-primary/10' : 'bg-accent/50'
            )}>
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold line-clamp-2">{title}</CardTitle>
              <div className="flex gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">{typeLabel}</Badge>
                {sectionName && (
                  <Badge variant="outline" className="text-xs">{sectionName}</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={handlePrint} title="Print / Download PDF">
              <Printer className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!isExpanded ? (
          <div
            className="text-sm text-muted-foreground cursor-pointer line-clamp-3"
            onClick={() => setIsExpanded(true)}
          >
            <ReactMarkdown>{previewContent}</ReactMarkdown>
          </div>
        ) : (
          <div
            ref={contentRef}
            className="prose prose-sm dark:prose-invert max-w-none mt-2
              prose-headings:text-foreground prose-p:text-foreground/90
              prose-strong:text-foreground prose-blockquote:border-primary/30
              prose-blockquote:text-muted-foreground prose-li:text-foreground/90
              prose-a:text-primary"
          >
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
