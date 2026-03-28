import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Play, GitBranch, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useTrackContentView } from '@/hooks/useTrackContentView';
import { InteractiveAlgorithm, NODE_TYPE_CONFIG } from '@/types/algorithm';
import { AlgorithmPlayer } from './AlgorithmPlayer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AlgorithmListProps {
  algorithms: InteractiveAlgorithm[];
  chapterId?: string;
  canManage?: boolean;
  onEdit?: (alg: InteractiveAlgorithm) => void;
  onDelete?: (alg: InteractiveAlgorithm) => void;
}

export function AlgorithmList({ algorithms, chapterId, canManage, onEdit, onDelete }: AlgorithmListProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InteractiveAlgorithm | null>(null);
  const trackContentView = useTrackContentView();

  if (algorithms.length === 0) {
    return (
      <div className="text-center py-12">
        <GitBranch className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No interactive pathways yet.</p>
      </div>
    );
  }

  const playingAlg = algorithms.find(a => a.id === playingId);

  if (playingAlg) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setPlayingId(null)}>
          ← Back to list
        </Button>
        <AlgorithmPlayer
          title={playingAlg.title}
          algorithmJson={playingAlg.algorithm_json}
          showDebugToggle={canManage}
        />
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {algorithms.map(alg => {
          const nodeCount = alg.algorithm_json?.nodes?.length || 0;
          const decisionCount = alg.algorithm_json?.nodes?.filter(n => n.type === 'decision').length || 0;
          return (
            <Card key={alg.id} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => setPlayingId(alg.id)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-semibold leading-tight">{alg.title}</CardTitle>
                  {canManage && (
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                        const json = alg.algorithm_json;
                        const nodeCount = json?.nodes?.length || 0;
                        const decisionCount = json?.nodes?.filter((n: any) => n.type === 'decision').length || 0;
                        const headers = ['title', 'description', 'node_count', 'decision_count', 'reveal_mode', 'include_consequences'];
                        const vals = [alg.title, alg.description || '', String(nodeCount), String(decisionCount), (alg as any).reveal_mode || '', String((alg as any).include_consequences || false)];
                        const row = vals.map(v => v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v).join(',');
                        const csv = [headers.join(','), row].join('\n');
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = `pathway_${alg.title.replace(/\s+/g, '_').substring(0, 30)}.csv`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(link.href);
                        toast.success('Pathway downloaded');
                      }}>
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit?.(alg)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(alg)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {alg.description && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{alg.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{nodeCount} steps</Badge>
                  {decisionCount > 0 && (
                    <Badge variant="outline" className="text-xs">{decisionCount} decisions</Badge>
                  )}
                  <div className="flex-1" />
                  <Button size="sm" variant="default" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setPlayingId(alg.id); }}>
                    <Play className="w-3 h-3 mr-1" /> Start
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pathway</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) { onDelete?.(deleteTarget); setDeleteTarget(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
