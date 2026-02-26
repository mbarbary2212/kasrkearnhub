import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RotateCcw, ChevronLeft, AlertTriangle, CheckCircle, Info, Zap, ArrowRight } from 'lucide-react';
import { AlgorithmJson, AlgorithmNode, NODE_TYPE_CONFIG } from '@/types/algorithm';

interface AlgorithmPlayerProps {
  title: string;
  algorithmJson: AlgorithmJson;
  onClose?: () => void;
}

const NODE_ICONS: Record<string, React.ReactNode> = {
  decision: <Info className="w-5 h-5" />,
  action: <Zap className="w-5 h-5" />,
  information: <Info className="w-5 h-5" />,
  emergency: <AlertTriangle className="w-5 h-5" />,
  end: <CheckCircle className="w-5 h-5" />,
};

export function AlgorithmPlayer({ title, algorithmJson, onClose }: AlgorithmPlayerProps) {
  const nodeMap = useMemo(() => {
    const map = new Map<string, AlgorithmNode>();
    algorithmJson.nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [algorithmJson]);

  const [history, setHistory] = useState<string[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(algorithmJson.start_node_id);

  const currentNode = currentNodeId ? nodeMap.get(currentNodeId) : null;
  const visitedCount = history.length + (currentNodeId ? 1 : 0);

  const goToNode = (nodeId: string | null) => {
    if (currentNodeId) setHistory(prev => [...prev, currentNodeId]);
    setCurrentNodeId(nodeId);
  };

  const goBack = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setCurrentNodeId(prev);
  };

  const restart = () => {
    setHistory([]);
    setCurrentNodeId(algorithmJson.start_node_id);
  };

  if (!currentNode) {
    // End state or no start node
    return (
      <Card className="border-2 border-accent/50">
        <CardHeader className="text-center">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="py-8">
            <CheckCircle className="w-16 h-16 text-accent mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground">Pathway Complete</p>
            <p className="text-sm text-muted-foreground mt-1">
              You've reached the end of this pathway.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            {history.length > 0 && (
              <Button variant="outline" onClick={goBack}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Go Back
              </Button>
            )}
            <Button onClick={restart}>
              <RotateCcw className="w-4 h-4 mr-1" /> Start Over
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const config = NODE_TYPE_CONFIG[currentNode.type];

  return (
    <Card className={`border-2 ${currentNode.type === 'emergency' ? 'border-destructive/60 animate-pulse-once' : 'border-border'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <Badge variant="outline" className={`${config.color} text-xs`}>
            {config.icon} {config.label}
          </Badge>
        </div>
        <Progress value={visitedCount > 1 ? ((visitedCount - 1) / Math.max(visitedCount, 1)) * 100 : 0} className="h-1.5 mt-2" />
        <p className="text-xs text-muted-foreground mt-1">Step {visitedCount}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current step content */}
        <div className={`rounded-lg p-4 border ${config.color}`}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{NODE_ICONS[currentNode.type]}</div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{currentNode.content}</p>
          </div>
        </div>

        {/* Decision options */}
        {currentNode.type === 'decision' && currentNode.options && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Choose an option:</p>
            {currentNode.options.map(opt => (
              <Button
                key={opt.id}
                variant="outline"
                className="w-full justify-start text-left h-auto py-3 px-4 hover:bg-primary/10 hover:border-primary/50 hover:text-foreground transition-colors"
                onClick={() => goToNode(opt.next_node_id)}
              >
                <ArrowRight className="w-4 h-4 mr-2 shrink-0 text-primary" />
                <span className="text-sm">{opt.text}</span>
              </Button>
            ))}
          </div>
        )}

        {/* Non-decision: continue/end */}
        {currentNode.type !== 'decision' && currentNode.type !== 'end' && (
          <Button
            className="w-full"
            onClick={() => goToNode(currentNode.next_node_id || null)}
          >
            Continue <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}

        {/* End node */}
        {currentNode.type === 'end' && (
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" onClick={goBack} disabled={history.length === 0}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Go Back
            </Button>
            <Button onClick={restart}>
              <RotateCcw className="w-4 h-4 mr-1" /> Start Over
            </Button>
          </div>
        )}

        {/* Navigation */}
        {currentNode.type !== 'end' && (
          <div className="flex items-center justify-between pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={goBack} disabled={history.length === 0}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button variant="ghost" size="sm" onClick={restart}>
              <RotateCcw className="w-4 h-4 mr-1" /> Restart
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
