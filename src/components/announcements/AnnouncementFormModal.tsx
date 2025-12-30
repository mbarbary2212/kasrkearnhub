import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCreateAnnouncement, useUpdateAnnouncement, Announcement } from '@/hooks/useAnnouncements';

interface AnnouncementFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: Announcement | null;
  modules?: { id: string; name: string }[];
  years?: { id: string; name: string }[];
  defaultModuleId?: string;
  isModuleContext?: boolean;
  isModuleAdminOnly?: boolean;
  moduleAdminModuleIds?: string[];
}

export function AnnouncementFormModal({
  open,
  onOpenChange,
  announcement,
  modules = [],
  years = [],
  defaultModuleId,
  isModuleContext = false,
  isModuleAdminOnly = false,
  moduleAdminModuleIds = [],
}: AnnouncementFormModalProps) {
  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();
  const isEditing = !!announcement;

  const [form, setForm] = useState({
    title: '',
    content: '',
    target_type: isModuleContext ? 'module' : 'all' as 'all' | 'module' | 'year',
    module_id: defaultModuleId || '',
    year_id: '',
    priority: 'normal' as 'normal' | 'important' | 'urgent',
    expires_at: null as Date | null,
    is_active: true,
  });

  useEffect(() => {
    if (announcement) {
      setForm({
        title: announcement.title,
        content: announcement.content,
        target_type: announcement.target_type,
        module_id: announcement.module_id || '',
        year_id: announcement.year_id || '',
        priority: announcement.priority,
        expires_at: announcement.expires_at ? new Date(announcement.expires_at) : null,
        is_active: announcement.is_active,
      });
    } else {
      // For module admins, default to module target and their first module
      const defaultModuleForAdmin = isModuleAdminOnly && moduleAdminModuleIds.length > 0 
        ? moduleAdminModuleIds[0] 
        : (defaultModuleId || '');
      
      setForm({
        title: '',
        content: '',
        target_type: isModuleContext || isModuleAdminOnly ? 'module' : 'all',
        module_id: defaultModuleForAdmin,
        year_id: '',
        priority: 'normal',
        expires_at: null,
        is_active: true,
      });
    }
  }, [announcement, defaultModuleId, isModuleContext, isModuleAdminOnly, moduleAdminModuleIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Determine if this needs approval (module admin creating non-module-specific announcement)
    const needsApproval = isModuleAdminOnly && form.target_type !== 'module';

    const data = {
      title: form.title,
      content: form.content,
      target_type: form.target_type,
      module_id: form.target_type === 'module' ? form.module_id : null,
      year_id: form.target_type === 'year' ? form.year_id : null,
      priority: form.priority,
      expires_at: form.expires_at?.toISOString() || null,
      pending_approval: needsApproval,
    };

    try {
      if (isEditing) {
        await updateAnnouncement.mutateAsync({
          id: announcement!.id,
          ...data,
          is_active: form.is_active,
        });
      } else {
        await createAnnouncement.mutateAsync(data);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isPending = createAnnouncement.isPending || updateAnnouncement.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Announcement' : 'Create Announcement'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Announcement title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Write your announcement..."
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={v => setForm(f => ({ ...f, priority: v as 'normal' | 'important' | 'urgent' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

          {!isModuleContext && !isModuleAdminOnly && (
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select
                  value={form.target_type}
                  onValueChange={v => setForm(f => ({ ...f, target_type: v as 'all' | 'module' | 'year' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    <SelectItem value="module">Specific Module</SelectItem>
                    <SelectItem value="year">Specific Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Module admins see a simplified target selector */}
            {isModuleAdminOnly && (
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select
                  value={form.target_type}
                  onValueChange={v => setForm(f => ({ ...f, target_type: v as 'all' | 'module' | 'year' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="module">My Module Students</SelectItem>
                    <SelectItem value="all">All Students (requires approval)</SelectItem>
                  </SelectContent>
                </Select>
                {form.target_type === 'all' && (
                  <p className="text-xs text-warning-foreground">
                    Announcements to all students require Super Admin approval before being published.
                  </p>
                )}
              </div>
            )}
          </div>

          {form.target_type === 'module' && !isModuleContext && (
            <div className="space-y-2">
              <Label>Module</Label>
              <Select
                value={form.module_id}
                onValueChange={v => setForm(f => ({ ...f, module_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a module" />
                </SelectTrigger>
                <SelectContent>
                  {(isModuleAdminOnly 
                    ? modules.filter(m => moduleAdminModuleIds.includes(m.id))
                    : modules
                  ).map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.target_type === 'year' && (
            <div className="space-y-2">
              <Label>Year</Label>
              <Select
                value={form.year_id}
                onValueChange={v => setForm(f => ({ ...f, year_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Expiration Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !form.expires_at && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.expires_at ? format(form.expires_at, 'PPP') : 'No expiration'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.expires_at || undefined}
                  onSelect={date => setForm(f => ({ ...f, expires_at: date || null }))}
                  disabled={date => date < new Date()}
                  initialFocus
                />
                {form.expires_at && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setForm(f => ({ ...f, expires_at: null }))}
                    >
                      Clear expiration
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {isEditing && (
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="is_active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive announcements won't be shown to students
                </p>
              </div>
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={checked => setForm(f => ({ ...f, is_active: checked }))}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Announcement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
