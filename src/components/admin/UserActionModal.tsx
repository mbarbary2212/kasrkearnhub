import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Ban, UserCheck, UserX, AlertCircle } from 'lucide-react';

interface UserActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'ban' | 'unban' | 'remove' | 'restore' | null;
  userName: string;
  onConfirm: (reason: string, bannedUntil?: string) => Promise<void>;
  isLoading: boolean;
}

const actionConfig = {
  ban: {
    title: 'Suspend User',
    description: 'This will temporarily or permanently suspend the user\'s access to the platform.',
    icon: Ban,
    buttonText: 'Suspend User',
    buttonVariant: 'default' as const,
    requiresReason: true,
    showDuration: true,
  },
  unban: {
    title: 'Lift Suspension',
    description: 'This will restore the user\'s access to the platform.',
    icon: UserCheck,
    buttonText: 'Lift Suspension',
    buttonVariant: 'default' as const,
    requiresReason: false,
    showDuration: false,
  },
  remove: {
    title: 'Deactivate Account',
    description: 'This will deactivate the user\'s account. They will no longer be able to access the platform.',
    icon: UserX,
    buttonText: 'Deactivate Account',
    buttonVariant: 'default' as const,
    requiresReason: true,
    showDuration: false,
  },
  restore: {
    title: 'Restore Account',
    description: 'This will restore the user\'s account and allow them to access the platform again.',
    icon: UserCheck,
    buttonText: 'Restore Account',
    buttonVariant: 'default' as const,
    requiresReason: false,
    showDuration: false,
  },
};

export function UserActionModal({
  open,
  onOpenChange,
  action,
  userName,
  onConfirm,
  isLoading,
}: UserActionModalProps) {
  const [reason, setReason] = useState('');
  const [durationType, setDurationType] = useState<'temporary' | 'permanent'>('temporary');
  const [bannedUntilDate, setBannedUntilDate] = useState('');

  if (!action) return null;

  const config = actionConfig[action];
  const Icon = config.icon;

  const handleConfirm = async () => {
    let bannedUntil: string | undefined;
    
    if (action === 'ban' && durationType === 'temporary' && bannedUntilDate) {
      bannedUntil = new Date(bannedUntilDate).toISOString();
    }

    await onConfirm(reason, bannedUntil);
    setReason('');
    setDurationType('temporary');
    setBannedUntilDate('');
  };

  const isValid = config.requiresReason ? reason.trim().length >= 5 : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-muted">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{config.title}</DialogTitle>
              <DialogDescription className="mt-1">
                {userName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {config.description}
            </p>
          </div>

          {config.showDuration && (
            <div className="space-y-3">
              <Label>Duration</Label>
              <RadioGroup
                value={durationType}
                onValueChange={(v) => setDurationType(v as 'temporary' | 'permanent')}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="temporary" id="temporary" />
                  <Label htmlFor="temporary" className="font-normal">
                    Temporary suspension
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="permanent" id="permanent" />
                  <Label htmlFor="permanent" className="font-normal">
                    Permanent suspension
                  </Label>
                </div>
              </RadioGroup>

              {durationType === 'temporary' && (
                <div className="space-y-2">
                  <Label htmlFor="bannedUntil">Suspend until</Label>
                  <Input
                    id="bannedUntil"
                    type="date"
                    value={bannedUntilDate}
                    onChange={(e) => setBannedUntilDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason {config.requiresReason ? '(required)' : '(optional)'}
            </Label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for this action..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            {config.requiresReason && reason.length > 0 && reason.length < 5 && (
              <p className="text-xs text-muted-foreground">
                Please provide at least 5 characters
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleConfirm}
            disabled={isLoading || !isValid}
          >
            {isLoading ? 'Processing...' : config.buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
