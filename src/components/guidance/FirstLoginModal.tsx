import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

export function FirstLoginModal({ role, onStartTour, onOpenWorkflow }: FirstLoginModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const key = KEYS[role];
    const shown = localStorage.getItem(key);
    if (!shown) {
      // Delay so the page renders first
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [role]);

  const handleClose = () => {
    localStorage.setItem(KEYS[role], 'true');
    setOpen(false);
  };

  const handleTour = () => {
    handleClose();
    // Small delay so modal closes first
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
          <Button variant="ghost" onClick={handleClose} className="text-xs text-muted-foreground">
            Skip for now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
