import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  BookOpen, 
  ChevronRight, 
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useTopics } from '@/hooks/useTopics';
import { useCreateTopic, useUpdateTopic, useDeleteTopic } from '@/hooks/useTopicManagement';
import { TopicFormModal } from './TopicFormModal';
import { Topic } from '@/types/database';
import { toast } from 'sonner';

interface PharmacologyTopicsViewProps {
  departmentId: string;
  moduleId: string;
  canManageTopics?: boolean;
}

export function PharmacologyTopicsView({
  departmentId,
  moduleId,
  canManageTopics = false,
}: PharmacologyTopicsViewProps) {
  const navigate = useNavigate();
  const { data: topics, isLoading } = useTopics(departmentId);
  
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<Topic | null>(null);
  
  const deleteTopic = useDeleteTopic();

  const handleAddTopic = () => {
    setEditingTopic(null);
    setTopicModalOpen(true);
  };

  const handleEditTopic = (topic: Topic) => {
    setEditingTopic(topic);
    setTopicModalOpen(true);
  };

  const handleDeleteTopic = async (topic: Topic) => {
    try {
      await deleteTopic.mutateAsync({ topicId: topic.id, departmentId });
      toast.success('Topic deleted successfully');
      setDeleteDialog(null);
    } catch {
      toast.error('Failed to delete topic');
    }
  };

  const handleTopicClick = (topic: Topic) => {
    navigate(`/module/${moduleId}/topic/${topic.id}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  // Group topics by description (which contains the grade like "INT 108")
  const groupedTopics = topics?.reduce((acc, topic) => {
    const group = topic.description || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(topic);
    return acc;
  }, {} as Record<string, Topic[]>) || {};

  const sortedGroups = Object.keys(groupedTopics).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-muted-foreground" />
          Topics
        </h2>
        {canManageTopics && (
          <Button size="sm" variant="outline" onClick={handleAddTopic}>
            <Plus className="w-4 h-4 mr-1" />
            Add Topic
          </Button>
        )}
      </div>

      {topics && topics.length > 0 ? (
        <div className="space-y-6">
          {sortedGroups.map((group) => (
            <div key={group} className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
                {group}
              </h3>
              <div className="border rounded-lg divide-y">
                {groupedTopics[group].map((topic, index) => (
                  <div
                    key={topic.id}
                    className="flex items-center gap-3 py-3 px-4 hover:bg-muted/50 transition-colors group"
                  >
                    <button
                      onClick={() => handleTopicClick(topic)}
                      className="flex-1 flex items-center gap-3 text-left"
                    >
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded min-w-[2.5rem] text-center">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-[15px] font-medium truncate">
                        {topic.name}
                      </span>
                    </button>
                    
                    {canManageTopics ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTopic(topic)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeleteDialog(topic)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">No topics yet.</p>
          {canManageTopics && (
            <Button onClick={handleAddTopic}>
              <Plus className="w-4 h-4 mr-1" />
              Add First Topic
            </Button>
          )}
        </div>
      )}

      {/* Topic Form Modal */}
      <TopicFormModal
        open={topicModalOpen}
        onOpenChange={setTopicModalOpen}
        departmentId={departmentId}
        editingTopic={editingTopic}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Topic</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog?.name}"? 
              This will also delete all content (lectures, flashcards, documents, MCQs, etc.) associated with this topic.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteDialog && handleDeleteTopic(deleteDialog)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
