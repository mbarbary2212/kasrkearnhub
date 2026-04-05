import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookOpen, GalleryHorizontal, CalendarCheck, FlaskConical, Compass, HelpCircle, Upload, BarChart3, MessageSquare, Flag, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'student' | 'admin';
}

const studentSteps = [
  { icon: BookOpen, title: 'Start here', description: 'Resume from where you left off using the continue card.' },
  { icon: GalleryHorizontal, title: 'Complete your reviews', description: 'Do your flashcards first to maintain retention.' },
  { icon: CalendarCheck, title: "Follow today's priorities", description: 'Use the suggested tasks instead of choosing randomly.' },
  { icon: FlaskConical, title: 'Practice', description: 'Test your understanding and identify weak areas.' },
  { icon: Compass, title: 'Go deeper when needed', description: 'Use modules to explore topics more thoroughly.' },
  { icon: HelpCircle, title: 'Ask for help', description: 'Use Connect when something is unclear.' },
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
