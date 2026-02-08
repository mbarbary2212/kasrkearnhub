import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Upload, 
  Loader2, 
  UserPlus,
  Mail,
  Trash2 
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  useAccessRequests, 
  useApproveAccessRequest, 
  useRejectAccessRequest,
  useDeleteAccessRequest 
} from '@/hooks/useAccessRequests';
import { BulkUserUploadModal } from './BulkUserUploadModal';

export function AccountsTab() {
  const [activeTab, setActiveTab] = useState('pending');
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState('student');
  const [rejectNotes, setRejectNotes] = useState('');

  const { data: pendingRequests, isLoading: loadingPending } = useAccessRequests('pending');
  const { data: allRequests, isLoading: loadingAll } = useAccessRequests();
  
  const approveRequest = useApproveAccessRequest();
  const rejectRequest = useRejectAccessRequest();
  const deleteRequest = useDeleteAccessRequest();

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
        return <Badge className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" /> Approved</Badge>;
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
        <Button onClick={() => setBulkUploadOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Invite
        </Button>
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
              {loadingAll ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : allRequests && allRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.full_name}</TableCell>
                        <TableCell>{request.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {request.request_type === 'faculty' ? 'Faculty' : 'Student'}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(request.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteRequest.mutate(request.id)}
                            disabled={deleteRequest.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No access requests yet</p>
                </div>
              )}
            </CardContent>
          </Card>
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
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
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

      {/* Bulk Upload Modal */}
      <BulkUserUploadModal
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
      />
    </div>
  );
}
