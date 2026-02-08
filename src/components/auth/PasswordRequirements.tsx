import { cn } from '@/lib/utils';
import { Check, Circle } from 'lucide-react';

interface PasswordRequirementsProps {
  password?: string;
  mode?: 'static' | 'live';
  className?: string;
}

export function PasswordRequirements({ 
  password = '', 
  mode = 'static',
  className 
}: PasswordRequirementsProps) {
  const hasMinLength = password.length >= 8;
  const hasMaxLength = password.length <= 64;
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (mode === 'static') {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        Recommended: 8–64 characters. Using a number and symbol can improve strength.
      </p>
    );
  }
  
  // Live mode - show recommendations with checkmarks
  const recommendations = [
    { label: '8–64 characters', met: hasMinLength && hasMaxLength, required: true },
    { label: 'Contains a number', met: hasNumber, required: false },
    { label: 'Contains a symbol', met: hasSymbol, required: false },
  ];
  
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs text-muted-foreground mb-1">
        Password requirements:
      </p>
      {recommendations.map((rec, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs">
          {rec.met ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Circle className="h-3 w-3 text-muted-foreground" />
          )}
          <span className={cn(
            rec.met ? "text-green-600" : "text-muted-foreground"
          )}>
            {rec.label}
            {!rec.required && <span className="text-muted-foreground/70"> (recommended)</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
