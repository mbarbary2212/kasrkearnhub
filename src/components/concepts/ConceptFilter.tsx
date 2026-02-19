import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tag, ChevronDown, Check } from 'lucide-react';
import { useChapterConcepts, Concept } from '@/hooks/useConcepts';

interface ConceptFilterProps {
  chapterId?: string;
  topicId?: string;
  moduleId?: string;
  selectedConceptId: string | null;
  onConceptChange: (conceptId: string | null) => void;
  className?: string;
}

export function ConceptFilter({
  chapterId,
  topicId,
  moduleId,
  selectedConceptId,
  onConceptChange,
  className,
}: ConceptFilterProps) {
  // Fetch concepts for chapter
  const { data: concepts } = useChapterConcepts(chapterId);

  // Find the selected concept for display
  const selectedConcept = concepts?.find(c => c.id === selectedConceptId);

  // Don't render if no concepts exist
  if (!concepts || concepts.length === 0) {
    return null;
  }

  const conceptCount = concepts.length;

  return (
    <div className={cn("flex justify-center py-3", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-full",
              "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10",
              "border-2 border-amber-500/30 shadow-sm",
              "text-sm font-medium transition-all duration-200",
              "hover:border-amber-500/50 hover:shadow-md hover:scale-[1.02]",
              "focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:ring-offset-2"
            )}
          >
            <Tag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-foreground">
              {selectedConcept ? selectedConcept.title : 'All Concepts'}
            </span>
            <Badge
              variant="secondary"
              className="h-5 px-1.5 text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0"
            >
              {conceptCount}
            </Badge>
            <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-64 max-h-80 overflow-y-auto bg-popover border border-border shadow-lg z-50"
          align="center"
          sideOffset={8}
        >
          <DropdownMenuItem
            onClick={() => onConceptChange(null)}
            className={cn(
              "flex items-center justify-between gap-2 py-3 cursor-pointer",
              !selectedConceptId && "bg-amber-500/10"
            )}
          >
            <div className="flex items-center gap-2">
              <Tag className={cn("w-4 h-4", !selectedConceptId ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")} />
              <span className={cn(!selectedConceptId && "font-medium text-amber-700 dark:text-amber-300")}>All Concepts</span>
            </div>
            {!selectedConceptId && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
          </DropdownMenuItem>

          {concepts.map((concept) => {
            const isActive = selectedConceptId === concept.id;
            return (
              <DropdownMenuItem
                key={concept.id}
                onClick={() => onConceptChange(concept.id)}
                className={cn(
                  "flex items-center justify-between gap-2 py-3 cursor-pointer",
                  isActive && "bg-amber-500/10"
                )}
              >
                <span className={cn(
                  "truncate",
                  isActive && "font-medium text-amber-700 dark:text-amber-300"
                )}>
                  {concept.title}
                </span>
                {isActive && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
