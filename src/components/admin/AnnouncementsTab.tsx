import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
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
  Megaphone, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  BookOpen, 
  Calendar,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  useAdminAnnouncements, 
  useUpdateAnnouncement, 
  useDeleteAnnouncement,
  Announcement,
} from '@/hooks/useAnnouncements';
import { AnnouncementFormModal } from '@/components/announcements/AnnouncementFormModal';

interface AnnouncementsTabProps {
  modules: { id: string; name: string }[];
  years: { id: string; name: string }[];
}

export function AnnouncementsTab({ modules, years }: AnnouncementsTabProps) {
  const { data: announcements, isLoading } = useAdminAnnouncements();
  const updateAnnouncement = useUpdateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
                Broadcast messages to students across the platform.
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
                    !announcement.is_active && 'opacity-60 bg-muted/50'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h4 className="font-semibold">{announcement.title}</h4>
                        {getPriorityBadge(announcement.priority)}
                        {getTargetBadge(announcement)}
                        {!announcement.is_active && (
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
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={announcement.is_active}
                        onCheckedChange={() => handleToggleActive(announcement)}
                        aria-label="Toggle active"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(announcement)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
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
        modules={modules}
        years={years}
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
    </>
  );
}
