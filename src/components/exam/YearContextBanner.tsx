import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertTriangle } from 'lucide-react';

interface YearContextBannerProps {
  /** True when the user has no preferred_year_id set on their profile. */
  noYearSet?: boolean;
  /** True when the loaded module belongs to a different year than the user's preferred year. */
  yearMismatch?: boolean;
}

/**
 * Soft, non-blocking notice shown above exam UIs when the student's
 * `preferred_year_id` is missing or doesn't match the module being viewed.
 * Admins should never see this — gate the render at the call-site.
 */
export function YearContextBanner({ noYearSet, yearMismatch }: YearContextBannerProps) {
  if (!noYearSet && !yearMismatch) return null;

  if (yearMismatch) {
    return (
      <Alert className="border-amber-500/40 bg-amber-500/10">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-sm">
          This exam belongs to a different academic year than your profile.{' '}
          <Link to="/account" className="font-medium underline underline-offset-2">
            Update your year in Account Settings
          </Link>{' '}
          to keep your schedule aligned.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-primary/30 bg-primary/5">
      <Info className="h-4 w-4 text-primary" />
      <AlertDescription className="text-sm">
        Set your year in{' '}
        <Link to="/account" className="font-medium underline underline-offset-2">
          Account Settings
        </Link>{' '}
        to see exams tailored to your year.
      </AlertDescription>
    </Alert>
  );
}
