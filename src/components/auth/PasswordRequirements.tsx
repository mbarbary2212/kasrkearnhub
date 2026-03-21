import { cn } from '@/lib/utils';
import { Check, Circle } from 'lucide-react';

interface PasswordRequirementsProps {
  password?: string;
  mode?: 'static' | 'live';
  className?: string;
}

export function validatePasswordStrength(password: string) {
  return {
    hasMinLength: password.length >= 8,
    hasMaxLength: password.length <= 64,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
  };
}

export function isPasswordValid(password: string) {
  const v = validatePasswordStrength(password);
  return v.hasMinLength && v.hasMaxLength && v.hasLowercase && v.hasUppercase && v.hasNumber && v.hasSymbol;
}

export function PasswordRequirements({ 
  password = '', 
  mode = 'static',
  className 
}: PasswordRequirementsProps) {
  const v = validatePasswordStrength(password);
  
  if (mode === 'static') {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        Must be 8–64 characters and include a lowercase letter, uppercase letter, number, and symbol.
      </p>
    );
  }
  
  const requirements = [
    { label: '8–64 characters', met: v.hasMinLength && v.hasMaxLength },
    { label: 'Contains a lowercase letter', met: v.hasLowercase },
    { label: 'Contains an uppercase letter', met: v.hasUppercase },
    { label: 'Contains a number', met: v.hasNumber },
    { label: 'Contains a symbol', met: v.hasSymbol },
  ];
  
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs text-muted-foreground mb-1">
        Password requirements:
      </p>
      {requirements.map((req, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs">
          {req.met ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Circle className="h-3 w-3 text-muted-foreground" />
          )}
          <span className={cn(
            req.met ? "text-green-600" : "text-muted-foreground"
          )}>
            {req.label}
          </span>
        </div>
      ))}
    </div>
  );
}
