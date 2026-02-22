import { useState } from 'react';
import { X, Download, ExternalLink, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PdfViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string;
  title: string;
}

export function PdfViewerModal({ open, onOpenChange, pdfUrl, title }: PdfViewerModalProps) {
  const [zoom, setZoom] = useState(100);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoom(100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-3 sm:px-4 py-2 sm:py-3 border-b flex-shrink-0">
          <DialogTitle className="text-sm sm:text-lg font-semibold truncate">{title}</DialogTitle>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Zoom controls */}
            <div className="flex items-center gap-0.5 sm:gap-1 border rounded-md p-0.5 sm:p-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
              >
                <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <span className="text-xs w-10 sm:w-12 text-center">{zoom}%</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
              >
                <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                onClick={handleResetZoom}
              >
                <RotateCw className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
            </div>

            {/* Download / Open external */}
            <Button size="sm" variant="outline" className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3" asChild>
              <a href={pdfUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Download</span>
                <span className="sm:hidden">Save</span>
              </a>
            </Button>
            <Button size="sm" variant="outline" className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3" asChild>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                Open
              </a>
            </Button>
          </div>
        </DialogHeader>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto bg-muted/30">
          <div
            className="w-full h-full flex items-start justify-center p-4"
            style={{ minHeight: '100%' }}
          >
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              className="border-0 bg-white shadow-lg"
              style={{
                width: `${zoom}%`,
                height: '100%',
                minHeight: 'calc(90vh - 80px)',
              }}
              title={title}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
