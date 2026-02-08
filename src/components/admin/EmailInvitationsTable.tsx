import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  Mail,
  AlertTriangle,
  RefreshCw,
  UserPlus
} from 'lucide-react';
import { format } from 'date-fns';
import { useEmailInvitations, EmailInvitation } from '@/hooks/useEmailInvitations';
import { useResendInvitation } from '@/hooks/useUserProvisioning';

export function EmailInvitationsTable() {
  const { data: invitations, isLoading } = useEmailInvitations();
  const resendInvitation = useResendInvitation();
  const [resendingId, setResendingId] = useState<string | null>(null);

  const handleResend = async (invitation: EmailInvitation) => {
    setResendingId(invitation.id);
    try {
      await resendInvitation.mutateAsync({
        email: invitation.email,
        full_name: invitation.full_name,
        role: invitation.role,
      });
    } finally {
      setResendingId(null);
    }
  };

  const getStatusBadge = (invitation: EmailInvitation) => {
    if (!invitation.delivery) {
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" /> Pending
        </Badge>
      );
    }

    switch (invitation.delivery.event_type) {
      case 'email.delivered':
        return (
          <Badge className="gap-1 bg-emerald-600 dark:bg-emerald-500">
            <CheckCircle className="h-3 w-3" /> Delivered
          </Badge>
        );
      case 'email.bounced':
      case 'email.complained':
        return (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" /> Failed
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-medium">Delivery Failed</p>
              <p className="text-xs text-muted-foreground">
                {invitation.delivery.reason || 'Email bounced or marked as spam'}
              </p>
            </TooltipContent>
          </Tooltip>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            {invitation.delivery.event_type.replace('email.', '')}
          </Badge>
        );
    }
  };

  const getRoleBadge = (role: string) => {
    const roleLabels: Record<string, string> = {
      student: 'Student',
      teacher: 'Teacher',
      topic_admin: 'Topic Admin',
      department_admin: 'Dept Admin',
      platform_admin: 'Platform Admin',
      super_admin: 'Super Admin',
    };

    return (
      <Badge variant="outline">
        {roleLabels[role] || role}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Invitations</CardTitle>
          <CardDescription>
            Track all invitation emails sent to users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Invitations</CardTitle>
        <CardDescription>
          Track all invitation emails sent to users
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invitations && invitations.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {invitation.full_name}
                      {invitation.is_new_user && (
                        <Badge variant="secondary" className="text-xs">New</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {invitation.email}
                      {invitation.delivery?.event_type === 'email.bounced' && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(invitation.invited_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>{getStatusBadge(invitation)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResend(invitation)}
                      disabled={resendingId === invitation.id}
                    >
                      {resendingId === invitation.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      <span className="ml-1 hidden sm:inline">Resend</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No invitations sent yet</p>
            <p className="text-sm mt-1">
              Use the "Invite User" or "Bulk Invite" buttons to send invitations
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
