import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Compass, BookOpen } from 'lucide-react';

interface FirstLoginModalProps {
  role: 'student' | 'admin';
  onStartTour: () => void;
  onOpenWorkflow: () => void;
}

const KEYS = {
  student: 'kalm_first_login_student_shown',
  admin: 'kalm_first_login_admin_shown',
};

const TOUR_KEYS = {
  student: 'kalm_tour_student_done',
  admin: 'kalm_tour_admin_done',
};

export function FirstLoginModal({ role, onStartTour, onOpenWorkflow }: FirstLoginModalProps) {
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const key = KEYS[role];
    const shown = localStorage.getItem(key);
    if (!shown) {
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [role]);

  const handleClose = () => {
    localStorage.setItem(KEYS[role], 'true');
    if (dontShowAgain) {
      localStorage.setItem(TOUR_KEYS[role], 'true');
    }
    setOpen(false);
  };

  const handleTour = () => {
    handleClose();
    setTimeout(() => onStartTour(), 300);
  };

  const handleWorkflow = () => {
    handleClose();
    setTimeout(() => onOpenWorkflow(), 300);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg">Welcome to KALM Hub 👋</DialogTitle>
          <DialogDescription className="text-sm">
            {role === 'student'
              ? 'Get started by exploring the platform or learning how to study effectively.'
              : 'Get familiar with your admin tools and workflows.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          <Button onClick={handleTour} className="gap-2 justify-start h-11">
            <Compass className="h-4 w-4" />
            Take a quick tour
          </Button>
          <Button variant="outline" onClick={handleWorkflow} className="gap-2 justify-start h-11">
            <BookOpen className="h-4 w-4" />
            Learn how to use the app
          </Button>
          <div className="flex items-center gap-2 mt-1 px-1">
            <Checkbox
              id="dont-show"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <label htmlFor="dont-show" className="text-xs text-muted-foreground cursor-pointer">
              Don't show this again
            </label>
          </div>
          <Button variant="ghost" onClick={handleClose} className="text-xs text-muted-foreground">
            {dontShowAgain ? 'Skip' : 'Skip for now'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
