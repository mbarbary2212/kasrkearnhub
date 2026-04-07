import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, CheckCircle2, ArrowRight, BookOpen, ClipboardList, FileText } from 'lucide-react';
import { DashboardData } from '@/hooks/useStudentDashboard';

interface LearningHubUnlocksProps {
  dashboard: DashboardData;
  moduleSelected: boolean;
}

interface UnlockLevel {
  level: number;
  title: string;
  description: string;
  unlockCriteria: string;
  assessments: string[];
  isUnlocked: boolean;
  progress: number; // 0-100
  icon: React.ReactNode;
}

export function LearningHubUnlocks({ dashboard, moduleSelected }: LearningHubUnlocksProps) {
  if (!moduleSelected) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Unlock formative assessments as you progress.</p>
          <p className="text-sm mt-2">Select a module above to view your unlock status.</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate unlock levels based on engagement
  const unlockLevels = calculateUnlockLevels(dashboard);
  const currentLevel = unlockLevels.findIndex(l => !l.isUnlocked);
  const nextUnlock = unlockLevels.find(l => !l.isUnlocked);

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Unlock className="w-5 h-5" />
            Formative Assessment Access
          </CardTitle>
          <CardDescription>
            Access to assessments is unlocked gradually as you engage with the module content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-3xl font-bold text-primary">
              Level {currentLevel === -1 ? 3 : currentLevel}
            </div>
            <div className="text-muted-foreground">
              {currentLevel === -1 ? 'All levels unlocked' : `of 3 unlocked`}
            </div>
          </div>
          
          {nextUnlock && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">To unlock Level {nextUnlock.level}:</p>
              <p className="text-sm text-muted-foreground">{nextUnlock.unlockCriteria}</p>
              <div className="mt-3">
                <Progress value={nextUnlock.progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{nextUnlock.progress}% complete</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unlock Levels */}
      <div className="grid gap-4">
        {unlockLevels.map((level) => (
          <Card 
            key={level.level} 
            className={level.isUnlocked ? 'border-primary/30 bg-primary/5' : 'opacity-75'}
          >
            <CardContent className="py-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${level.isUnlocked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {level.isUnlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{level.title}</h3>
                    {level.isUnlocked && (
                      <Badge variant="outline" className="text-primary border-primary/30">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Unlocked
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">{level.description}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {level.assessments.map((assessment, idx) => (
                      <Badge 
                        key={idx} 
                        variant={level.isUnlocked ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {level.icon}
                        <span className="ml-1">{assessment}</span>
                      </Badge>
                    ))}
                  </div>

                  {!level.isUnlocked && (
                    <div className="mt-3 text-sm text-muted-foreground">
                      <span className="font-medium">Unlock requirement:</span> {level.unlockCriteria}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Year Overview Coming Soon */}
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <p className="text-sm font-medium text-muted-foreground">Year Overview (Coming Soon)</p>
          <p className="text-xs text-muted-foreground mt-1">
            A summary of your progress across all modules in the selected year will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function calculateUnlockLevels(dashboard: DashboardData): UnlockLevel[] {
  const { chapters, coverageCompleted, coverageTotal } = dashboard;
  
  // Calculate engagement metrics
  const totalChapters = chapters.length;
  const chaptersStarted = chapters.filter(c => c.status !== 'not_started').length;
  const chaptersCompleted = chapters.filter(c => c.status === 'completed').length;
  
  // Level 1: Always unlocked
  const level1Unlocked = true;
  
  // Level 2: Unlock after interacting with at least 1 chapter (any progress)
  const level2Unlocked = chaptersStarted >= 1;
  const level2Progress = totalChapters > 0 ? Math.min(100, (chaptersStarted / 1) * 100) : 0;
  
  // Level 3: Unlock after completing at least 2 chapters or 25% of chapters
  const level3Threshold = Math.max(2, Math.ceil(totalChapters * 0.25));
  const level3Unlocked = chaptersCompleted >= level3Threshold;
  const level3Progress = totalChapters > 0 ? Math.min(100, (chaptersCompleted / level3Threshold) * 100) : 0;

  return [
    {
      level: 1,
      title: 'Foundation Level',
      description: 'Basic self-assessment materials to get started with the module.',
      unlockCriteria: 'Available by default when you select a module.',
      assessments: ['Basic MCQs', 'Chapter Summaries'],
      isUnlocked: level1Unlocked,
      progress: 100,
      icon: <BookOpen className="w-3 h-3" />,
    },
    {
      level: 2,
      title: 'Practice Level',
      description: 'Extended practice questions and formative exercises.',
      unlockCriteria: 'Begin studying at least one chapter in this module.',
      assessments: ['Extended MCQs', 'Short Questions', 'Matching Questions'],
      isUnlocked: level2Unlocked,
      progress: level2Progress,
      icon: <ClipboardList className="w-3 h-3" />,
    },
    {
      level: 3,
      title: 'Advanced Level',
      description: 'Comprehensive assessments including case scenarios.',
      unlockCriteria: `Complete ${level3Threshold} chapter${level3Threshold > 1 ? 's' : ''} to unlock advanced materials.`,
      assessments: ['Case Scenarios', 'Comprehensive MCQs', 'Practical Exercises'],
      isUnlocked: level3Unlocked,
      progress: level3Progress,
      icon: <FileText className="w-3 h-3" />,
    },
  ];
}
