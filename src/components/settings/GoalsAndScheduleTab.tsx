import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Clock, Calendar, Stethoscope, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useStudentGoals, useUpsertStudentGoals, ROTATION_DEPARTMENTS, type ExamEntry, type RotationEntry } from '@/hooks/useStudentGoals';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const AMBITION_OPTIONS = [
  { value: 'top_of_class', label: 'Top of my class', description: 'I want to excel. I will commit significant daily study time and aim for distinction.' },
  { value: 'above_average', label: 'Above average', description: 'I want to perform well and stay ahead of most of my peers.' },
  { value: 'pass_comfortably', label: 'Pass comfortably', description: 'I want a solid pass with reasonable effort and balance.' },
  { value: 'just_pass', label: 'Just pass', description: 'My goal is to pass. I will focus on the essentials.' },
];

export function GoalsAndScheduleTab() {
  const { data: goals, isLoading } = useStudentGoals();
  const upsert = useUpsertStudentGoals();

  // Mark onboarding shown
  useEffect(() => {
    if (goals !== undefined && !goals?.goals_onboarding_shown) {
      upsert.mutate({ goals_onboarding_shown: true });
    }
  }, [goals]);

  // Local state
  const [ambition, setAmbition] = useState<string>('');
  const [weekdayHours, setWeekdayHours] = useState<string>('');
  const [weekendHours, setWeekendHours] = useState<string>('');
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [rotations, setRotations] = useState<RotationEntry[]>([]);

  // Sync from DB
  useEffect(() => {
    if (goals) {
      setAmbition(goals.ambition_level ?? '');
      setWeekdayHours(goals.weekday_hours?.toString() ?? '');
      setWeekendHours(goals.weekend_hours?.toString() ?? '');
      setExams(goals.exam_schedule);
      setRotations(goals.rotation_schedule);
    }
  }, [goals]);

  // Fetch modules for exam schedule
  const { data: modules } = useQuery({
    queryKey: ['modules-list'],
    queryFn: async () => {
      const { data } = await supabase.from('modules').select('id, name').order('name');
      return data ?? [];
    },
  });

  const save = async (updates: Record<string, any>) => {
    try {
      await upsert.mutateAsync(updates);
    } catch {
      toast.error('Failed to save');
    }
  };

  const handleAmbitionChange = (value: string) => {
    setAmbition(value);
    save({ ambition_level: value });
  };

  const handleStudyTimeBlur = () => {
    const wd = weekdayHours ? parseFloat(weekdayHours) : null;
    const we = weekendHours ? parseFloat(weekendHours) : null;
    save({ weekday_hours: wd, weekend_hours: we });
  };

  // Exam schedule
  const addExam = () => setExams([...exams, { module_id: '', module_name: '', exam_date: '' }]);
  const removeExam = (i: number) => {
    const next = exams.filter((_, idx) => idx !== i);
    setExams(next);
    save({ exam_schedule: next });
  };
  const updateExam = (i: number, field: keyof ExamEntry, value: string) => {
    const next = [...exams];
    next[i] = { ...next[i], [field]: value };
    if (field === 'module_id') {
      const mod = modules?.find(m => m.id === value);
      next[i].module_name = mod?.name ?? value;
    }
    setExams(next);
  };
  const saveExams = () => save({ exam_schedule: exams });

  // Rotation schedule
  const addRotation = () => setRotations([...rotations, { department: '', start_date: '', end_date: '' }]);
  const removeRotation = (i: number) => {
    const next = rotations.filter((_, idx) => idx !== i);
    setRotations(next);
    save({ rotation_schedule: next });
  };
  const updateRotation = (i: number, field: keyof RotationEntry, value: string) => {
    const next = [...rotations];
    next[i] = { ...next[i], [field]: value };
    setRotations(next);
  };
  const saveRotations = () => save({ rotation_schedule: rotations });

  if (isLoading) {
    return <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-muted rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Ambition Level */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Academic Ambition
          </CardTitle>
          <CardDescription>What's your target performance this year?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AMBITION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleAmbitionChange(opt.value)}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
                  ambition === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40 hover:bg-muted/30'
                }`}
              >
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Study Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Available Study Time
          </CardTitle>
          <CardDescription>How many hours per day can you realistically study?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weekday-hours" className="text-sm">Weekdays (hours/day)</Label>
              <Input
                id="weekday-hours"
                type="number"
                min="0"
                max="16"
                step="0.5"
                placeholder="e.g. 3"
                value={weekdayHours}
                onChange={e => setWeekdayHours(e.target.value)}
                onBlur={handleStudyTimeBlur}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekend-hours" className="text-sm">Weekends (hours/day)</Label>
              <Input
                id="weekend-hours"
                type="number"
                min="0"
                max="16"
                step="0.5"
                placeholder="e.g. 5"
                value={weekendHours}
                onChange={e => setWeekendHours(e.target.value)}
                onBlur={handleStudyTimeBlur}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exam Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Exam Schedule
          </CardTitle>
          <CardDescription>Enter your upcoming exam dates so we can prioritize your study plan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {exams.map((exam, i) => (
            <div key={i} className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
              <div className="flex-1 w-full space-y-1">
                <Label className="text-xs text-muted-foreground">Module</Label>
                <Select value={exam.module_id} onValueChange={v => updateExam(i, 'module_id', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    {modules?.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-auto space-y-1">
                <Label className="text-xs text-muted-foreground">Exam date</Label>
                <Input
                  type="date"
                  value={exam.exam_date}
                  onChange={e => updateExam(i, 'exam_date', e.target.value)}
                  onBlur={saveExams}
                  className="w-full sm:w-[160px]"
                />
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeExam(i)} className="text-destructive h-9 w-9 flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addExam} className="mt-1">
            <Plus className="w-4 h-4 mr-1" /> Add exam
          </Button>
        </CardContent>
      </Card>

      {/* Rotation Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="h-4 w-4" />
            Rotation Schedule
          </CardTitle>
          <CardDescription>Which hospital department are you rotating through? Heavy rotations reduce available study time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rotations.map((rot, i) => (
            <div key={i} className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
              <div className="flex-1 w-full space-y-1">
                <Label className="text-xs text-muted-foreground">Department</Label>
                <Select value={rot.department} onValueChange={v => updateRotation(i, 'department', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROTATION_DEPARTMENTS.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                    <SelectItem value="__custom">Other (type below)</SelectItem>
                  </SelectContent>
                </Select>
                {rot.department === '__custom' && (
                  <Input
                    placeholder="Enter department name"
                    onChange={e => updateRotation(i, 'department', e.target.value)}
                    onBlur={saveRotations}
                    className="mt-1"
                  />
                )}
              </div>
              <div className="w-full sm:w-auto space-y-1">
                <Label className="text-xs text-muted-foreground">Start date</Label>
                <Input
                  type="date"
                  value={rot.start_date}
                  onChange={e => updateRotation(i, 'start_date', e.target.value)}
                  onBlur={saveRotations}
                  className="w-full sm:w-[140px]"
                />
              </div>
              <div className="w-full sm:w-auto space-y-1">
                <Label className="text-xs text-muted-foreground">End date</Label>
                <Input
                  type="date"
                  value={rot.end_date}
                  onChange={e => updateRotation(i, 'end_date', e.target.value)}
                  onBlur={saveRotations}
                  className="w-full sm:w-[140px]"
                />
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeRotation(i)} className="text-destructive h-9 w-9 flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addRotation} className="mt-1">
            <Plus className="w-4 h-4 mr-1" /> Add rotation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
