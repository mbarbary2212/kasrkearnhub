import { useState } from 'react';
import { Network, Maximize2, Sparkles, Loader2 } from 'lucide-react';
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
}

export function AIMindMapCards({ maps, isLoading }: AIMindMapCardsProps) {
  const [viewingMap, setViewingMap] = useState<MindMap | null>(null);
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (maps.length === 0) return null;

  const fullMaps = maps.filter(m => m.map_type === 'full');
  const sectionMaps = maps.filter(m => m.map_type === 'section');

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-medium">AI-Generated Mind Maps</h4>
          <Badge variant="secondary" className="text-xs h-5 px-1.5">{maps.length}</Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fullMaps.map(map => (
            <AIMindMapCard key={map.id} map={map} onClick={() => setViewingMap(map)} />
          ))}
          {sectionMaps.map(map => (
            <AIMindMapCard key={map.id} map={map} onClick={() => setViewingMap(map)} />
          ))}
        </div>
      </div>

      {/* Fullscreen interactive viewer */}
      <Dialog open={!!viewingMap} onOpenChange={() => setViewingMap(null)}>
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] flex flex-col p-2 sm:p-4"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="flex-shrink-0 px-2">
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base truncate pr-8">
              <Network className="w-4 h-4 shrink-0" />
              <span className="truncate">{viewingMap?.title}</span>
            </DialogTitle>
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
            className="flex-1 overflow-hidden rounded-lg bg-background border"
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
  // Extract branch count from markdown (count ## headings)
  const branchCount = map.markdown_content?.match(/^## /gm)?.length || 0;

  return (
    <Card
      className="overflow-hidden group cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="p-3 pb-0">
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
      <CardContent className="p-3 pt-2">
        <div
          className="flex flex-col items-center justify-center gap-2 h-28 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
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
          <span className="text-xs text-muted-foreground">Click to explore</span>
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
