import { GraduationCap } from 'lucide-react';

interface DashboardHeaderProps {
  firstName: string;
  examTarget: string;
}

export function DashboardHeader({ firstName, examTarget }: DashboardHeaderProps) {
  return (
    <header className="py-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-foreground">
            Welcome, <span className="text-gradient-medical">{firstName}</span>
          </h1>
          <div className="flex items-center gap-2 mt-2 text-muted-foreground">
            <GraduationCap className="w-4 h-4" />
            <span className="text-sm">Target: {examTarget}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
