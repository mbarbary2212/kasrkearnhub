import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAdminData, UserWithRole } from '@/hooks/useAdminData';
import { useUserAdminActions } from '@/hooks/useUserAdminActions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Users, Trash2, Plus, BookOpen, Search, ArrowUpDown, RotateCcw, KeyRound, Mail, Ban, UserX, UserCheck, MoreHorizontal, Send, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppRole } from '@/types/database';
import type { Year, Module } from '@/types/curriculum';
import { TopicAdminsTab } from '@/components/admin/TopicAdminsTab';
import { UserAnalyticsTab } from '@/components/admin/UserAnalyticsTab';
import { SetPasswordDialog } from '@/components/admin/SetPasswordDialog';
import { EditEmailDialog } from '@/components/admin/EditEmailDialog';
import { DeleteUserDialog } from '@/components/admin/DeleteUserDialog';
import { UserActionModal } from '@/components/admin/UserActionModal';
import { UserAvatarUploadDialog } from '@/components/admin/UserAvatarUploadDialog';

const ROLE_LABELS: Record<AppRole, string> = {
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Admin (Legacy)',
  topic_admin: 'Topic Admin',
  department_admin: 'Module Admin',
  platform_admin: 'Platform Admin',
  super_admin: 'Super Admin',
};

const ROLE_COLORS: Record<AppRole, string> = {
  student: 'bg-slate-100 text-slate-700',
  teacher: 'bg-blue-100 text-blue-700',
  admin: 'bg-amber-100 text-amber-700',
  topic_admin: 'bg-teal-100 text-teal-700',
  department_admin: 'bg-purple-100 text-purple-700',
  platform_admin: 'bg-indigo-100 text-indigo-700',
  super_admin: 'bg-red-100 text-red-700',
};

