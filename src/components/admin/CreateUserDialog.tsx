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
import { Loader2, UserPlus, CheckCircle, Copy, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [yearId, setYearId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ tempPassword: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data: years } = useQuery({
    queryKey: ['years-list'],
    queryFn: async () => {
      const { data } = await supabase.from('years').select('id, name').order('display_order');
      return data || [];
    },
  });

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setRole('student');
    setYearId('');
    setResult(null);
    setCopied(false);
    setIsSubmitting(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('provision-user', {
        body: {
          action: 'create-user',
          user: {
            email: email.trim().toLowerCase(),
            full_name: fullName.trim(),
            role,
            year_id: yearId || null,
          },
        },
      });

      if (error || !data?.success) {
        toast.error(data?.error || error?.message || 'Failed to create user');
        setIsSubmitting(false);
        return;
      }

      setResult({ tempPassword: data.temp_password, email: email.trim().toLowerCase() });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['email-invitations'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    const text = `Email: ${result.email}\nTemporary Password: ${result.tempPassword}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Credentials copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const isValid = fullName.trim().length >= 2 && email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create User Account
          </DialogTitle>
          <DialogDescription>
            Create an account directly with a temporary password.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-4 space-y-4">
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                Account created for {result.email}
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <p className="text-sm font-medium">Credentials</p>
              <div className="font-mono text-sm space-y-1">
                <p><span className="text-muted-foreground">Email:</span> {result.email}</p>
                <p><span className="text-muted-foreground">Password:</span> {result.tempPassword}</p>
              </div>
            </div>

            <Button variant="outline" onClick={handleCopy} className="w-full gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy Credentials'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Share these credentials securely. The user should change their password after first login.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="create-fullName">Full Name</Label>
              <Input
                id="create-fullName"
                placeholder="Enter full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={2}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="department_admin">Department Admin</SelectItem>
                  <SelectItem value="platform_admin">Platform Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-year">Academic Year</Label>
              <Select value={yearId} onValueChange={setYearId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No year</SelectItem>
                  {years?.map((y) => (
                    <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={() => handleClose(false)}>Done</Button>
          ) : (
            <div className="flex gap-2 w-full justify-end">
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Account
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
