import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { useInviteBulkUsers, InviteResult } from '@/hooks/useUserProvisioning';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SingleUserInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SingleUserInviteModal({ open, onOpenChange }: SingleUserInviteModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [result, setResult] = useState<InviteResult | null>(null);

  const inviteUsers = useInviteBulkUsers();

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setRole('student');
    setResult(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const results = await inviteUsers.mutateAsync([{
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
      role,
      request_type: role === 'teacher' ? 'faculty' : 'student',
    }]);
    
    setResult(results[0]);
  };

  const isValid = fullName.trim() && email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite User
          </DialogTitle>
          <DialogDescription>
            Send an invitation email to create an account.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-4 space-y-4">
            {result.status === 'success' ? (
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-700 dark:text-green-400">
                  Invitation sent successfully to {result.email}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {result.message}
                </AlertDescription>
              </Alert>
            )}
            <p className="text-sm text-muted-foreground">
              Ask the user to check their Spam/Junk folder if it doesn't arrive within a few minutes.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Enter full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="topic_admin">Topic Admin</SelectItem>
                  <SelectItem value="department_admin">Department Admin</SelectItem>
                  <SelectItem value="platform_admin">Platform Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
        )}

        <DialogFooter>
          {result ? (
            <div className="flex gap-2 w-full justify-end">
              <Button variant="outline" onClick={resetForm}>
                Invite Another
              </Button>
              <Button onClick={() => handleClose(false)}>
                Done
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 w-full justify-end">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!isValid || inviteUsers.isPending}
              >
                {inviteUsers.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Send Invite
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
