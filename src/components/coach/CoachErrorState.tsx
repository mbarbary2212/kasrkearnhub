import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertCircle, LogIn, MessageSquare, Clock, Search } from 'lucide-react';

export type CoachErrorCode = 
  | 'AUTH_REQUIRED'
  | 'COACH_DISABLED' 
  | 'QUOTA_EXCEEDED' 
  | 'RAG_NO_RESULTS' 
  | 'INJECTION_DETECTED';

interface CoachErrorStateProps {
  code: CoachErrorCode;
  title: string;
  message: string;
  onClose: () => void;
}

const ERROR_CONFIG: Record<CoachErrorCode, { icon: typeof AlertCircle; color: string }> = {
  AUTH_REQUIRED: { icon: LogIn, color: 'text-primary' },
  COACH_DISABLED: { icon: AlertCircle, color: 'text-amber-500' },
  QUOTA_EXCEEDED: { icon: Clock, color: 'text-blue-500' },
  RAG_NO_RESULTS: { icon: Search, color: 'text-muted-foreground' },
  INJECTION_DETECTED: { icon: AlertCircle, color: 'text-destructive' },
};

export function CoachErrorState({ code, title, message, onClose }: CoachErrorStateProps) {
  const navigate = useNavigate();
  const config = ERROR_CONFIG[code] || ERROR_CONFIG.COACH_DISABLED;
  const Icon = config.icon;

  const handleOpenFeedback = () => {
    onClose();
    navigate('/feedback');
  };

  const handleOpenAuth = () => {
    onClose();
    navigate('/auth');
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <div className={`inline-flex p-3 rounded-full bg-muted ${config.color}`}>
          <Icon className="h-8 w-8" />
        </div>
        
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{message}</p>

        <div className="flex flex-col gap-2 pt-2">
          {code === 'AUTH_REQUIRED' ? (
            <Button onClick={handleOpenAuth} className="w-full">
              <LogIn className="h-4 w-4 mr-2" />
              Sign in to use Study Coach
            </Button>
          ) : (
            <Button onClick={handleOpenFeedback} className="w-full">
              <MessageSquare className="h-4 w-4 mr-2" />
              Open Feedback & Inquiries
            </Button>
          )}
          
          {code === 'QUOTA_EXCEEDED' && (
            <Button variant="outline" onClick={onClose} className="w-full">
              <Clock className="h-4 w-4 mr-2" />
              Try again tomorrow
            </Button>
          )}
          
          {code !== 'QUOTA_EXCEEDED' && (
            <Button variant="ghost" onClick={onClose} className="w-full">
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
