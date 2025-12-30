import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Megaphone, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  BookOpen, 
  Calendar,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useAdminAnnouncements, 
  useModuleAnnouncements,
  useUpdateAnnouncement, 
  useDeleteAnnouncement,
  Announcement,
} from '@/hooks/useAnnouncements';
import { AnnouncementFormModal } from '@/components/announcements/AnnouncementFormModal';
import { useAuthContext } from '@/contexts/AuthContext';

interface AnnouncementsTabProps {
  modules: { id: string; name: string }[];
  years: { id: string; name: string }[];
  moduleAdminModuleIds?: string[];
}

export function AnnouncementsTab({ modules, years, moduleAdminModuleIds = [] }: AnnouncementsTabProps) {
  const { user, isSuperAdmin, isPlatformAdmin } = useAuthContext();
  const queryClient = useQueryClient();
  const isModuleAdminOnly = moduleAdminModuleIds.length > 0 && !isPlatformAdmin && !isSuperAdmin;
  
  // Use admin announcements for platform/super admins, module announcements for module admins
  const { data: adminAnnouncements, isLoading: adminLoading } = useAdminAnnouncements();
  const { data: moduleAnnouncements, isLoading: moduleLoading } = useModuleAnnouncements(
    isModuleAdminOnly ? moduleAdminModuleIds[0] : ''
  );
  
  // For module admins with multiple modules, we need to fetch all their module announcements
  const announcements = isModuleAdminOnly ? moduleAnnouncements : adminAnnouncements;
  const isLoading = isModuleAdminOnly ? moduleLoading : adminLoading;
  
  const updateAnnouncement = useUpdateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [rejectingAnnouncement, setRejectingAnnouncement] = useState<Announcement | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingAnnouncement(null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteAnnouncement.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    await updateAnnouncement.mutateAsync({
      id: announcement.id,
      is_active: !announcement.is_active,
    });
  };

  const handleApprove = async (announcement: Announcement) => {
    await updateAnnouncement.mutateAsync({
      id: announcement.id,
      pending_approval: false,
    });
  };

  const handleReject = async () => {
    if (!rejectingAnnouncement || !user?.id) return;
    
    try {
      const { error } = await supabase
        .from('announcements')
        .update({
          rejected_at: new Date().toISOString(),
          rejected_by: user.id,
          rejection_reason: rejectionReason || 'No reason provided',
          is_active: false,
        })
        .eq('id', rejectingAnnouncement.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['module-announcements'] });
      toast.success('Announcement rejected');
      setRejectingAnnouncement(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting announcement:', error);
      toast.error('Failed to reject announcement');
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Urgent</Badge>;
      case 'important':
        return <Badge className="bg-warning text-warning-foreground gap-1"><AlertTriangle className="w-3 h-3" />Important</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  const getTargetBadge = (announcement: Announcement) => {
    if (announcement.target_type === 'all') {
      return <Badge variant="outline" className="gap-1"><Users className="w-3 h-3" />All Students</Badge>;
    }
    if (announcement.target_type === 'module' && announcement.modules) {
      return <Badge variant="outline" className="gap-1"><BookOpen className="w-3 h-3" />{announcement.modules.name}</Badge>;
    }
    if (announcement.target_type === 'year' && announcement.years) {
      return <Badge variant="outline" className="gap-1"><Calendar className="w-3 h-3" />{announcement.years.name}</Badge>;
    }
    // For module admin view, show module name from the modules list
    if (announcement.target_type === 'module' && announcement.module_id) {
      const moduleName = modules.find(m => m.id === announcement.module_id)?.name;
      if (moduleName) {
        return <Badge variant="outline" className="gap-1"><BookOpen className="w-3 h-3" />{moduleName}</Badge>;
      }
    }
    return <Badge variant="outline">Unknown</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                Announcements
              </CardTitle>
              <CardDescription>
                {isModuleAdminOnly 
                  ? 'Broadcast messages to students in your modules.'
                  : 'Broadcast messages to students across the platform.'
                }
              </CardDescription>
            </div>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              New Announcement
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : announcements?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No announcements yet</p>
              <p className="text-sm">Create your first announcement to notify students.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements?.map(announcement => (
                <div
                  key={announcement.id}
                  className={cn(
                    'border rounded-lg p-4 transition-all',
                    !announcement.is_active && 'opacity-60 bg-muted/50',
                    announcement.pending_approval && 'border-warning bg-warning/5'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h4 className="font-semibold">{announcement.title}</h4>
                        {getPriorityBadge(announcement.priority)}
                        {getTargetBadge(announcement)}
                        {announcement.pending_approval && !announcement.rejected_at && (
                          <Badge className="bg-warning/20 text-warning-foreground gap-1 border-warning">
                            <Clock className="w-3 h-3" />
                            Pending Approval
                          </Badge>
                        )}
                        {announcement.rejected_at && (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="w-3 h-3" />
                            Rejected
                          </Badge>
                        )}
                        {!announcement.is_active && !announcement.pending_approval && !announcement.rejected_at && (
                          <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          Created {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                        </span>
                        {announcement.profiles && (
                          <span>
                            by {announcement.profiles.full_name || announcement.profiles.email}
                          </span>
                        )}
                        {announcement.expires_at && (
                          <span className="text-warning-foreground">
                            Expires {format(new Date(announcement.expires_at), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                      {announcement.rejected_at && announcement.rejection_reason && (
                        <p className="text-xs text-destructive mt-2 italic">
                          Rejection reason: {announcement.rejection_reason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Approve/Reject buttons for super admins when pending */}
                      {announcement.pending_approval && !announcement.rejected_at && (isSuperAdmin || isPlatformAdmin) && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => handleApprove(announcement)}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-destructive border-destructive hover:bg-destructive/10"
                            onClick={() => setRejectingAnnouncement(announcement)}
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </Button>
                        </>
                      )}
                      {!announcement.pending_approval && !announcement.rejected_at && (
                        <Switch
                          checked={announcement.is_active}
                          onCheckedChange={() => handleToggleActive(announcement)}
                          aria-label="Toggle active"
                        />
                      )}
                      {!announcement.rejected_at && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(announcement)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(announcement.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AnnouncementFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        announcement={editingAnnouncement}
        modules={isModuleAdminOnly ? modules.filter(m => moduleAdminModuleIds.includes(m.id)) : modules}
        years={years}
        isModuleAdminOnly={isModuleAdminOnly}
        moduleAdminModuleIds={moduleAdminModuleIds}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={!!rejectingAnnouncement} onOpenChange={() => { setRejectingAnnouncement(null); setRejectionReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Announcement</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this announcement. The module admin will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Reason for Rejection</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectingAnnouncement(null); setRejectionReason(''); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
