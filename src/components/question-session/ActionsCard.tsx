import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface ActionsCardProps {
  onRepeat: () => void;
}

export function ActionsCard({ onRepeat }: ActionsCardProps) {
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onRepeat}
          className="w-full gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Repeat Question
        </Button>
      </CardContent>
    </Card>
  );
}
