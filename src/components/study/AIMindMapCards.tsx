import { useState, useMemo, useCallback, useRef } from 'react';
import { Network, Maximize2, Sparkles, Loader2, Printer, Minimize2, FilterX } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MindMap } from '@/hooks/useMindMaps';
import { MarkmapRenderer } from './MarkmapRenderer';
import { useIsMobile } from '@/hooks/use-mobile';

interface AIMindMapCardsProps {
  maps: MindMap[];
  isLoading?: boolean;
  /** Optional section filter — works with the existing filterBySection pattern */
  filterBySection?: <T>(items: T[]) => T[];
}

export function AIMindMapCards({ maps, isLoading, filterBySection }: AIMindMapCardsProps) {
  const [viewingMap, setViewingMap] = useState<MindMap | null>(null);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Apply section filter if provided
  const filteredMaps = useMemo(() => {
    if (!filterBySection) return maps;
    return filterBySection(maps);
  }, [maps, filterBySection]);

  const fullMaps = useMemo(() => filteredMaps.filter(m => m.map_type === 'full'), [filteredMaps]);
  const sectionMaps = useMemo(() => filteredMaps.filter(m => m.map_type === 'section'), [filteredMaps]);

  const handlePrint = useCallback(() => {
    if (!viewingMap?.markdown_content) return;

    // Strip frontmatter for the print renderer
    let md = viewingMap.markdown_content;
    if (md.startsWith('---')) {
      const end = md.indexOf('---', 3);
      if (end !== -1) md = md.slice(end + 3).trim();
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Could not open print window. Please allow popups for this site and try again.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${viewingMap.title}</title>
          <script src="https://cdn.jsdelivr.net/npm/markmap-view@0.17/dist/browser/index.js"><\/script>
          <script src="https://cdn.jsdelivr.net/npm/markmap-lib@0.17/dist/browser/index.js"><\/script>
          <style>
            body, html { margin: 0; padding: 0; width: 100%; height: 100vh; }
            svg#mm { width: 100%; height: 100vh; }
            @media print { svg#mm { width: 100%; height: 100%; } }
          </style>
        </head>
        <body>
          <svg id="mm"></svg>
          <script>
            const { Transformer } = markmap;
            const { Markmap } = markmapView;
            const transformer = new Transformer();
            const { root } = transformer.transform(${JSON.stringify(md)});
            const mm = Markmap.create(document.getElementById('mm'), { autoFit: true, initialExpandLevel: -1 });
            mm.setData(root);
            setTimeout(() => { mm.fit(); setTimeout(() => { window.focus(); window.print(); }, 500); }, 1000);
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [viewingMap]);

  // Sync fullscreen state when user exits via Esc or system controls
  useEffect(() => {
    const onFsChange = () => setIsNativeFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  const handleFullscreenToggle = useCallback(() => {
    if (!document.fullscreenElement) {
      dialogContentRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen();
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Nothing to show at all
  if (maps.length === 0) return null;

  // Maps exist but none match the active section filter
  if (filteredMaps.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-medium">AI-Generated Mind Maps</h4>
        </div>
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <FilterX className="w-6 h-6" />
          <p className="text-sm">No AI mind maps match the selected section.</p>
          <p className="text-xs">Try selecting a different section or clear the filter.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-medium">AI-Generated Mind Maps</h4>
          <Badge variant="secondary" className="text-xs h-5 px-1.5">{filteredMaps.length}</Badge>
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {fullMaps.map(map => (
            <AIMindMapCard key={map.id} map={map} onClick={() => setViewingMap(map)} />
          ))}
          {sectionMaps.map(map => (
            <AIMindMapCard key={map.id} map={map} onClick={() => setViewingMap(map)} />
          ))}
        </div>
      </div>

      {/* Fullscreen interactive viewer */}
      <Dialog open={!!viewingMap} onOpenChange={() => { setViewingMap(null); setIsNativeFullscreen(false); }}>
        <DialogContent
          ref={dialogContentRef}
          className="max-w-[95vw] max-h-[95vh] flex flex-col p-2 sm:p-4"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="flex-shrink-0 px-2">
            <div className="flex items-center justify-between gap-2 pr-8">
              <DialogTitle className="flex items-center gap-2 text-sm sm:text-base truncate">
                <Network className="w-4 h-4 shrink-0" />
                <span className="truncate">{viewingMap?.title}</span>
              </DialogTitle>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={handlePrint}
                  title="Print mind map"
                >
                  <Printer className="w-4 h-4" />
                </Button>
                {!isMobile && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={handleFullscreenToggle}
                    title={isNativeFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  >
                    {isNativeFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge className="bg-primary/10 text-primary border-0 text-xs">
                {viewingMap?.map_type === 'full' ? 'Full Chapter' : 'Section'}
              </Badge>
              {viewingMap?.section_title && (
                <span className="text-xs text-muted-foreground truncate">
                  {viewingMap.section_number ? `${viewingMap.section_number} — ` : ''}
                  {viewingMap.section_title}
                </span>
              )}
            </div>
          </DialogHeader>

          <div
            className="flex-1 min-h-0 overflow-hidden rounded-lg bg-background border"
            style={{ minHeight: isMobile ? '50vh' : '60vh' }}
          >
            {viewingMap?.markdown_content && (
              <MarkmapRenderer
                markdown={viewingMap.markdown_content}
                className="rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AIMindMapCard({ map, onClick }: { map: MindMap; onClick: () => void }) {
  const branchCount = map.markdown_content?.match(/^## /gm)?.length || 0;
  const isMobile = useIsMobile();

  return (
    <Card
      className="overflow-hidden group cursor-pointer hover:shadow-md transition-[box-shadow] duration-200"
      onClick={onClick}
    >
      <CardHeader className={`${isMobile ? 'p-2.5' : 'p-3'} pb-0`}>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium truncate flex-1">
            {map.section_title || map.title}
          </CardTitle>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className={`${isMobile ? 'p-2.5' : 'p-3'} pt-2`}>
        <div
          className={`flex flex-col items-center justify-center gap-1.5 ${isMobile ? 'h-24' : 'h-28'} bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors`}
        >
          <Network className="w-8 h-8 text-primary/70" />
          <div className="flex items-center gap-1.5">
            <Badge className="bg-primary/10 text-primary border-0 text-[10px] h-4 px-1.5">
              {map.map_type === 'full' ? 'Full' : 'Section'}
            </Badge>
            {branchCount > 0 && (
              <span className="text-[10px] text-muted-foreground">{branchCount} branches</span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {isMobile ? 'Tap to explore' : 'Click to explore'}
          </span>
        </div>
        {map.section_number && (
          <p className="text-[11px] text-muted-foreground mt-1.5 truncate">
            Section {map.section_number}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