export function UsersTab() {
  const { user, isSuperAdmin, isPlatformAdmin, isAdmin } = useAuthContext();
  const queryClient = useQueryClient();
  const { data: adminData } = useAdminData(!!isAdmin);
  const users = adminData?.users ?? [];
  const years = adminData?.years ?? [];
  const modules = adminData?.modules ?? [];

  const { banUser, unbanUser, removeUser, restoreUser, resetPassword } = useUserAdminActions();

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('asc');
  const [studentSortOrder, setStudentSortOrder] = useState<'asc' | 'desc'>('asc');
  const [moduleAdminSortOrder, setModuleAdminSortOrder] = useState<'asc' | 'desc'>('asc');
  const [moduleAdminAssignDialogOpen, setModuleAdminAssignDialogOpen] = useState(false);
  const [maSelectedUserId, setMaSelectedUserId] = useState('');
  const [maSelectedModules, setMaSelectedModules] = useState<string[]>([]);
  const [maUserPopoverOpen, setMaUserPopoverOpen] = useState(false);
  const [platformAdminSortOrder, setPlatformAdminSortOrder] = useState<'asc' | 'desc'>('asc');
  const [deactivatedSearch, setDeactivatedSearch] = useState('');
  const [deactivatedSortOrder, setDeactivatedSortOrder] = useState<'asc' | 'desc'>('asc');
  const [passwordDialogUser, setPasswordDialogUser] = useState<{ id: string; email: string; full_name: string | null } | null>(null);
  const [editEmailUser, setEditEmailUser] = useState<{ id: string; email: string; full_name: string | null } | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<{ id: string; email: string; full_name: string | null; status?: string } | null>(null);
  const [actionModalState, setActionModalState] = useState<{
    open: boolean;
    action: 'ban' | 'unban' | 'remove' | 'restore' | null;
    user: { id: string; full_name: string | null; email: string } | null;
  }>({ open: false, action: null, user: null });
  const [avatarUploadUser, setAvatarUploadUser] = useState<{ id: string; email: string; full_name: string | null; avatar_url?: string | null } | null>(null);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    if ((newRole === 'super_admin' || newRole === 'platform_admin') && !isSuperAdmin) {
      toast.error('Only Super Admins can assign this role');
      return;
    }
    try {
      await supabase.from('user_roles').delete().eq('user_id', userId);
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: newRole });
      if (error) throw error;
      if (newRole !== 'department_admin') {
        await supabase.from('module_admins').delete().eq('user_id', userId);
      }
      if (newRole !== 'topic_admin') {
        await supabase.from('topic_admins').delete().eq('user_id', userId);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-data'] });
      toast.success('Role updated successfully');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleAssignModule = async (userId: string, moduleId: string) => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admins can assign modules');
      return;
    }
    try {
      const { error } = await supabase.from('module_admins').insert({
        user_id: userId,
        module_id: moduleId,
        assigned_by: user?.id,
      });
      if (error) {
        if (error.code === '23505') {
          toast.error('User is already assigned to this module');
          return;
        }
        throw error;
      }
      queryClient.invalidateQueries({ queryKey: ['admin-data'] });
      setSelectedModule('');
      toast.success('Module assigned successfully');
    } catch (error) {
      console.error('Error assigning module:', error);
      toast.error('Failed to assign module');
    }
  };

  const handleAssignModuleAdmin = async () => {
    if (!maSelectedUserId || maSelectedModules.length === 0) return;
    try {
      await supabase.from('user_roles').delete().eq('user_id', maSelectedUserId);
      await supabase.from('user_roles').insert({ user_id: maSelectedUserId, role: 'department_admin' });
      const existingUser = users.find(u => u.id === maSelectedUserId);
      const existingModuleIds = existingUser?.moduleAssignments?.map(a => a.module_id) || [];
      const newModuleIds = maSelectedModules.filter(id => !existingModuleIds.includes(id));
      if (newModuleIds.length > 0) {
        const { error } = await supabase.from('module_admins').insert(
          newModuleIds.map(moduleId => ({ user_id: maSelectedUserId, module_id: moduleId, assigned_by: user?.id }))
        );
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ['admin-data'] });
      toast.success('Module Admin assigned successfully');
      setModuleAdminAssignDialogOpen(false);
      setMaSelectedUserId('');
      setMaSelectedModules([]);
    } catch (error) {
      console.error('Error assigning module admin:', error);
      toast.error('Failed to assign module admin');
    }
  };

  const handleRemoveModuleAssignment = async (userId: string, moduleId: string) => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admins can remove module assignments');
      return;
    }
    try {
      const { error } = await supabase.from('module_admins').delete().eq('user_id', userId).eq('module_id', moduleId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-data'] });
      toast.success('Module assignment removed');
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast.error('Failed to remove assignment');
    }
  };

  const getModuleName = (id: string) => modules.find(m => m.id === id)?.name || 'Unknown';

  const getAvailableRoles = (): AppRole[] => {
    if (isSuperAdmin) return ['student', 'teacher', 'topic_admin', 'department_admin', 'platform_admin', 'super_admin'];
    if (isPlatformAdmin) return ['student', 'teacher', 'topic_admin', 'department_admin'];
    return ['student', 'teacher'];
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Management
          </CardTitle>
          <CardDescription>Manage users, roles, and permissions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="directory" className="space-y-4">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="directory" className="data-[state=active]:bg-background">Directory</TabsTrigger>
              {(isSuperAdmin || isPlatformAdmin) && (
                <TabsTrigger value="students" className="data-[state=active]:bg-background">Students</TabsTrigger>
              )}
              <TabsTrigger value="topic-admins" className="data-[state=active]:bg-background">Topic Admins</TabsTrigger>
              {isSuperAdmin && (
                <TabsTrigger value="module-admins" className="data-[state=active]:bg-background">Module Admins</TabsTrigger>
              )}
              {isSuperAdmin && (
                <TabsTrigger value="platform-admins" className="data-[state=active]:bg-background">Platform Admins</TabsTrigger>
              )}
              {(isSuperAdmin || isPlatformAdmin) && (
                <TabsTrigger value="analytics" className="data-[state=active]:bg-background">Analytics</TabsTrigger>
              )}
              {(isSuperAdmin || isPlatformAdmin) && (
                <TabsTrigger value="deactivated" className="data-[state=active]:bg-background">Deactivated</TabsTrigger>
              )}
            </TabsList>

            {/* Directory Sub-tab */}
            <TabsContent value="directory" className="mt-4">
              <div className="mb-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search by name or email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-9" />
                </div>
                <Button variant="outline" size="sm" onClick={() => setUserSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                  {userSortOrder === 'asc' ? 'A → Z' : 'Z → A'}
                </Button>
              </div>
              {users.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No users found</p>
              ) : (
                <div className="space-y-3">
                  {users
                    .filter(u => {
                      if (!userSearch.trim()) return true;
                      const search = userSearch.toLowerCase();
                      return u.email.toLowerCase().includes(search) || (u.full_name?.toLowerCase().includes(search) ?? false);
                    })
                    .sort((a, b) => {
                      const nameA = (a.full_name || a.email).toLowerCase();
                      const nameB = (b.full_name || b.email).toLowerCase();
                      return userSortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
                    })
                    .map((u) => {
                      const userStatus = (u as any).status || 'active';
                      return (
                        <div key={u.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                              <span className="font-semibold text-secondary-foreground">
                                {u.full_name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{u.full_name || 'No name'}</p>
                                {userStatus === 'banned' && (
                                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 text-xs">Suspended</Badge>
                                )}
                                {userStatus === 'removed' && (
                                  <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">Deactivated</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{u.email}</p>
                              {u.role === 'department_admin' && u.moduleAssignments && u.moduleAssignments.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {u.moduleAssignments.map(a => (
                                    <Badge key={a.id} variant="outline" className="text-xs">{getModuleName(a.module_id)}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={ROLE_COLORS[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                            {u.id === user?.id ? (
                              <Badge variant="outline">You</Badge>
                            ) : (
                              <>
                                <Select value={u.role} onValueChange={(value: AppRole) => handleRoleChange(u.id, value)}>
                                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {getAvailableRoles().map(role => (
                                      <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-52">
                                    {isSuperAdmin && (
                                      <DropdownMenuItem onClick={() => setAvatarUploadUser({ id: u.id, email: u.email, full_name: u.full_name, avatar_url: (u as any).avatar_url })}>
                                        <Camera className="h-4 w-4 mr-2" />Upload Photo
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => setEditEmailUser({ id: u.id, email: u.email, full_name: u.full_name })}>
                                      <Mail className="h-4 w-4 mr-2" />Edit Email
                                    </DropdownMenuItem>
                                    {isSuperAdmin && (
                                      <DropdownMenuItem onClick={() => setPasswordDialogUser({ id: u.id, email: u.email, full_name: u.full_name })}>
                                        <KeyRound className="h-4 w-4 mr-2" />Set Temporary Password
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => resetPassword.mutate({ email: u.email, fullName: u.full_name || undefined, userId: u.id })}>
                                      <Send className="h-4 w-4 mr-2" />Reset Password
                                      {resetPassword.isPending && <Loader2 className="h-3 w-3 ml-auto animate-spin" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {userStatus === 'active' && (
                                      <DropdownMenuItem onClick={() => setActionModalState({ open: true, action: 'ban', user: { id: u.id, full_name: u.full_name, email: u.email } })}>
                                        <Ban className="h-4 w-4 mr-2" />Suspend User
                                      </DropdownMenuItem>
                                    )}
                                    {userStatus === 'banned' && (
                                      <DropdownMenuItem onClick={() => setActionModalState({ open: true, action: 'unban', user: { id: u.id, full_name: u.full_name, email: u.email } })}>
                                        <UserCheck className="h-4 w-4 mr-2" />Lift Suspension
                                      </DropdownMenuItem>
                                    )}
                                    {userStatus !== 'removed' && (
                                      <DropdownMenuItem onClick={() => setActionModalState({ open: true, action: 'remove', user: { id: u.id, full_name: u.full_name, email: u.email } })}>
                                        <UserX className="h-4 w-4 mr-2" />Deactivate Account
                                      </DropdownMenuItem>
                                    )}
                                    {userStatus === 'removed' && (
                                      <DropdownMenuItem onClick={() => setActionModalState({ open: true, action: 'restore', user: { id: u.id, full_name: u.full_name, email: u.email } })}>
                                        <RotateCcw className="h-4 w-4 mr-2" />Restore Account
                                      </DropdownMenuItem>
                                    )}
                                    {isSuperAdmin && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-destructive focus:text-destructive"
                                          onClick={() => setDeleteUserTarget({ id: u.id, email: u.email, full_name: u.full_name, status: userStatus })}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />Delete User
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </TabsContent>

            {/* Students Sub-tab */}
            {(isSuperAdmin || isPlatformAdmin) && (
              <TabsContent value="students" className="mt-4">
                <div className="mb-4 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input placeholder="Search by name or email..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="pl-10" />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setStudentSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="gap-2">
                    <ArrowUpDown className="w-4 h-4" />
                    {studentSortOrder === 'asc' ? 'A → Z' : 'Z → A'}
                  </Button>
                </div>
                {(() => {
                  const studentUsers = users.filter(u => u.role === 'student');
                  const filteredStudents = studentUsers.filter(u => {
                    if (!studentSearch.trim()) return true;
                    const search = studentSearch.toLowerCase();
                    return u.full_name?.toLowerCase().includes(search) || u.email.toLowerCase().includes(search);
                  }).sort((a, b) => {
                    const nameA = (a.full_name || a.email).toLowerCase();
                    const nameB = (b.full_name || b.email).toLowerCase();
                    return studentSortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
                  });
                  if (filteredStudents.length === 0) {
                    return (
                      <p className="text-muted-foreground text-center py-8">
                        {studentSearch ? 'No students found matching your search' : 'No students found'}
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground mb-2">
                        Showing {filteredStudents.length} of {studentUsers.length} students
                      </p>
                      {filteredStudents.slice(0, 50).map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                              <span className="font-semibold text-secondary-foreground">
                                {u.full_name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{u.full_name || 'No name'}</p>
                              <p className="text-sm text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={ROLE_COLORS.student}>{ROLE_LABELS.student}</Badge>
                          </div>
                        </div>
                      ))}
                      {filteredStudents.length > 50 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          Showing first 50 results. Refine your search to see more.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </TabsContent>
            )}

            {/* Topic Admins Sub-tab */}
            <TabsContent value="topic-admins" className="mt-4">
              <TopicAdminsTab users={users} modules={modules} years={years} />
            </TabsContent>

            {/* Module Admins Sub-tab */}
            {isSuperAdmin && (
              <TabsContent value="module-admins" className="mt-4">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Module Admin Assignments
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Assign users to manage content within specific modules.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setModuleAdminSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="gap-2">
                        <ArrowUpDown className="w-4 h-4" />
                        {moduleAdminSortOrder === 'asc' ? 'A → Z' : 'Z → A'}
                      </Button>
                      <Button onClick={() => setModuleAdminAssignDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Assign Module Admin
                      </Button>
                    </div>
                  </div>
                  {users.filter(u => u.role === 'department_admin').length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No module admins assigned yet. Click "Assign Module Admin" to get started.
                    </p>
                  ) : (
                    [...users.filter(u => u.role === 'department_admin')]
                      .sort((a, b) => {
                        const nameA = (a.full_name || a.email).toLowerCase();
                        const nameB = (b.full_name || b.email).toLowerCase();
                        return moduleAdminSortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
                      })
                      .map(u => (
                        <div key={u.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{u.full_name || 'No name'}</p>
                                <p className="text-sm text-muted-foreground">{u.email}</p>
                              </div>
                            </div>
                            <Badge variant="secondary">Module Admin</Badge>
                          </div>
                          {u.moduleAssignments && u.moduleAssignments.length > 0 && (
                            <div className="flex flex-wrap gap-1 pl-13">
                              {u.moduleAssignments.map(a => (
                                <Badge key={a.id} variant="outline" className="text-xs gap-1 py-1.5">
                                  {getModuleName(a.module_id)}
                                  <button onClick={() => handleRemoveModuleAssignment(u.id, a.module_id)} className="ml-1 hover:text-destructive">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2 pl-13">
                            <Select
                              value={selectedUser === u.id ? selectedModule : ''}
                              onValueChange={(value) => { setSelectedUser(u.id); setSelectedModule(value); }}
                            >
                              <SelectTrigger className="w-72"><SelectValue placeholder="Add another module..." /></SelectTrigger>
                              <SelectContent>
                                {years.map(year => {
                                  const yearModules = modules
                                    .filter(m => m.year_id === year.id)
                                    .filter(m => !u.moduleAssignments?.some(a => a.module_id === m.id))
                                    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
                                  if (yearModules.length === 0) return null;
                                  return (
                                    <div key={year.id}>
                                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">{year.name}</div>
                                      {yearModules.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                      ))}
                                    </div>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              onClick={() => { if (selectedUser === u.id && selectedModule) handleAssignModule(u.id, selectedModule); }}
                              disabled={selectedUser !== u.id || !selectedModule}
                            >
                              Assign
                            </Button>
                          </div>
                        </div>
                      ))
                  )}

                  <Dialog open={moduleAdminAssignDialogOpen} onOpenChange={(open) => {
                    if (!open) { setModuleAdminAssignDialogOpen(false); setMaSelectedUserId(''); setMaSelectedModules([]); }
                  }}>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Assign Module Admin</DialogTitle>
                        <DialogDescription>
                          Select a user and the modules they should manage. Their role will automatically be set to Module Admin.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4 overflow-y-auto min-h-0">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">User *</label>
                          <Popover open={maUserPopoverOpen} onOpenChange={setMaUserPopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" aria-expanded={maUserPopoverOpen} className="w-full justify-between font-normal">
                                {maSelectedUserId
                                  ? (() => { const u = users.find(u => u.id === maSelectedUserId); return u?.full_name || u?.email || 'Selected'; })()
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
                                    {users
                                      .filter(u => ['teacher', 'topic_admin', 'department_admin'].includes(u.role) && u.status !== 'removed' && u.status !== 'banned')
                                      .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email))
                                      .map(u => (
                                        <CommandItem
                                          key={u.id}
                                          value={`${u.full_name || ''} ${u.email}`}
                                          onSelect={() => {
                                            setMaSelectedUserId(u.id);
                                            setMaUserPopoverOpen(false);
                                          }}
                                        >
                                          <Check className={cn("mr-2 h-4 w-4", maSelectedUserId === u.id ? "opacity-100" : "opacity-0")} />
                                          <div className="flex flex-col">
                                            <span>{u.full_name || u.email}{u.role === 'department_admin' ? ' (Module Admin)' : ''}</span>
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
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Select Modules *</label>
                          <ScrollArea className="h-56 border rounded-md p-3">
                            {years.sort((a, b) => a.number - b.number).map(year => {
                              const selectedUserObj = users.find(u => u.id === maSelectedUserId);
                              const existingModuleIds = selectedUserObj?.moduleAssignments?.map(a => a.module_id) || [];
                              const yearModules = modules.filter(m => m.year_id === year.id).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
                              if (yearModules.length === 0) return null;
                              return (
                                <div key={year.id} className="mb-3">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{year.name}</p>
                                  <div className="space-y-2">
                                    {yearModules.map(m => {
                                      const alreadyAssigned = existingModuleIds.includes(m.id);
                                      return (
                                        <div key={m.id} className="flex items-center space-x-2">
                                          <Checkbox
                                            id={`ma-${m.id}`}
                                            checked={maSelectedModules.includes(m.id) || alreadyAssigned}
                                            disabled={alreadyAssigned}
                                            onCheckedChange={(checked) => {
                                              if (checked) setMaSelectedModules(prev => [...prev, m.id]);
                                              else setMaSelectedModules(prev => prev.filter(id => id !== m.id));
                                            }}
                                          />
                                          <label htmlFor={`ma-${m.id}`} className={`text-sm cursor-pointer ${alreadyAssigned ? 'text-muted-foreground' : ''}`}>
                                            {m.name} {alreadyAssigned ? '(already assigned)' : ''}
                                          </label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </ScrollArea>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => { setModuleAdminAssignDialogOpen(false); setMaSelectedUserId(''); setMaSelectedModules([]); }}>
                          Cancel
                        </Button>
                        <Button onClick={handleAssignModuleAdmin} disabled={!maSelectedUserId || maSelectedModules.length === 0}>
                          Assign
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                </TabsContent>
              )}

            {/* Platform Admins Sub-tab */}
            {isSuperAdmin && (
              <TabsContent value="platform-admins" className="mt-4">
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setPlatformAdminSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="gap-2">
                      <ArrowUpDown className="w-4 h-4" />
                      {platformAdminSortOrder === 'asc' ? 'A → Z' : 'Z → A'}
                    </Button>
                  </div>
                  {users.filter(u => u.role === 'platform_admin').length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No platform admins assigned. Change a user's role to "Platform Admin" in the Directory tab.
                    </p>
                  ) : (
                    [...users.filter(u => u.role === 'platform_admin')]
                      .sort((a, b) => {
                        const nameA = (a.full_name || a.email).toLowerCase();
                        const nameB = (b.full_name || b.email).toLowerCase();
                        return platformAdminSortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
                      })
                      .map(u => (
                        <div key={u.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                              <span className="font-semibold text-secondary-foreground">
                                {u.full_name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{u.full_name || 'No name'}</p>
                              <p className="text-sm text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                          <Badge className={ROLE_COLORS.platform_admin}>Platform Admin</Badge>
                        </div>
                      ))
                  )}
                </div>
              </TabsContent>
            )}

            {/* User Analytics Sub-tab */}
            {(isSuperAdmin || isPlatformAdmin) && (
              <TabsContent value="analytics" className="mt-4">
                <UserAnalyticsTab />
              </TabsContent>
            )}

            {/* Deactivated Users Sub-tab */}
            {(isSuperAdmin || isPlatformAdmin) && (
              <TabsContent value="deactivated" className="mt-4">
                <div className="mb-4 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search deactivated users..." value={deactivatedSearch} onChange={(e) => setDeactivatedSearch(e.target.value)} className="pl-9" />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setDeactivatedSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="gap-2">
                    <ArrowUpDown className="w-4 h-4" />
                    {deactivatedSortOrder === 'asc' ? 'A → Z' : 'Z → A'}
                  </Button>
                </div>
                {(() => {
                  const deactivatedUsers = users.filter(u => (u as any).status === 'removed');
                  const filtered = deactivatedUsers
                    .filter(u => {
                      if (!deactivatedSearch.trim()) return true;
                      const search = deactivatedSearch.toLowerCase();
                      return u.full_name?.toLowerCase().includes(search) || u.email.toLowerCase().includes(search);
                    })
                    .sort((a, b) => {
                      const nameA = (a.full_name || a.email).toLowerCase();
                      const nameB = (b.full_name || b.email).toLowerCase();
                      return deactivatedSortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
                    });
                  if (deactivatedUsers.length === 0) {
                    return <p className="text-muted-foreground text-center py-8">No deactivated users.</p>;
                  }
                  if (filtered.length === 0) {
                    return <p className="text-muted-foreground text-center py-8">No deactivated users matching your search.</p>;
                  }
                  return (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground mb-2">{filtered.length} deactivated user{filtered.length !== 1 ? 's' : ''}</p>
                      {filtered.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                              <span className="font-semibold text-muted-foreground">
                                {u.full_name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{u.full_name || 'No name'}</p>
                                <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">Deactivated</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{u.email}</p>
                              {(u as any).status_reason && (
                                <p className="text-xs text-muted-foreground mt-1">Reason: {(u as any).status_reason}</p>
                              )}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => setActionModalState({ open: true, action: 'restore', user: { id: u.id, full_name: u.full_name, email: u.email } })}>
                            <RotateCcw className="w-4 h-4" />Restore
                          </Button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <SetPasswordDialog
        open={!!passwordDialogUser}
        onOpenChange={(open) => { if (!open) setPasswordDialogUser(null); }}
        user={passwordDialogUser}
      />
      <EditEmailDialog
        open={!!editEmailUser}
        onOpenChange={(open) => { if (!open) setEditEmailUser(null); }}
        user={editEmailUser}
      />
      <DeleteUserDialog
        open={!!deleteUserTarget}
        onOpenChange={(open) => { if (!open) setDeleteUserTarget(null); }}
        user={deleteUserTarget}
        isSuperAdmin={isSuperAdmin}
      />
      <UserActionModal
        open={actionModalState.open}
        onOpenChange={(open) => setActionModalState(prev => ({ ...prev, open }))}
        action={actionModalState.action}
        userName={actionModalState.user?.full_name || actionModalState.user?.email || ''}
        onConfirm={async (reason, bannedUntil) => {
          if (!actionModalState.user || !actionModalState.action) return;
          const userId = actionModalState.user.id;
          switch (actionModalState.action) {
            case 'ban': await banUser.mutateAsync({ targetUserId: userId, reason, bannedUntil }); break;
            case 'unban': await unbanUser.mutateAsync({ targetUserId: userId, reason }); break;
            case 'remove': await removeUser.mutateAsync({ targetUserId: userId, reason }); break;
            case 'restore': await restoreUser.mutateAsync({ targetUserId: userId, reason }); break;
          }
          setActionModalState({ open: false, action: null, user: null });
        }}
        isLoading={banUser.isPending || unbanUser.isPending || removeUser.isPending || restoreUser.isPending}
      />

      {avatarUploadUser && (
        <UserAvatarUploadDialog
          open={!!avatarUploadUser}
          onOpenChange={(open) => { if (!open) setAvatarUploadUser(null); }}
          user={avatarUploadUser}
        />
      )}
    </>
  );
}
