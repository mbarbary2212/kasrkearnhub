import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, Trash2, Plus, ChevronRight, BookOpen, User } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile, TopicAdmin, Topic } from '@/types/database';
import type { Module, ModuleAdmin, Year } from '@/types/curriculum';

interface ModuleChapter {
  id: string;
  module_id: string;
  title: string;
  chapter_number: number;
  order_index: number;
  book_label: string | null;
  created_at: string | null;
}

interface TopicAdminsTabProps {
  users: Array<Profile & { role: string }>;
  modules: Module[];
  years: Year[];
}

export function TopicAdminsTab({ users, modules, years }: TopicAdminsTabProps) {
  const { user, isSuperAdmin, isPlatformAdmin } = useAuthContext();
  const queryClient = useQueryClient();
  
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [assignmentType, setAssignmentType] = useState<'topic' | 'chapter'>('chapter');
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);

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

  // Filter and sort modules based on user access - sorted by year number then display_order
  const availableModules = useMemo(() => {
    let filtered = modules;
    if (!isSuperAdmin && !isPlatformAdmin) {
      if (!moduleAdmins) return [];
      const assignedModuleIds = moduleAdmins.map(a => a.module_id);
      filtered = modules.filter(m => assignedModuleIds.includes(m.id));
    }
    
    // Sort by year number first, then by display_order
    return [...filtered].sort((a, b) => {
      const yearA = years.find(y => y.id === a.year_id);
      const yearB = years.find(y => y.id === b.year_id);
      const yearNumA = yearA?.number ?? 0;
      const yearNumB = yearB?.number ?? 0;
      
      if (yearNumA !== yearNumB) {
        return yearNumA - yearNumB;
      }
      return (a.display_order ?? 0) - (b.display_order ?? 0);
    });
  }, [modules, years, moduleAdmins, isSuperAdmin, isPlatformAdmin]);

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

  // Fetch all chapters for display
  const { data: allChapters } = useQuery({
    queryKey: ['all-chapters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_chapters')
        .select('*')
        .order('order_index');
      if (error) throw error;
      return data as ModuleChapter[];
    },
  });

  // Fetch all topics for display
  const { data: allTopics } = useQuery({
    queryKey: ['all-topics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as Topic[];
    },
  });

  // Fetch topics for selected module (for assignment dialog)
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

  // Fetch chapters for selected module (for assignment dialog)
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

  // Get user info by ID
  const getUserInfo = (userId: string) => {
    const u = users.find(u => u.id === userId);
    return {
      name: u?.full_name || u?.email || 'Unknown',
      email: u?.email || '',
    };
  };

  // Get chapter name by ID
  const getChapterName = (chapterId: string) => {
    const chapter = allChapters?.find(c => c.id === chapterId);
    return chapter ? `Ch. ${chapter.chapter_number}: ${chapter.title}` : 'Unknown Chapter';
  };

  // Get topic name by ID  
  const getTopicName = (topicId: string) => {
    const topic = allTopics?.find(t => t.id === topicId);
    return topic?.name || 'Unknown Topic';
  };

  // Get module name
  const getModuleName = (moduleId: string) => {
    return modules.find(m => m.id === moduleId)?.name || 'Unknown';
  };

  // Users eligible to be Topic Admins (exclude students)
  const eligibleUsers = users
    .filter(u => ['teacher', 'topic_admin', 'department_admin', 'platform_admin'].includes(u.role) && u.status !== 'removed' && u.status !== 'banned')
    .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));

  // Users with topic_admin role (for showing in the list even without assignments)
  const topicAdminUsers = users.filter(u => u.role === 'topic_admin');

  // Group topic admins by user
  const topicAdminsByUser = useMemo(() => {
    const grouped: Record<string, TopicAdmin[]> = {};
    
    // First, add all users with topic_admin role (even if they have no assignments)
    topicAdminUsers.forEach(u => {
      grouped[u.id] = [];
    });
    
    // Then add their assignments
    if (topicAdmins) {
      topicAdmins.forEach(ta => {
        // Filter based on user access
        if (!isSuperAdmin && !isPlatformAdmin) {
          const assignedModuleIds = moduleAdmins?.map(a => a.module_id) || [];
          if (!assignedModuleIds.includes(ta.module_id)) return;
        }
        if (!grouped[ta.user_id]) {
          grouped[ta.user_id] = [];
        }
        grouped[ta.user_id].push(ta);
      });
    }
    return grouped;
  }, [topicAdmins, topicAdminUsers, isSuperAdmin, isPlatformAdmin, moduleAdmins]);

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
                Assign users to manage content within specific topics or chapters. 
                {!isSuperAdmin && !isPlatformAdmin && ' You can only assign within your modules.'}
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
              No Topic Admins found. Change a user's role to "Topic Admin" first in the Users tab.
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(topicAdminsByUser).map(([userId, assignments]) => {
                const userInfo = getUserInfo(userId);
                // Group assignments by module
                const byModule: Record<string, TopicAdmin[]> = {};
                assignments.forEach(a => {
                  if (!byModule[a.module_id]) byModule[a.module_id] = [];
                  byModule[a.module_id].push(a);
                });

                const hasAssignments = assignments.length > 0;

                return (
                  <div key={userId} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-teal-700 dark:text-teal-300" />
                        </div>
                        <div>
                          <p className="font-medium">{userInfo.name}</p>
                          <p className="text-sm text-muted-foreground">{userInfo.email}</p>
                        </div>
                      </div>
                      <Badge className="bg-teal-100 text-teal-700">Topic Admin</Badge>
                    </div>

                    <div className="space-y-3 pl-13">
                      {hasAssignments ? (
                        Object.entries(byModule).map(([moduleId, moduleAssignments]) => (
                          <div key={moduleId} className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <BookOpen className="w-4 h-4 text-muted-foreground" />
                              <span>{getModuleName(moduleId)}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 pl-6">
                              {moduleAssignments.map(a => (
                                <Badge key={a.id} variant="secondary" className="gap-1 py-1.5">
                                  {a.chapter_id 
                                    ? getChapterName(a.chapter_id)
                                    : a.topic_id 
                                      ? getTopicName(a.topic_id)
                                      : 'Unknown'
                                  }
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
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No chapters/topics assigned yet. Click "Assign Topic Admin" to assign content.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
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
              Select a user and the chapters they should manage.
              {!isSuperAdmin && !isPlatformAdmin && ' You can only assign within your modules.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* User Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">User *</label>
              <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={userPopoverOpen} className="w-full justify-between font-normal">
                    {selectedUserId
                      ? (eligibleUsers.find(u => u.id === selectedUserId)?.full_name || eligibleUsers.find(u => u.id === selectedUserId)?.email || 'Selected')
                      : 'Search and select a user...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name or email..." />
                    <CommandList>
                      <CommandEmpty>No user found.</CommandEmpty>
                      <CommandGroup>
                        {eligibleUsers.map(u => (
                          <CommandItem
                            key={u.id}
                            value={`${u.full_name || ''} ${u.email}`}
                            onSelect={() => {
                              setSelectedUserId(u.id);
                              setUserPopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedUserId === u.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span>{u.full_name || u.email}</span>
                              {u.full_name && <span className="text-xs text-muted-foreground">{u.email}</span>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
                    <div className="space-y-3">
                      {(() => {
                        const grouped = chapters.reduce((acc, ch) => {
                          const label = ch.book_label || 'General';
                          if (!acc[label]) acc[label] = [];
                          acc[label].push(ch);
                          return acc;
                        }, {} as Record<string, typeof chapters>);
                        const labels = Object.keys(grouped);
                        const hasMultipleGroups = labels.length > 1;
                        
                        return labels.map(label => (
                          <div key={label}>
                            {hasMultipleGroups && (
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</p>
                            )}
                            <div className="space-y-2 mb-2">
                              {grouped[label].map(ch => (
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
                          </div>
                        ));
                      })()}
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
