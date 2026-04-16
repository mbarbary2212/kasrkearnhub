import { useState, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Upload, 
  Loader2, 
  UserPlus,
  Mail,
  Trash2,
  AlertTriangle,
  Send,
  RefreshCw,
  Search,
  ArrowUp,
  ArrowDown,
  ListChecks,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  useAccessRequests, 
  useApproveAccessRequest, 
  useRejectAccessRequest,
  useDeleteAccessRequest,
  AccessRequest
} from '@/hooks/useAccessRequests';
import { useEmailBouncesByEmail } from '@/hooks/useEmailBounces';
import { useEmailInvitations, AccountStatus } from '@/hooks/useEmailInvitations';
import { useResendInvitation } from '@/hooks/useUserProvisioning';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';
import { BulkUserUploadModal } from './BulkUserUploadModal';
import { SingleUserInviteModal } from './SingleUserInviteModal';
import { CreateUserDialog } from './CreateUserDialog';
import { EmailBouncesPopover } from './EmailBouncesPopover';
import { EmailInvitationsTable } from './EmailInvitationsTable';
import { toast } from 'sonner';

interface BulkResult {
  name: string;
  email: string;
  action: 'approve' | 'reject' | 'delete';
  status: 'success' | 'failed' | 'bounced' | 'already_exists';
  message: string;
}
export function AccountsTab() {
  const [activeTab, setActiveTab] = useState('pending');
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [singleInviteOpen, setSingleInviteOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState('student');
  const [rejectNotes, setRejectNotes] = useState('');
  
  // Resend state
  const [resendingId, setResendingId] = useState<string | null>(null);
  
  // Search and sort state for All Requests tab
  const [allSearchQuery, setAllSearchQuery] = useState('');
  const [allSortField, setAllSortField] = useState<'status' | 'date'>('date');
  const [allSortOrder, setAllSortOrder] = useState<'asc' | 'desc'>('desc');

  // Bulk action state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState('student');
  const [bulkApproveDialogOpen, setBulkApproveDialogOpen] = useState(false);
  const [bulkRejectDialogOpen, setBulkRejectDialogOpen] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [bulkReportOpen, setBulkReportOpen] = useState(false);
  const { data: pendingRequests, isLoading: loadingPending } = useAccessRequests('pending');
  const { data: allRequests, isLoading: loadingAll } = useAccessRequests();
  
  // Get all emails to check for bounces
  const allEmails = allRequests?.map(r => r.email) || [];
  const { data: bounceMap } = useEmailBouncesByEmail(allEmails);
  
  // Fetch account status for all request emails
  const approvedEmails = useMemo(() => {
    return [...new Set((allRequests || []).filter(r => r.status === 'approved').map(r => r.email.toLowerCase()))];
  }, [allRequests]);
  
  const { data: accountStatusMap } = useQuery({
    queryKey: ['request-account-status', approvedEmails],
    queryFn: async () => {
      if (approvedEmails.length === 0) return new Map<string, { account_status: AccountStatus; last_sign_in_at: string | null }>();
      const { data } = await supabase.functions.invoke('provision-user', {
        body: { action: 'check-invite-status', users: approvedEmails },
      });
      const map = new Map<string, { account_status: AccountStatus; last_sign_in_at: string | null }>();
      if (data?.statuses) {
        data.statuses.forEach((s: any) => {
          map.set(s.email.toLowerCase(), {
            account_status: s.account_status,
            last_sign_in_at: s.last_sign_in_at,
          });
        });
      }
      return map;
    },
    enabled: approvedEmails.length > 0,
  });

  const approveRequest = useApproveAccessRequest();
  const rejectRequest = useRejectAccessRequest();
  const deleteRequest = useDeleteAccessRequest();
  const resendInvitation = useResendInvitation();
  
  // Filter and sort All Requests
  const filteredAllRequests = useMemo(() => {
    let result = allRequests ?? [];
    
    // Search filter
    if (allSearchQuery) {
      const query = allSearchQuery.toLowerCase();
      result = result.filter(r => r.full_name.toLowerCase().includes(query));
    }
    
    // Sort
    return [...result].sort((a, b) => {
      let comparison = 0;
      if (allSortField === 'date') {
        comparison = new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
      } else {
        comparison = (a.status || '').localeCompare(b.status || '');
      }
      return allSortOrder === 'desc' ? -comparison : comparison;
    });
  }, [allRequests, allSearchQuery, allSortField, allSortOrder]);
  
  const handleAllSort = (field: 'status' | 'date') => {
    if (allSortField === field) {
      setAllSortOrder(allSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setAllSortField(field);
      setAllSortOrder('desc');
    }
  };
  
  const handleResendRequest = async (request: AccessRequest) => {
    setResendingId(request.id);
    try {
      await resendInvitation.mutateAsync({
        email: request.email,
        full_name: request.full_name,
        role: request.request_type === 'faculty' ? 'teacher' : 'student',
      });
    } finally {
      setResendingId(null);
    }
  };

  const handleApprove = (request: any) => {
    setSelectedRequest(request);
    setSelectedRole(request.request_type === 'faculty' ? 'teacher' : 'student');
    setApproveDialogOpen(true);
  };

  const handleReject = (request: any) => {
    setSelectedRequest(request);
    setRejectNotes('');
    setRejectDialogOpen(true);
  };

  const confirmApprove = async () => {
    if (!selectedRequest) return;
    await approveRequest.mutateAsync({
      requestId: selectedRequest.id,
      role: selectedRole,
    });
    setApproveDialogOpen(false);
    setSelectedRequest(null);
  };

  const confirmReject = async () => {
    if (!selectedRequest) return;
    await rejectRequest.mutateAsync({
      requestId: selectedRequest.id,
      notes: rejectNotes,
    });
    setRejectDialogOpen(false);
    setSelectedRequest(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'approved':
        return <Badge className="gap-1 bg-emerald-600 dark:bg-emerald-500"><CheckCircle className="h-3 w-3" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Account Management</h2>
          <p className="text-muted-foreground">
            Manage access requests and invite new users
          </p>
        </div>
        <div className="flex items-center gap-2">
          <EmailBouncesPopover />
          <Button variant="outline" onClick={() => setCreateUserOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Create User
          </Button>
          <Button variant="outline" onClick={() => setSingleInviteOpen(true)} className="gap-2">
            <Mail className="h-4 w-4" />
            Invite User
          </Button>
          <Button onClick={() => setBulkUploadOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Bulk Invite
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending Requests
            {pendingRequests && pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <UserPlus className="h-4 w-4" />
            All Requests
          </TabsTrigger>
          <TabsTrigger value="invitations" className="gap-2">
            <Send className="h-4 w-4" />
            Email Invitations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Access Requests</CardTitle>
              <CardDescription>
                Review and approve or reject pending access requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPending ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingRequests && pendingRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.full_name}</TableCell>
                        <TableCell>{request.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {request.request_type === 'faculty' ? 'Faculty' : 'Student'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {request.job_title || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(request.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(request)}
                              disabled={approveRequest.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(request)}
                              disabled={rejectRequest.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending requests</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Access Requests</CardTitle>
              <CardDescription>
                View the history of all access requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search Input */}
              <div className="mb-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name..."
                    value={allSearchQuery}
                    onChange={(e) => setAllSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {loadingAll ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAllRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleAllSort('status')}
                      >
                        <div className="flex items-center gap-1">
                          Status
                          {allSortField === 'status' && (
                            allSortOrder === 'desc' 
                              ? <ArrowDown className="h-3 w-3" /> 
                              : <ArrowUp className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleAllSort('date')}
                      >
                        <div className="flex items-center gap-1">
                          Requested
                          {allSortField === 'date' && (
                            allSortOrder === 'desc' 
                              ? <ArrowDown className="h-3 w-3" /> 
                              : <ArrowUp className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Account Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAllRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.full_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {request.email}
                            {bounceMap?.[request.email.toLowerCase()] && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertTriangle className="h-4 w-4 text-destructive" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="font-medium">Email Delivery Failed</p>
                                  <p className="text-xs text-muted-foreground">
                                    {bounceMap[request.email.toLowerCase()].reason || 'Email bounced or marked as spam'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {request.request_type === 'faculty' ? 'Faculty' : 'Student'}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status || 'pending')}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(request.created_at || ''), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {request.status === 'approved' ? (() => {
                            const status = accountStatusMap?.get(request.email.toLowerCase());
                            const accountStatus = status?.account_status || 'not_registered';
                            if (accountStatus === 'active') {
                              return (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge className="gap-1 bg-emerald-600 dark:bg-emerald-500">
                                      <Users className="h-3 w-3" /> Active
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Last seen: {status?.last_sign_in_at ? format(new Date(status.last_sign_in_at), 'MMM d, yyyy h:mm a') : 'Unknown'}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            } else if (accountStatus === 'registered') {
                              return (
                                <Badge className="gap-1 bg-blue-600 dark:bg-blue-500">
                                  <Users className="h-3 w-3" /> Registered
                                </Badge>
                              );
                            } else {
                              return (
                                <Badge variant="outline" className="gap-1">
                                  <Users className="h-3 w-3" /> Not Registered
                                </Badge>
                              );
                            }
                          })() : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {request.status === 'approved' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                type="button"
                                onClick={() => handleResendRequest(request)}
                                disabled={resendingId === request.id}
                              >
                                {resendingId === request.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                                <span className="ml-1 hidden sm:inline">Resend</span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              type="button"
                              onClick={() => deleteRequest.mutate(request.id)}
                              disabled={deleteRequest.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{allSearchQuery ? 'No matching requests found' : 'No access requests yet'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <EmailInvitationsTable />
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Access Request</AlertDialogTitle>
            <AlertDialogDescription>
              This will create an account for {selectedRequest?.full_name} and send them an invitation email to set their password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="role">Assign Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[100000]">
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="topic_admin">Topic Admin</SelectItem>
                <SelectItem value="department_admin">Department Admin</SelectItem>
                <SelectItem value="platform_admin">Platform Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmApprove}
              disabled={approveRequest.isPending}
            >
              {approveRequest.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Approve & Send Invite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Access Request</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject the access request from {selectedRequest?.full_name}. They will not be notified automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="notes">Reason (optional)</Label>
            <Input
              id="notes"
              className="mt-2"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Add a note about why this was rejected"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmReject}
              disabled={rejectRequest.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rejectRequest.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Reject Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single User Invite Modal */}
      <SingleUserInviteModal
        open={singleInviteOpen}
        onOpenChange={setSingleInviteOpen}
      />

      {/* Create User Dialog */}
      <CreateUserDialog
        open={createUserOpen}
        onOpenChange={setCreateUserOpen}
      />

      {/* Bulk Upload Modal */}
      <BulkUserUploadModal
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
      />
    </div>
  );
}
