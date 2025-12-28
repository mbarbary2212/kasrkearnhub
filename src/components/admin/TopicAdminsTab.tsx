import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, Trash2, Plus, ChevronRight, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile, TopicAdmin, Topic } from '@/types/database';
import type { Module, ModuleAdmin } from '@/types/curriculum';

interface ModuleChapter {
  id: string;
  module_id: string;
  title: string;
  chapter_number: number;
  order_index: number;
  book_label: string | null;
  created_at: string | null;
}

interface TopicAdminWithDetails extends TopicAdmin {
  profile?: Profile;
  topic?: Topic;
  chapter?: ModuleChapter;
  module?: Module;
}

interface TopicAdminsTabProps {
  users: Array<Profile & { role: string }>;
  modules: Module[];
}

export function TopicAdminsTab({ users, modules }: TopicAdminsTabProps) {
  const { user, isSuperAdmin, isPlatformAdmin } = useAuthContext();
  const queryClient = useQueryClient();
  
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [assignmentType, setAssignmentType] = useState<'topic' | 'chapter'>('chapter');

  // Get module admins for the current user to filter available modules
  const { data: moduleAdmins } = useQuery({
    queryKey: ['module-admins', user?.id],
    queryFn: async () => {
      if (isSuperAdmin || isPlatformAdmin) return [];
      const { data, error } = await supabase
        .from('module_admins')
        .select('*')
        .eq('user_id', user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Filter modules based on user access
  const availableModules = useMemo(() => {
    if (isSuperAdmin || isPlatformAdmin) return modules;
    if (!moduleAdmins) return [];
    const assignedModuleIds = moduleAdmins.map(a => a.module_id);
    return modules.filter(m => assignedModuleIds.includes(m.id));
  }, [modules, moduleAdmins, isSuperAdmin, isPlatformAdmin]);

  // Fetch all topic admins
  const { data: topicAdmins, isLoading } = useQuery({
    queryKey: ['topic-admins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topic_admins')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TopicAdmin[];
    },
  });

  // Fetch topics for selected module
  const { data: topics } = useQuery({
    queryKey: ['topics', selectedModuleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('module_id', selectedModuleId)
        .order('display_order');
      if (error) throw error;
      return data as Topic[];
    },
    enabled: !!selectedModuleId && assignmentType === 'topic',
  });

  // Fetch chapters for selected module
  const { data: chapters } = useQuery({
    queryKey: ['chapters', selectedModuleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_chapters')
        .select('*')
        .eq('module_id', selectedModuleId)
        .order('order_index');
      if (error) throw error;
      return data as ModuleChapter[];
    },
    enabled: !!selectedModuleId && assignmentType === 'chapter',
  });

  // Assign topic admin mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      const assignments = assignmentType === 'topic'
        ? selectedTopics.map(topicId => ({
            user_id: selectedUserId,
            topic_id: topicId,
            chapter_id: null,
            module_id: selectedModuleId,
            assigned_by: user?.id,
          }))
        : selectedChapters.map(chapterId => ({
            user_id: selectedUserId,
            topic_id: null,
            chapter_id: chapterId,
            module_id: selectedModuleId,
            assigned_by: user?.id,
          }));

      const { error } = await supabase
        .from('topic_admins')
        .insert(assignments);
      
      if (error) throw error;

      // Also ensure user has topic_admin role
      await supabase.from('user_roles').delete().eq('user_id', selectedUserId);
      await supabase.from('user_roles').insert({ user_id: selectedUserId, role: 'topic_admin' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic-admins'] });
      toast.success('Topic Admin assigned successfully');
      resetAssignDialog();
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('User is already assigned to one or more of these topics/chapters');
      } else {
        toast.error('Failed to assign Topic Admin');
      }
    },
  });

  // Remove assignment mutation
  const removeMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('topic_admins')
        .delete()
        .eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic-admins'] });
      toast.success('Assignment removed');
    },
    onError: () => {
      toast.error('Failed to remove assignment');
    },
  });

  const resetAssignDialog = () => {
    setAssignDialogOpen(false);
    setSelectedUserId('');
    setSelectedModuleId('');
    setSelectedTopics([]);
    setSelectedChapters([]);
    setAssignmentType('chapter');
  };

  // Get user name by ID
  const getUserName = (userId: string) => {
    const u = users.find(u => u.id === userId);
    return u?.full_name || u?.email || 'Unknown';
  };

  // Get topic name by ID
  const getTopicName = (topicId: string) => {
    // Need to fetch from all topics
    return topicId.substring(0, 8) + '...';
  };

  // Get chapter name by ID
  const getChapterName = (chapterId: string) => {
    return chapterId.substring(0, 8) + '...';
  };

  // Get module name
  const getModuleName = (moduleId: string) => {
    return modules.find(m => m.id === moduleId)?.name || 'Unknown';
  };

  // Users eligible to be Topic Admins (not already super/platform/module admins)
  const eligibleUsers = users.filter(u => 
    u.role === 'student' || u.role === 'teacher' || u.role === 'topic_admin'
  );

  // Group topic admins by user
  const topicAdminsByUser = useMemo(() => {
    if (!topicAdmins) return {};
    const grouped: Record<string, TopicAdmin[]> = {};
    topicAdmins.forEach(ta => {
      if (!grouped[ta.user_id]) {
        grouped[ta.user_id] = [];
      }
      grouped[ta.user_id].push(ta);
    });
    return grouped;
  }, [topicAdmins]);

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Topic (Chapter) Admin Assignments
              </CardTitle>
              <CardDescription>
                Assign users to manage content within specific topics or chapters. Topic Admins can add/edit content only within their assigned scope.
              </CardDescription>
            </div>
            <Button onClick={() => setAssignDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Assign Topic Admin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(topicAdminsByUser).length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No Topic Admins assigned yet. Click "Assign Topic Admin" to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(topicAdminsByUser).map(([userId, assignments]) => (
                <div key={userId} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center">
                        <span className="font-semibold text-teal-700 dark:text-teal-300">
                          {getUserName(userId)[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{getUserName(userId)}</p>
                        <p className="text-sm text-muted-foreground">
                          {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-teal-100 text-teal-700">Topic Admin</Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Assigned Scope:</p>
                    <div className="flex flex-wrap gap-2">
                      {assignments.map(a => (
                        <Badge key={a.id} variant="secondary" className="gap-1 py-1">
                          <BookOpen className="w-3 h-3" />
                          {getModuleName(a.module_id)}
                          <ChevronRight className="w-3 h-3" />
                          {a.topic_id ? `Topic` : `Chapter`}
                          <button
                            onClick={() => {
                              if (confirm('Remove this assignment?')) {
                                removeMutation.mutate(a.id);
                              }
                            }}
                            className="ml-1 hover:text-destructive"
                            disabled={removeMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={(open) => !open && resetAssignDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Topic Admin</DialogTitle>
            <DialogDescription>
              Select a user and the topics/chapters they should manage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* User Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">User *</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Module Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Module *</label>
              <Select 
                value={selectedModuleId} 
                onValueChange={(v) => {
                  setSelectedModuleId(v);
                  setSelectedTopics([]);
                  setSelectedChapters([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a module" />
                </SelectTrigger>
                <SelectContent>
                  {availableModules.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignment Type */}
            {selectedModuleId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Assignment Type</label>
                <Select 
                  value={assignmentType} 
                  onValueChange={(v: 'topic' | 'chapter') => {
                    setAssignmentType(v);
                    setSelectedTopics([]);
                    setSelectedChapters([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chapter">Chapters (Module Content)</SelectItem>
                    <SelectItem value="topic">Topics (Department Content)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Chapter/Topic Selection */}
            {selectedModuleId && assignmentType === 'chapter' && chapters && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Chapters *</label>
                <ScrollArea className="h-48 border rounded-md p-3">
                  {chapters.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No chapters in this module</p>
                  ) : (
                    <div className="space-y-2">
                      {chapters.map(ch => (
                        <div key={ch.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={ch.id}
                            checked={selectedChapters.includes(ch.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedChapters(prev => [...prev, ch.id]);
                              } else {
                                setSelectedChapters(prev => prev.filter(id => id !== ch.id));
                              }
                            }}
                          />
                          <label htmlFor={ch.id} className="text-sm cursor-pointer">
                            Ch. {ch.chapter_number}: {ch.title}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            {selectedModuleId && assignmentType === 'topic' && topics && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Topics *</label>
                <ScrollArea className="h-48 border rounded-md p-3">
                  {topics.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No topics in this module</p>
                  ) : (
                    <div className="space-y-2">
                      {topics.map(t => (
                        <div key={t.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={t.id}
                            checked={selectedTopics.includes(t.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTopics(prev => [...prev, t.id]);
                              } else {
                                setSelectedTopics(prev => prev.filter(id => id !== t.id));
                              }
                            }}
                          />
                          <label htmlFor={t.id} className="text-sm cursor-pointer">
                            {t.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetAssignDialog}>
              Cancel
            </Button>
            <Button
              onClick={() => assignMutation.mutate()}
              disabled={
                !selectedUserId || 
                !selectedModuleId || 
                (assignmentType === 'topic' && selectedTopics.length === 0) ||
                (assignmentType === 'chapter' && selectedChapters.length === 0) ||
                assignMutation.isPending
              }
            >
              {assignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
