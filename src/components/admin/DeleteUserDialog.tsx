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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useUserAdminActions } from '@/hooks/useUserAdminActions';

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { id: string; email: string; full_name: string | null; status?: string } | null;
  isSuperAdmin: boolean;
}

export function DeleteUserDialog({ open, onOpenChange, user, isSuperAdmin }: DeleteUserDialogProps) {
  const [step, setStep] = useState<'soft' | 'hard'>('soft');
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const { deleteUser } = useUserAdminActions();

  if (!user) return null;

  const isAlreadyDeactivated = user.status === 'removed';

  const handleClose = () => {
    setStep('soft');
    setReason('');
    setConfirmText('');
    onOpenChange(false);
  };

  const handleSoftDelete = async () => {
    await deleteUser.mutateAsync({ userId: user.id, mode: 'soft', reason });
    if (isSuperAdmin) {
      setStep('hard');
    } else {
      handleClose();
    }
  };

  const handleHardDelete = async () => {
    await deleteUser.mutateAsync({ userId: user.id, mode: 'hard', reason: reason || 'Permanently deleted' });
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>
                {step === 'soft' ? 'Delete User' : 'Permanently Delete User'}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {user.full_name || user.email}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === 'soft' && !isAlreadyDeactivated && (
          <div className="space-y-4 py-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will deactivate the user's account. They will lose access but can be restored later.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="delete-reason">Reason (required)</Label>
              <Textarea
                id="delete-reason"
                placeholder="Enter the reason for deactivation..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {(step === 'hard' || isAlreadyDeactivated) && (
          <div className="space-y-4 py-4">
            {isAlreadyDeactivated && step === 'soft' ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This user is already deactivated. You can permanently delete them below.
                </AlertDescription>
              </Alert>
            ) : null}

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>This action is irreversible.</strong> The user will be permanently removed from the system including all auth data. Profile data will be cascade-deleted.
              </AlertDescription>
            </Alert>

            {!isSuperAdmin ? (
              <p className="text-sm text-muted-foreground">
                Only Super Admins can permanently delete users.
              </p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="confirm-delete">
                  Type <strong>DELETE</strong> to confirm
                </Label>
                <Input
                  id="confirm-delete"
                  placeholder="DELETE"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={deleteUser.isPending}>
            Cancel
          </Button>

          {step === 'soft' && !isAlreadyDeactivated && (
            <Button
              variant="destructive"
              onClick={handleSoftDelete}
              disabled={reason.trim().length < 5 || deleteUser.isPending}
            >
              {deleteUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Deactivate Account
            </Button>
          )}

          {(step === 'hard' || isAlreadyDeactivated) && isSuperAdmin && (
            <Button
              variant="destructive"
              onClick={handleHardDelete}
              disabled={confirmText !== 'DELETE' || deleteUser.isPending}
            >
              {deleteUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Permanently Delete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
