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
import { Mail, Loader2 } from 'lucide-react';
import { useUserAdminActions } from '@/hooks/useUserAdminActions';

interface EditEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { id: string; email: string; full_name: string | null } | null;
}

export function EditEmailDialog({ open, onOpenChange, user }: EditEmailDialogProps) {
  const [newEmail, setNewEmail] = useState('');
  const { updateEmail } = useUserAdminActions();

  if (!user) return null;

  const handleSubmit = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) return;
    await updateEmail.mutateAsync({ userId: user.id, newEmail: newEmail.trim() });
    setNewEmail('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setNewEmail(''); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-muted">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Edit Email</DialogTitle>
              <DialogDescription className="mt-1">
                {user.full_name || user.email}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Current Email</Label>
            <Input value={user.email} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-email">New Email</Label>
            <Input
              id="new-email"
              type="email"
              placeholder="new@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!newEmail.trim() || !newEmail.includes('@') || updateEmail.isPending}
          >
            {updateEmail.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Update Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
