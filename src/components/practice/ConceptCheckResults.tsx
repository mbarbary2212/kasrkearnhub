import { VPRubricResult } from '@/types/virtualPatient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, X, ChevronDown, Star, Award, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ConceptCheckResultsProps {
  result: VPRubricResult;
  modelAnswer: string;
  onNext: () => void;
  isLastQuestion: boolean;
  questionNumber: number;
  totalQuestions: number;
}

export function ConceptCheckResults({
  result,
  modelAnswer,
  onNext,
  isLastQuestion,
  questionNumber,
  totalQuestions,
}: ConceptCheckResultsProps) {
  const [showModel, setShowModel] = useState(false);
  
  const scorePercent = Math.round(result.score * 100);
  const passedRequired = result.matched_required.length;
  const totalRequired = passedRequired + result.missing_required.length;
  const hasOptional = result.matched_optional.length > 0;

  // Determine result status
  const isPass = result.is_correct;
  const needsWork = !isPass && scorePercent >= 40;

  return (
    <div className="space-y-4">
      {/* Score Header */}
      <Card className={cn(
        "border-2",
        isPass ? "border-green-500/30 bg-green-50/30 dark:bg-green-950/10" : 
        needsWork ? "border-yellow-500/30 bg-yellow-50/30 dark:bg-yellow-950/10" :
        "border-red-500/30 bg-red-50/30 dark:bg-red-950/10"
      )}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center",
              isPass ? "bg-green-500" : needsWork ? "bg-yellow-500" : "bg-red-500"
            )}>
              {isPass ? (
                <Award className="w-7 h-7 text-white" />
              ) : needsWork ? (
                <AlertCircle className="w-7 h-7 text-white" />
              ) : (
                <X className="w-7 h-7 text-white" />
              )}
            </div>
            <div>
              <h3 className={cn(
                "text-lg font-semibold",
                isPass ? "text-green-700 dark:text-green-400" :
                needsWork ? "text-yellow-700 dark:text-yellow-400" :
                "text-red-700 dark:text-red-400"
              )}>
                {isPass ? "Great Work!" : needsWork ? "Good Effort!" : "Keep Studying!"}
              </h3>
              <p className="text-sm text-muted-foreground">
                Score: <span className="font-semibold">{scorePercent}%</span>
                {' '}({passedRequired}/{totalRequired} required concepts)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Required Concepts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            Required Concepts
            <Badge variant="outline" className="ml-auto">
              {passedRequired}/{totalRequired}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {result.matched_required.map((concept, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-green-700 dark:text-green-400">{concept}</span>
            </div>
          ))}
          {result.missing_required.map((concept, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <X className="w-3 h-3 text-red-600" />
              </div>
              <span className="text-red-700 dark:text-red-400">{concept}</span>
              <Badge variant="outline" className="text-[10px] h-4">missing</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Optional Concepts (if any matched) */}
      {hasOptional && (
        <Card className="border-amber-500/20 bg-amber-50/20 dark:bg-amber-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Bonus Concepts Matched
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.matched_optional.map((concept, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Star className="w-3 h-3 text-amber-600 fill-amber-600" />
                </div>
                <span className="text-amber-700 dark:text-amber-400">{concept}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Model Answer Collapsible */}
      <Collapsible open={showModel} onOpenChange={setShowModel}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span>View Model Answer</span>
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              showModel && "rotate-180"
            )} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <p className="text-sm whitespace-pre-wrap">{modelAnswer}</p>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Next Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={onNext} size="lg">
          {isLastQuestion ? 'Complete' : 'Next Question'} →
        </Button>
      </div>
    </div>
  );
}
