import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookOpen, GalleryHorizontal, CalendarCheck, FlaskConical, Compass, HelpCircle, Upload, BarChart3, MessageSquare, Flag, Inbox, Stethoscope, BookOpenCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WorkflowGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'student' | 'admin';
}

const studentSteps = [
  { icon: GalleryHorizontal, title: 'Daily Reviews first', description: 'FSRS flashcards before new material. Ten minutes daily = hours saved at exams.' },
  { icon: CalendarCheck, title: 'Follow priorities', description: 'Picked from your weak chapters, tier, and exam dates. A second opinion on what to study.' },
  { icon: BookOpen, title: 'Resources: Learn', description: 'Videos, flashcards, visual explanations, Socratic documents.' },
  { icon: Stethoscope, title: 'Interactive: Apply', description: 'Clinical cases, structured cases, virtual patient — after Resources.' },
  { icon: FlaskConical, title: 'Practice: Stress-test', description: 'MCQs, SBA, OSCE, short essays, case scenarios. Non-negotiable.' },
  { icon: BookOpenCheck, title: 'Test Yourself', description: 'Chapter exam in your chosen format. Pass it → bar turns green.' },
  { icon: HelpCircle, title: 'Coach: grounded help', description: 'Bottom-right icon. Reads your chapter PDF and answers from it.' },
  { icon: BarChart3, title: 'Progress: honest verdict', description: 'Sidebar Coach → Progress. Readiness, weak chapters, days to exam. Weekly.' },
];

const adminSteps = [
  { icon: Upload, title: 'Manage content', description: 'Upload and organize materials by module and chapter.' },
  { icon: BarChart3, title: 'Monitor engagement', description: 'Check analytics for student activity and weak areas.' },
  { icon: MessageSquare, title: 'Review feedback', description: 'Look at reactions and content issues.' },
  { icon: Inbox, title: 'Respond to students', description: 'Use Inbox to answer questions and support learning.' },
  { icon: Flag, title: 'Improve content', description: 'Update or flag low-quality materials.' },
];

export function WorkflowGuide({ open, onOpenChange, mode }: WorkflowGuideProps) {
  const steps = mode === 'student' ? studentSteps : adminSteps;
  const title = mode === 'student' ? 'How to use KALM daily' : 'Admin workflow';

  const handleOpen = (isOpen: boolean) => {
    if (!isOpen) {
      const key = mode === 'student' ? 'kalm_workflow_student_seen' : 'kalm_workflow_admin_seen';
      localStorage.setItem(key, 'true');
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 mt-2">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary shrink-0 text-xs font-bold">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{step.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
