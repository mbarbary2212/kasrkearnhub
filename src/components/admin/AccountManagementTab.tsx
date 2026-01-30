import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Mail, Loader2, CheckCircle2, AlertTriangle, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SUPABASE_URL = 'https://dwmxnokprfiwmvzksyjg.supabase.co';

/**
 * Account Management Tab for Admin Panel.
 * Allows Platform Admins and Super Admins to invite new students.
 */
export function AccountManagementTab() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [lastInvited, setLastInvited] = useState<string | null>(null);

  const inviteMutation = useMutation({
    mutationFn: async ({ email, fullName }: { email: string; fullName: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ email, fullName }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite user');
      }

      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Invitation sent to ${variables.email}`);
      setLastInvited(variables.email);
      setEmail('');
      setFullName('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    if (!fullName.trim()) {
      toast.error('Full name is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    inviteMutation.mutate({ email: email.trim().toLowerCase(), fullName: fullName.trim() });
  };

  return (
    <div className="space-y-6">
      {/* Single User Invite */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite New Student
          </CardTitle>
          <CardDescription>
            Send an email invitation to a new student. They will set their own password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-9"
                    disabled={inviteMutation.isPending}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="student@kasralainy.edu.eg"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    disabled={inviteMutation.isPending}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button 
                type="submit" 
                disabled={inviteMutation.isPending || !email.trim() || !fullName.trim()}
              >
                {inviteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Invitation...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>

              {lastInvited && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Invited: {lastInvited}</span>
                </div>
              )}
            </div>
          </form>

          <Alert className="mt-6 bg-muted/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">How invitations work:</p>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>The student receives an email with a secure link</li>
                <li>They click the link to set their own password</li>
                <li>No passwords are shared or stored by admins</li>
                <li>The account is automatically assigned the Student role</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Future: Bulk Invite Section */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <UserPlus className="h-5 w-5" />
            Bulk Invite (Coming Soon)
          </CardTitle>
          <CardDescription>
            Upload a CSV file with multiple student emails and names to invite them all at once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled>
            Upload CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
