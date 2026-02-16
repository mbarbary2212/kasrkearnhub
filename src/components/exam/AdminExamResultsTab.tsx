import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { BarChart3, RotateCcw, Check, X, Clock, Users, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { formatDuration } from '@/hooks/useMockExam';
import {
  useModuleExamAttempts,
  useRecheckRequests,
  useResolveRecheckRequest,
} from '@/hooks/useExamResults';
import { AdminAttemptDetailModal } from './AdminAttemptDetailModal';

const TEST_MODE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  easy: { label: 'Easy', variant: 'secondary' },
  hard: { label: 'Hard', variant: 'destructive' },
  blueprint: { label: 'Blueprint', variant: 'default' },
};

interface AdminExamResultsTabProps {
  moduleId: string;
}

export function AdminExamResultsTab({ moduleId }: AdminExamResultsTabProps) {
  const { data: attempts, isLoading: attemptsLoading } = useModuleExamAttempts(moduleId);
  const { data: recheckRequests, isLoading: recheckLoading } = useRecheckRequests(moduleId, true);
  const resolveRequest = useResolveRecheckRequest();

  const [activeSubTab, setActiveSubTab] = useState<'attempts' | 'rechecks'>('attempts');
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [resolveModal, setResolveModal] = useState<{
    open: boolean;
    requestId: string;
    answerId: string;
  }>({ open: false, requestId: '', answerId: '' });
  const [adminResponse, setAdminResponse] = useState('');
  const [newScore, setNewScore] = useState('');
  const [resolveStatus, setResolveStatus] = useState<'approved' | 'rejected'>('approved');

  const pendingRechecks = recheckRequests?.filter(r => r.status === 'pending') || [];

  const handleResolve = async () => {
    await resolveRequest.mutateAsync({
      requestId: resolveModal.requestId,
      status: resolveStatus,
      adminResponse,
      newScore: resolveStatus === 'approved' && newScore ? Number(newScore) : undefined,
      answerId: resolveStatus === 'approved' ? resolveModal.answerId : undefined,
    });
    setResolveModal({ open: false, requestId: '', answerId: '' });
    setAdminResponse('');
    setNewScore('');
  };

  if (attemptsLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as 'attempts' | 'rechecks')}>
        <TabsList>
          <TabsTrigger value="attempts" className="gap-1">
            <Users className="w-3.5 h-3.5" />
            Student Attempts
          </TabsTrigger>
          <TabsTrigger value="rechecks" className="gap-1">
            <RotateCcw className="w-3.5 h-3.5" />
            Recheck Requests
            {pendingRechecks.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs h-5 px-1.5">
                {pendingRechecks.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attempts">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                All Student Attempts
              </CardTitle>
              <CardDescription>
                {attempts?.length || 0} completed attempts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!attempts || attempts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No exam attempts yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attempts.map((attempt: any) => {
                      const profile = attempt.profiles;
                      const percentage = attempt.total_questions > 0
                        ? Math.round((attempt.score / attempt.total_questions) * 100)
                        : 0;
                      const modeInfo = TEST_MODE_LABELS[attempt.test_mode] || { label: attempt.test_mode, variant: 'outline' as const };
                      return (
                        <TableRow
                          key={attempt.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedAttempt(attempt)}
                        >
                          <TableCell className="font-medium">
                            {profile?.full_name || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={modeInfo.variant}>{modeInfo.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={percentage >= 60 ? 'default' : 'destructive'}>
                              {attempt.score}/{attempt.total_questions} ({percentage}%)
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {attempt.duration_seconds ? formatDuration(attempt.duration_seconds) : '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {attempt.submitted_at
                              ? format(new Date(attempt.submitted_at), 'MMM d, yyyy h:mm a')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rechecks">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Recheck Requests
              </CardTitle>
              <CardDescription>
                {pendingRechecks.length} pending · {(recheckRequests?.length || 0) - pendingRechecks.length} resolved
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recheckLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : !recheckRequests || recheckRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No recheck requests.
                </p>
              ) : (
                <div className="space-y-3">
                  {recheckRequests.map((req) => (
                    <div key={req.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'approved' ? 'default' : 'outline'}>
                          {req.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(req.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <p className="text-sm">{req.reason}</p>
                      {req.admin_response && (
                        <p className="text-sm text-muted-foreground border-t pt-2">
                          Admin: {req.admin_response}
                        </p>
                      )}
                      {req.status === 'pending' && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => {
                              setResolveStatus('approved');
                              setResolveModal({ open: true, requestId: req.id, answerId: req.answer_id });
                            }}
                          >
                            <Check className="w-3 h-3" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => {
                              setResolveStatus('rejected');
                              setResolveModal({ open: true, requestId: req.id, answerId: req.answer_id });
                            }}
                          >
                            <X className="w-3 h-3" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resolve Modal */}
      <Dialog open={resolveModal.open} onOpenChange={(open) => setResolveModal(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {resolveStatus === 'approved' ? 'Approve' : 'Reject'} Recheck Request
            </DialogTitle>
            <DialogDescription>
              Provide feedback to the student.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Response</label>
              <Textarea
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Provide your feedback..."
                rows={3}
              />
            </div>
            {resolveStatus === 'approved' && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">New Score (optional)</label>
                <Input
                  type="number"
                  value={newScore}
                  onChange={(e) => setNewScore(e.target.value)}
                  placeholder="Leave blank to keep current score"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveModal({ open: false, requestId: '', answerId: '' })}>
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={!adminResponse.trim() || resolveRequest.isPending}
              variant={resolveStatus === 'approved' ? 'default' : 'destructive'}
            >
              {resolveRequest.isPending ? 'Saving...' : resolveStatus === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attempt Detail Modal */}
      <AdminAttemptDetailModal
        open={!!selectedAttempt}
        onOpenChange={(open) => { if (!open) setSelectedAttempt(null); }}
        attempt={selectedAttempt}
      />
    </div>
  );
}
