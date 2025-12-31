import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CalendarDays, BookOpen, Clock, Shield, LayoutGrid, Info } from 'lucide-react';

interface Module {
  id: string;
  name: string;
}

interface LearningHubStudyPlanProps {
  moduleSelected: boolean;
  modules: Module[];
  selectedYearName: string;
}

// Predefined module weight classifications
const MODULE_WEIGHTS: Record<string, 'heavy+' | 'heavy' | 'light'> = {
  'medicine': 'heavy+',
  'internal medicine': 'heavy+',
  'general surgery': 'heavy',
  'surgery': 'heavy',
};

function getModuleWeight(moduleName: string): 'heavy+' | 'heavy' | 'light' {
  const normalizedName = moduleName.toLowerCase();
  for (const [key, weight] of Object.entries(MODULE_WEIGHTS)) {
    if (normalizedName.includes(key)) {
      return weight;
    }
  }
  return 'light';
}

function getWeightLabel(weight: 'heavy+' | 'heavy' | 'light'): string {
  switch (weight) {
    case 'heavy+': return 'Heavy+';
    case 'heavy': return 'Heavy';
    case 'light': return 'Light';
  }
}

function getWeightColor(weight: 'heavy+' | 'heavy' | 'light'): string {
  switch (weight) {
    case 'heavy+': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'heavy': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    case 'light': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  }
}

function getChunkWidth(weight: 'heavy+' | 'heavy' | 'light'): string {
  switch (weight) {
    case 'heavy+': return 'flex-[3]';
    case 'heavy': return 'flex-[2.5]';
    case 'light': return 'flex-[1]';
  }
}

export function LearningHubStudyPlan({ moduleSelected, modules, selectedYearName }: LearningHubStudyPlanProps) {
  // Show placeholder if no module selected
  if (!moduleSelected) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Study planning will appear after selecting a module.</p>
          <p className="text-sm mt-2">Choose a module from the selector above to see your personalized study plan.</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate module chunks with weights
  const moduleChunks = modules.map(mod => ({
    id: mod.id,
    name: mod.name,
    weight: getModuleWeight(mod.name),
  }));

  return (
    <div className="space-y-6">
      {/* Year Plan Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <LayoutGrid className="w-5 h-5" />
              Year Plan
            </CardTitle>
            <Badge variant="secondary" className="text-xs font-normal">
              {selectedYearName} • Covers all modules
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Year Overview Timeline */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="font-medium">Module Timeline (Big Chunks)</span>
            </div>
            
            {/* Timeline visualization */}
            <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
              {/* Module chunks row */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {moduleChunks.map((chunk) => (
                  <div 
                    key={chunk.id}
                    className={`${getChunkWidth(chunk.weight)} min-w-[100px] p-3 rounded-lg border bg-background hover:shadow-sm transition-shadow`}
                  >
                    <p className="font-medium text-sm truncate mb-1">{chunk.name}</p>
                    <Badge className={`${getWeightColor(chunk.weight)} text-xs`}>
                      {getWeightLabel(chunk.weight)}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Revision blocks */}
              <div className="flex gap-2 border-t border-border/50 pt-4">
                <div className="flex-1 p-3 rounded-lg border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <p className="font-medium text-sm text-amber-700 dark:text-amber-300">Revision 1</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Protected block</p>
                </div>
                <div className="flex-1 p-3 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <p className="font-medium text-sm text-purple-700 dark:text-purple-300">Final Revision</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Protected block</p>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-200 dark:bg-red-800" />
                <span>Heavy+ (largest)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-orange-200 dark:bg-orange-800" />
                <span>Heavy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-800" />
                <span>Light (smallest)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-amber-500" />
                <span>Protected (cannot be modified)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase 2 Placeholder - Manual Time Chunks */}
      <Card className="border-dashed">
        <CardContent className="py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">Manual Time Chunks</span>
                <Badge variant="outline" className="text-xs">Coming Soon</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                You'll be able to assign module time blocks and the system will check feasibility.
              </p>
              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md mt-3">
                <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  When enabled, you can set date ranges for each module. The system will validate if your plan is achievable and suggest adjustments if needed. Revision blocks remain protected.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <Switch disabled checked={false} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module-specific study plan placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Chapter Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-6 border border-dashed rounded-lg text-center text-muted-foreground">
            <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Book-Based Chapter Planning</p>
            <p className="text-sm mt-2">
              A detailed chapter-by-chapter schedule for the selected module will be available here.
            </p>
            <p className="text-sm mt-1 text-muted-foreground/70">
              This feature integrates with the Anki-like spaced repetition engine.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
