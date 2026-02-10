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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useUserAdminActions } from '@/hooks/useUserAdminActions';

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { id: string; email: string; full_name: string | null; status?: string } | null;
  isSuperAdmin: boolean;
}

export function DeleteUserDialog({ open, onOpenChange, user }: DeleteUserDialogProps) {
  const [reason, setReason] = useState('');
  const { deleteUser } = useUserAdminActions();

  if (!user) return null;

  const isAlreadyDeactivated = user.status === 'removed';

  const handleClose = () => {
    setReason('');
    onOpenChange(false);
  };

  const handleDeactivate = async () => {
    await deleteUser.mutateAsync({ userId: user.id, mode: 'soft', reason });
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
              <DialogTitle>Deactivate User</DialogTitle>
              <DialogDescription className="mt-1">
                {user.full_name || user.email}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isAlreadyDeactivated ? (
          <div className="py-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This user is already deactivated. You can restore them from the Deactivated tab.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will deactivate the user's account. They will lose access but can be restored later from the Deactivated tab.
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

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={deleteUser.isPending}>
            Cancel
          </Button>

          {!isAlreadyDeactivated && (
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={reason.trim().length < 5 || deleteUser.isPending}
            >
              {deleteUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Deactivate Account
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
