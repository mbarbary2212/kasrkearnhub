import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MatchingQuestion, MatchItem } from '@/hooks/useMatchingQuestions';

interface MatchingQuestionCardProps {
  question: MatchingQuestion;
  index: number;
  isAdmin: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
}

export function MatchingQuestionCard({ 
  question, 
  index, 
  isAdmin, 
  onEdit, 
  onDelete,
  isExpanded,
  onToggleExpand
}: MatchingQuestionCardProps) {
  const [selectedMatches, setSelectedMatches] = useState<Record<string, string>>({});
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const showAnswer = isExpanded ?? false;

  // Shuffle column B items for student view (deterministic based on question id)
  const shuffledColumnB = useMemo(() => {
    if (isAdmin) return question.column_b_items;
    
    const items = [...question.column_b_items];
    // Simple shuffle based on question id as seed
    const seed = question.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    for (let i = items.length - 1; i > 0; i--) {
      const j = (seed + i) % (i + 1);
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }, [question.column_b_items, question.id, isAdmin]);

  const handleSelectA = (id: string) => {
    if (submitted) return;
    setSelectedA(id);
  };

  const handleSelectB = (id: string) => {
    if (submitted || !selectedA) return;
    
    setSelectedMatches(prev => ({
      ...prev,
      [selectedA]: id
    }));
    setSelectedA(null);
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const handleReset = () => {
    setSelectedMatches({});
    setSelectedA(null);
    setSubmitted(false);
  };

  const getScore = () => {
    let correct = 0;
    Object.entries(selectedMatches).forEach(([aId, bId]) => {
      if (question.correct_matches[aId] === bId) {
        correct++;
      }
    });
    return { correct, total: question.column_a_items.length };
  };

  const isMatchCorrect = (aId: string): boolean | null => {
    if (!submitted) return null;
    const selectedB = selectedMatches[aId];
    if (!selectedB) return false;
    return question.correct_matches[aId] === selectedB;
  };

  const getItemBStyle = (item: MatchItem) => {
    const isSelectedTarget = selectedA && selectedMatches[selectedA] === item.id;
    const isMatched = Object.values(selectedMatches).includes(item.id);
    
    if (submitted) {
      // Check if this B item is correctly matched
      const matchedA = Object.entries(selectedMatches).find(([_, bId]) => bId === item.id)?.[0];
      if (matchedA && question.correct_matches[matchedA] === item.id) {
        return 'border-green-500 bg-green-50 dark:bg-green-950';
      }
      if (isMatched) {
        return 'border-red-500 bg-red-50 dark:bg-red-950';
      }
    }
    
    if (isMatched) return 'border-primary bg-primary/10';
    return 'border-border hover:border-primary/50';
  };

  const getItemAStyle = (item: MatchItem) => {
    const isSelected = selectedA === item.id;
    const hasMatch = selectedMatches[item.id];
    
    if (submitted) {
      const correct = isMatchCorrect(item.id);
      if (correct === true) return 'border-green-500 bg-green-50 dark:bg-green-950';
      if (correct === false) return 'border-red-500 bg-red-50 dark:bg-red-950';
    }
    
    if (isSelected) return 'border-primary ring-2 ring-primary/50 bg-primary/10';
    if (hasMatch) return 'border-primary bg-primary/5';
    return 'border-border hover:border-primary/50';
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="font-mono">
                Q{index + 1}
              </Badge>
              {/* Difficulty badge - only visible to admins */}
              {isAdmin && question.difficulty && (
                <Badge 
                  variant="secondary"
                  className={cn(
                    'text-xs',
                    question.difficulty === 'easy' && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                    question.difficulty === 'medium' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
                    question.difficulty === 'hard' && 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  )}
                >
                  {question.difficulty}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border-purple-200">
                Matching
              </Badge>
            </div>
            <p className="text-base font-medium leading-relaxed">{question.instruction}</p>
          </div>
          
          {/* Admin controls */}
          {isAdmin && (
            <div
              className="flex items-center gap-1 shrink-0"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="h-8 w-8 p-0"
                title="Edit Question"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Delete Question"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Matching Interface */}
        <div className="grid grid-cols-2 gap-4">
          {/* Column A */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground mb-2">Column A</p>
            {question.column_a_items.map((item, i) => (
              <button
                key={item.id}
                onClick={() => handleSelectA(item.id)}
                disabled={submitted}
                className={cn(
                  "w-full p-3 rounded-lg border-2 text-left transition-all text-sm",
                  getItemAStyle(item),
                  !submitted && "cursor-pointer"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">{i + 1}.</span>
                  <span className="flex-1">{item.text}</span>
                  {submitted && (
                    isMatchCorrect(item.id) 
                      ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                      : <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                {selectedMatches[item.id] && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    → {shuffledColumnB.find(b => b.id === selectedMatches[item.id])?.text}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Column B */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground mb-2">Column B</p>
            {shuffledColumnB.map((item, i) => (
              <button
                key={item.id}
                onClick={() => handleSelectB(item.id)}
                disabled={submitted || !selectedA}
                className={cn(
                  "w-full p-3 rounded-lg border-2 text-left transition-all text-sm",
                  getItemBStyle(item),
                  !submitted && selectedA && "cursor-pointer"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
                  <span className="flex-1">{item.text}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Score and Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          {submitted ? (
            <>
              <div className="flex items-center gap-2">
                <Badge variant={getScore().correct === getScore().total ? "default" : "secondary"}>
                  Score: {getScore().correct}/{getScore().total}
                </Badge>
              </div>
              <div className="flex gap-2">
                {onToggleExpand && (
                  <Button variant="ghost" size="sm" onClick={() => onToggleExpand(question.id)}>
                    {showAnswer ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                    {showAnswer ? 'Hide Answer' : 'Show Answer'}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Try Again
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {selectedA ? 'Now select an item from Column B' : 'Select an item from Column A to start matching'}
              </p>
              <Button 
                size="sm" 
                onClick={handleSubmit}
                disabled={Object.keys(selectedMatches).length < question.column_a_items.length}
              >
                Submit
              </Button>
            </>
          )}
        </div>

        {/* Explanation */}
        {showAnswer && question.show_explanation && question.explanation && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            <p className="text-sm font-medium mb-1">Explanation:</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{question.explanation}</p>
          </div>
        )}

        {/* Correct answers for admin */}
        {showAnswer && isAdmin && (
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm font-medium mb-1 text-blue-700 dark:text-blue-300">Correct Matches:</p>
            <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
              {question.column_a_items.map(aItem => {
                const bItem = question.column_b_items.find(b => b.id === question.correct_matches[aItem.id]);
                return (
                  <li key={aItem.id}>
                    {aItem.text} → {bItem?.text || 'N/A'}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
