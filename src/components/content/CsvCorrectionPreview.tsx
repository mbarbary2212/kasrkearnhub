import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ArrowRight, Columns, Hash, Type, Scissors } from 'lucide-react';
import type { ParseCorrection } from '@/lib/csvParser';

interface CsvCorrectionPreviewProps {
  corrections: ParseCorrection[];
  className?: string;
}

function getCorrectionIcon(type: ParseCorrection['type']) {
  switch (type) {
    case 'column_mapped':
      return <Columns className="h-3 w-3" />;
    case 'correct_key_converted':
      return <Hash className="h-3 w-3" />;
    case 'header_skipped':
      return <Type className="h-3 w-3" />;
    case 'whitespace_trimmed':
      return <Scissors className="h-3 w-3" />;
    default:
      return <CheckCircle2 className="h-3 w-3" />;
  }
}

export function CsvCorrectionPreview({ corrections, className }: CsvCorrectionPreviewProps) {
  if (corrections.length === 0) {
    return null;
  }

  // Group corrections by type for summary
  const columnMappings = corrections.filter(c => c.type === 'column_mapped');
  const keyConversions = corrections.filter(c => c.type === 'correct_key_converted');
  const headerSkipped = corrections.some(c => c.type === 'header_skipped');

  // Limit displayed row-level corrections to avoid overwhelming the user
  const displayedKeyConversions = keyConversions.slice(0, 5);
  const remainingKeyConversions = keyConversions.length - displayedKeyConversions.length;

  return (
    <Alert className={`bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800 ${className}`}>
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <AlertDescription>
        <div className="space-y-2">
          <p className="font-medium text-green-800 dark:text-green-300">
            {corrections.length} auto-correction{corrections.length !== 1 ? 's' : ''} applied
          </p>
          
          <div className="space-y-1 text-sm text-green-700 dark:text-green-400">
            {/* Header detection */}
            {headerSkipped && (
              <div className="flex items-center gap-2">
                {getCorrectionIcon('header_skipped')}
                <span>Header row detected and skipped</span>
              </div>
            )}
            
            {/* Column mappings */}
            {columnMappings.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-medium">
                  <Columns className="h-3 w-3" />
                  <span>Column mappings:</span>
                </div>
                <div className="ml-5 space-y-0.5">
                  {columnMappings.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <Badge variant="outline" className="bg-background font-mono text-xs px-1.5 py-0">
                        {c.originalValue}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="secondary" className="font-mono text-xs px-1.5 py-0">
                        {c.correctedValue}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Answer key conversions */}
            {keyConversions.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-medium">
                  <Hash className="h-3 w-3" />
                  <span>
                    Answer key conversions: {keyConversions.length} row{keyConversions.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="ml-5 space-y-0.5">
                  {displayedKeyConversions.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">Row {c.row}:</span>
                      <Badge variant="outline" className="bg-background font-mono text-xs px-1.5 py-0">
                        {c.originalValue}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="secondary" className="font-mono text-xs px-1.5 py-0">
                        {c.correctedValue}
                      </Badge>
                    </div>
                  ))}
                  {remainingKeyConversions > 0 && (
                    <div className="text-xs text-muted-foreground ml-0.5">
                      ...and {remainingKeyConversions} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
