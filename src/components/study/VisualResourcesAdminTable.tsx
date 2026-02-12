import { useState, useCallback } from 'react';
import { Pencil, Trash2, Check, X, Network, Image, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { toast } from 'sonner';
import {
  StudyResource,
  StudyResourceType,
  MindMapContent,
  InfographicContent,
  useUpdateStudyResource,
} from '@/hooks/useStudyResources';
import { useBulkDeleteContent } from '@/hooks/useContentBulkOperations';
import { requestResourceDelete } from '@/components/content/ResourcesDeleteManager';

const VISUAL_TYPES: { value: StudyResourceType; label: string; icon: React.ReactNode }[] = [
  { value: 'mind_map', label: 'Mind Map', icon: <Network className="w-3 h-3" /> },
  { value: 'infographic', label: 'Infographic', icon: <Image className="w-3 h-3" /> },
  { value: 'algorithm', label: 'Algorithm', icon: <GitBranch className="w-3 h-3" /> },
];

interface VisualResourcesAdminTableProps {
  resources: StudyResource[];
  chapterId?: string;
  topicId?: string;
  moduleId?: string;
  onEdit?: (resource: StudyResource) => void;
}

export function VisualResourcesAdminTable({
  resources,
  chapterId,
  topicId,
  moduleId,
  onEdit,
}: VisualResourcesAdminTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const updateResource = useUpdateStudyResource();
  const bulkDelete = useBulkDeleteContent('study_resources');

  const allSelected = resources.length > 0 && selectedIds.size === resources.length;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(resources.map(r => r.id)));
    }
  }, [allSelected, resources]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const startRename = useCallback((resource: StudyResource) => {
    setEditingId(resource.id);
    setEditTitle(resource.title);
  }, []);

  const saveRename = useCallback((resource: StudyResource) => {
    if (!editTitle.trim() || editTitle === resource.title) {
      setEditingId(null);
      return;
    }
    updateResource.mutate(
      { id: resource.id, title: editTitle.trim() },
      {
        onSuccess: () => {
          toast.success('Renamed successfully');
          setEditingId(null);
        },
        onError: () => toast.error('Failed to rename'),
      }
    );
  }, [editTitle, updateResource]);

  const changeType = useCallback((resource: StudyResource, newType: StudyResourceType) => {
    if (newType === resource.resource_type) return;
    updateResource.mutate(
      { id: resource.id, resource_type: newType },
      {
        onSuccess: () => toast.success(`Changed to ${VISUAL_TYPES.find(t => t.value === newType)?.label}`),
        onError: () => toast.error('Failed to change type'),
      }
    );
  }, [updateResource]);

  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    bulkDelete.mutate(
      { ids, chapterId, topicId },
      {
        onSuccess: () => {
          toast.success(`Deleted ${ids.length} items`);
          setSelectedIds(new Set());
          setBulkDeleteOpen(false);
        },
        onError: () => toast.error('Failed to delete'),
      }
    );
  }, [selectedIds, bulkDelete, chapterId, topicId]);

  const getPreviewUrl = (resource: StudyResource): string | undefined => {
    const content = resource.content as MindMapContent & InfographicContent;
    const url = content.fileUrl || (content as any).imageUrl;
    if (url && !url.toLowerCase().endsWith('.pdf') && !url.toLowerCase().endsWith('.html')) {
      return url;
    }
    return undefined;
  };

  const getTypeBadge = (type: StudyResourceType) => {
    const config = VISUAL_TYPES.find(t => t.value === type);
    if (!config) return null;
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  if (resources.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No visual resources found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-2 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-36">Type</TableHead>
              <TableHead className="w-20">Preview</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resources.map(resource => (
              <TableRow key={resource.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(resource.id)}
                    onCheckedChange={() => toggleOne(resource.id)}
                  />
                </TableCell>
                <TableCell>
                  {editingId === resource.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveRename(resource);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveRename(resource)}>
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium line-clamp-1">{resource.title}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100"
                        onClick={() => startRename(resource)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={resource.resource_type}
                    onValueChange={(val) => changeType(resource, val as StudyResourceType)}
                  >
                    <SelectTrigger className="h-7 text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VISUAL_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex items-center gap-1.5">
                            {t.icon}
                            {t.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {getPreviewUrl(resource) ? (
                    <img
                      src={getPreviewUrl(resource)}
                      alt={resource.title}
                      className="w-14 h-9 object-cover rounded border"
                    />
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit?.(resource)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => requestResourceDelete('mind_map', resource.id, resource.title)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the selected visual resources. This action can be undone from the admin panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
