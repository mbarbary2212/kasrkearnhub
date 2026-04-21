import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PerformanceMetrics, getLatencyColor, formatMs } from '@/utils/performanceTelemetry';
import { Activity, Cpu, Mic, Volume2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceDebugConsoleProps {
  metrics: PerformanceMetrics;
  onClose?: () => void;
}

export function PerformanceDebugConsole({ metrics, onClose }: PerformanceDebugConsoleProps) {
  if (metrics.timestamp === 0) return null;

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-64 shadow-2xl border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between border-b pb-2 mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider">Case Telemetry</span>
          </div>
          {onClose && (
            <button 
              onClick={onClose} 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          {/* STT Metric */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Mic className="w-3 h-3" />
              STT Recognition
            </div>
            <span className={cn("text-xs font-mono font-bold", getLatencyColor(metrics.stt))}>
              {formatMs(metrics.stt)}
            </span>
          </div>

          {/* LLM Metric */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Cpu className="w-3 h-3" />
              LLM Reasoning
            </div>
            <span className={cn("text-xs font-mono font-bold", getLatencyColor(metrics.llm))}>
              {formatMs(metrics.llm)}
            </span>
          </div>

          {/* TTS Metric */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Volume2 className="w-3 h-3" />
              TTS Generation
            </div>
            <span className={cn("text-xs font-mono font-bold", getLatencyColor(metrics.tts))}>
              {formatMs(metrics.tts)}
            </span>
          </div>

          <div className="pt-2 border-t mt-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Turn</span>
            <Badge variant="outline" className={cn("text-[10px] tabular-nums font-mono", getLatencyColor(metrics.total))}>
              {formatMs(metrics.total)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
