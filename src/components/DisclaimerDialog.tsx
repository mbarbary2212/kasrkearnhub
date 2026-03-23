import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldCheck } from 'lucide-react';

const DISCLAIMER_KEY = 'kalm_disclaimer_accepted';

interface DisclaimerDialogProps {
  onAccept: () => void;
}

export function DisclaimerDialog({ onAccept }: DisclaimerDialogProps) {
  const [agreed, setAgreed] = useState(false);

  const handleAccept = () => {
    localStorage.setItem(DISCLAIMER_KEY, 'true');
    onAccept();
  };

  return (
    <AlertDialog open>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Welcome to the Platform
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p className="text-foreground font-medium">
            This platform is designed to help you understand and revise the curriculum in a simpler, more interactive way.
          </p>

          <p className="font-medium text-foreground">Please note:</p>

          <ul className="space-y-2 ml-1">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              It's a learning support tool, not a replacement for lectures or official materials
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Content is aligned with the curriculum, but exams are set independently by the Faculty
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              As this is a beta version, you may come across some errors or incomplete parts
            </li>
          </ul>

          <p>
            We really appreciate you taking the time to try the app and help us improve it—your feedback and suggestions are very welcome.
          </p>

          <p className="font-medium text-amber-600 dark:text-amber-400">
            At this stage, please don't rely on the app alone for studying. Once we're confident everything is working well, it will become a much more reliable study tool for you.
          </p>
        </div>

        <div className="flex items-start gap-3 mt-2 p-3 rounded-lg border bg-muted/30">
          <Checkbox
            id="disclaimer-agree"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
            className="mt-0.5"
          />
          <label
            htmlFor="disclaimer-agree"
            className="text-sm cursor-pointer select-none leading-snug"
          >
            I understand and confirm that I will use the platform for learning purposes only.
          </label>
        </div>

        <AlertDialogFooter>
          <Button onClick={handleAccept} disabled={!agreed} className="w-full sm:w-auto">
            Continue
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { DISCLAIMER_KEY };
