import { useState, useMemo } from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CaseScenario } from '@/hooks/useCaseScenarios';
import { CaseScenarioDetailModal } from './CaseScenarioDetailModal';
import { useCaseScenarioWithQuestions } from '@/hooks/useCaseScenarios';

interface CaseScenarioListProps {
  scenarios: CaseScenario[];
  isAdmin?: boolean;
}

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  difficult: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function CaseCard({ scenario, idx, onClick }: { scenario: CaseScenario; idx: number; onClick: () => void }) {
  // Lightweight question count fetch
  const { data: detail } = useCaseScenarioWithQuestions(scenario.id);
  const questionCount = detail?.questions?.length ?? 0;

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${scenario.is_deleted ? 'opacity-50' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Case {idx + 1}
              </span>
              <Badge
                variant="outline"
                className={difficultyColors[scenario.difficulty] || ''}
              >
                {scenario.difficulty}
              </Badge>
              {questionCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {questionCount} {questionCount === 1 ? 'part' : 'parts'}
                </Badge>
              )}
              {scenario.is_deleted && (
                <Badge variant="destructive" className="text-xs">Deleted</Badge>
              )}
            </div>
            <p className="text-sm line-clamp-3">{scenario.stem}</p>
            {scenario.tags && scenario.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {scenario.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CaseScenarioList({ scenarios, isAdmin }: CaseScenarioListProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const visible = useMemo(
    () => (isAdmin ? scenarios : scenarios.filter(s => !s.is_deleted)),
    [scenarios, isAdmin]
  );

  if (visible.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No Case Qs available yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {visible.map((scenario, idx) => (
          <CaseCard
            key={scenario.id}
            scenario={scenario}
            idx={idx}
            onClick={() => setSelectedIndex(idx)}
          />
        ))}
      </div>

      <CaseScenarioDetailModal
        open={selectedIndex !== null}
        onOpenChange={(open) => { if (!open) setSelectedIndex(null); }}
        scenarios={visible}
        initialIndex={selectedIndex ?? 0}
        isAdmin={isAdmin}
      />
    </>
  );
}
