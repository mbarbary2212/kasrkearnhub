import { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAdminFeedback, FeedbackItem, FeedbackStatus } from '@/hooks/useFeedback';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, MessageSquare, AlertTriangle, Eye, X, ShieldAlert, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  in_review: 'bg-amber-100 text-amber-700',
  closed: 'bg-slate-100 text-slate-700',
};

const SEVERITY_COLORS: Record<string, string> = {
  normal: 'bg-slate-100 text-slate-700',
  urgent: 'bg-orange-100 text-orange-700',
  extreme: 'bg-red-100 text-red-700',
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug / Technical',
  content_error: 'Content Error',
  suggestion: 'Suggestion',
  complaint: 'Complaint',
  academic_integrity: 'Academic Integrity',
  other: 'Other',
};

interface Year { id: string; name: string; }
interface Module { id: string; name: string; year_id: string; }

export default function AdminFeedbackPanel() {
  const { isSuperAdmin } = useAuthContext();
  const { feedback, isLoading, updateFeedbackStatus, revealIdentity, fetchFeedback } = useAdminFeedback();
  
  const [years, setYears] = useState<Year[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState<FeedbackStatus>('new');
  const [isUpdating, setIsUpdating] = useState(false);

  // Unmask dialog state
  const [showUnmaskDialog, setShowUnmaskDialog] = useState(false);
  const [unmaskReason, setUnmaskReason] = useState('');
  const [isUnmasking, setIsUnmasking] = useState(false);
  const [revealedUserId, setRevealedUserId] = useState<string | null>(null);
  const [revealedUserEmail, setRevealedUserEmail] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    const [yearsRes, modulesRes] = await Promise.all([
      supabase.from('years').select('id, name').order('display_order'),
      supabase.from('modules').select('id, name, year_id').order('display_order'),
    ]);
    setYears((yearsRes.data as Year[]) || []);
    setModules((modulesRes.data as Module[]) || []);
  };

  const getYearName = (id: string | null) => years.find(y => y.id === id)?.name || '-';
  const getModuleName = (id: string | null) => modules.find(m => m.id === id)?.name || '-';

  const filteredFeedback = feedback.filter(f => {
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
    return true;
  });

  const handleSelectFeedback = (item: FeedbackItem) => {
    setSelectedFeedback(item);
    setAdminNotes(item.admin_notes || '');
    setNewStatus(item.status);
    setRevealedUserId(null);
    setRevealedUserEmail(null);
  };

  const handleUpdateStatus = async () => {
    if (!selectedFeedback) return;

    setIsUpdating(true);
    const success = await updateFeedbackStatus(selectedFeedback.id, newStatus, adminNotes);
    setIsUpdating(false);

    if (success) {
      toast.success('Feedback updated');
      setSelectedFeedback(prev => prev ? { ...prev, status: newStatus, admin_notes: adminNotes } : null);
    } else {
      toast.error('Failed to update feedback');
    }
  };

  const handleUnmask = async () => {
    if (!selectedFeedback || unmaskReason.length < 10) {
      toast.error('Please provide a detailed reason (min 10 characters)');
      return;
    }

    setIsUnmasking(true);
    try {
      const userId = await revealIdentity(selectedFeedback.id, unmaskReason);
      if (userId) {
        setRevealedUserId(userId);
        
        // Fetch user email
        const { data } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', userId)
          .single();
        
        if (data) {
          setRevealedUserEmail(data.email);
        }
        
        toast.success('Identity revealed and logged');
        setShowUnmaskDialog(false);
        setUnmaskReason('');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to reveal identity');
    } finally {
      setIsUnmasking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Anonymous Feedback Management
          </CardTitle>
          <CardDescription>
            View and manage user feedback. Identities are protected by default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="extreme">Extreme</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => fetchFeedback()}>
              Refresh
            </Button>
          </div>

          {filteredFeedback.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No Feedback Yet</p>
              <p className="text-sm mt-2">
                Feedback submissions will appear here.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Year/Module</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeedback.map(item => (
                    <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleSelectFeedback(item)}>
                      <TableCell className="text-sm">
                        {format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{CATEGORY_LABELS[item.category] || item.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={SEVERITY_COLORS[item.severity]}>
                          {item.severity === 'extreme' && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {item.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.year_id || item.module_id ? (
                          <span>
                            {getYearName(item.year_id)}
                            {item.module_id && ` / ${getModuleName(item.module_id)}`}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[item.status]}>{item.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleSelectFeedback(item); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback Detail Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Feedback Details
              {selectedFeedback?.severity === 'extreme' && (
                <Badge className={SEVERITY_COLORS.extreme}>
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Extreme
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Submitted: {selectedFeedback && format(new Date(selectedFeedback.created_at), 'MMMM d, yyyy HH:mm')}
            </DialogDescription>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-6">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <p className="font-medium">{CATEGORY_LABELS[selectedFeedback.category]}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Role</Label>
                  <p className="font-medium capitalize">{selectedFeedback.role}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Year</Label>
                  <p className="font-medium">{getYearName(selectedFeedback.year_id)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Module</Label>
                  <p className="font-medium">{getModuleName(selectedFeedback.module_id)}</p>
                </div>
                {selectedFeedback.tab && (
                  <div>
                    <Label className="text-muted-foreground">Tab</Label>
                    <p className="font-medium capitalize">{selectedFeedback.tab}</p>
                  </div>
                )}
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label>Message</Label>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="whitespace-pre-wrap">{selectedFeedback.message}</p>
                </div>
              </div>

              {/* Revealed identity (if any) */}
              {revealedUserId && (
                <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
                  <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                    <User className="w-4 h-4" />
                    Identity Revealed
                  </div>
                  <p className="text-sm">
                    <strong>User ID:</strong> {revealedUserId}
                  </p>
                  {revealedUserEmail && (
                    <p className="text-sm">
                      <strong>Email:</strong> {revealedUserEmail}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    This action has been logged in the audit trail.
                  </p>
                </div>
              )}

              {/* Admin actions */}
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={newStatus} onValueChange={(v) => setNewStatus(v as FeedbackStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Admin Notes</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add internal notes about this feedback..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleUpdateStatus} disabled={isUpdating}>
                    {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Update Status
                  </Button>

                  {/* SuperAdmin unmask button - only for extreme severity */}
                  {isSuperAdmin && selectedFeedback.severity === 'extreme' && !revealedUserId && (
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowUnmaskDialog(true)}
                    >
                      <ShieldAlert className="w-4 h-4 mr-2" />
                      Request Identity Reveal
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Unmask Confirmation Dialog */}
      <Dialog open={showUnmaskDialog} onOpenChange={setShowUnmaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Extreme Action: Reveal Identity
            </DialogTitle>
            <DialogDescription>
              This action will permanently log your request and reveal the submitter's identity.
              This should only be used for serious safety, abuse, or misconduct concerns.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">Warning</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• This action is irreversible and will be audited</li>
                <li>• Only available for "Extreme" severity feedback</li>
                <li>• You must provide a detailed justification</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label>Reason for Identity Reveal *</Label>
              <Textarea
                value={unmaskReason}
                onChange={(e) => setUnmaskReason(e.target.value)}
                placeholder="Provide a detailed reason for this request (min 10 characters)..."
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">
                {unmaskReason.length}/10 min characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnmaskDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleUnmask}
              disabled={isUnmasking || unmaskReason.length < 10}
            >
              {isUnmasking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm & Reveal Identity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
