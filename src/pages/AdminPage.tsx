import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Loader2, Shield, Users, Building2, MessageSquare, ChevronRight, Trash2, Plus, Edit, BookOpen, Calendar, Layers, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Profile, AppRole, Department, DepartmentAdmin } from '@/types/database';
import type { Year, Module, ModuleAdmin } from '@/types/curriculum';
import AdminFeedbackPanel from '@/components/feedback/AdminFeedbackPanel';
import { AdminUploadDiagnostics } from '@/components/admin/AdminUploadDiagnostics';

interface UserWithRole extends Profile {
  role: AppRole;
  departmentAssignments?: DepartmentAdmin[];
  moduleAssignments?: ModuleAdmin[];
}

const ROLE_LABELS: Record<AppRole, string> = {
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Admin (Legacy)',
  department_admin: 'Module Admin',
  platform_admin: 'Platform Admin',
  super_admin: 'Super Admin',
};

const ROLE_COLORS: Record<AppRole, string> = {
  student: 'bg-slate-100 text-slate-700',
  teacher: 'bg-blue-100 text-blue-700',
  admin: 'bg-amber-100 text-amber-700',
  department_admin: 'bg-purple-100 text-purple-700',
  platform_admin: 'bg-indigo-100 text-indigo-700',
  super_admin: 'bg-red-100 text-red-700',
};

export default function AdminPage() {
  const { user, isSuperAdmin, isPlatformAdmin, isAdmin, isLoading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string>('');

  // Module form state
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleForm, setModuleForm] = useState({
    year_id: '',
    name: '',
    name_ar: '',
    slug: '',
    description: '',
    is_published: false,
  });

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    async function fetchData() {
      if (!isAdmin) return;

      try {
        // Fetch all profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*');

        if (profilesError) throw profilesError;

        // Fetch all roles
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('*');

        if (rolesError) throw rolesError;

        // Fetch department assignments (legacy)
        const { data: deptAssignments } = await supabase
          .from('department_admins')
          .select('*');

        // Fetch module assignments
        const { data: moduleAssignments } = await supabase
          .from('module_admins')
          .select('*');

        // Fetch departments (for reference)
        const { data: depts } = await supabase
          .from('departments')
          .select('*')
          .order('display_order');

        // Fetch years
        const { data: yearsData } = await supabase
          .from('years')
          .select('*')
          .order('display_order');

        // Fetch modules
        const { data: modulesData } = await supabase
          .from('modules')
          .select('*')
          .order('display_order');

        setDepartments((depts as Department[]) || []);
        setYears((yearsData as Year[]) || []);
        setModules((modulesData as Module[]) || []);

        // Combine profiles with roles and assignments
        const usersWithRoles = (profiles || []).map((profile) => {
          const userRole = roles?.find(r => r.user_id === profile.id);
          const userDeptAssignments = deptAssignments?.filter(a => a.user_id === profile.id) || [];
          const userModuleAssignments = moduleAssignments?.filter(a => a.user_id === profile.id) || [];
          return {
            ...profile,
            role: (userRole?.role as AppRole) || 'student',
            departmentAssignments: userDeptAssignments as DepartmentAdmin[],
            moduleAssignments: userModuleAssignments as ModuleAdmin[],
          };
        });

        setUsers(usersWithRoles);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [isAdmin]);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    if ((newRole === 'super_admin' || newRole === 'platform_admin') && !isSuperAdmin) {
      toast.error('Only Super Admins can assign this role');
      return;
    }

    try {
      await supabase.from('user_roles').delete().eq('user_id', userId);
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (error) throw error;

      if (newRole !== 'department_admin') {
        await supabase.from('module_admins').delete().eq('user_id', userId);
      }

      setUsers(prev =>
        prev.map(u => 
          u.id === userId 
            ? { ...u, role: newRole, moduleAssignments: newRole === 'department_admin' ? u.moduleAssignments : [] } 
            : u
        )
      );

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
      const { error } = await supabase
        .from('module_admins')
        .insert({ 
          user_id: userId, 
          module_id: moduleId,
          assigned_by: user?.id 
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('User is already assigned to this module');
          return;
        }
        throw error;
      }

      setUsers(prev =>
        prev.map(u => {
          if (u.id === userId) {
            const newAssignment: ModuleAdmin = {
              id: crypto.randomUUID(),
              user_id: userId,
              module_id: moduleId,
              assigned_by: user?.id || null,
              created_at: new Date().toISOString(),
            };
            return {
              ...u,
              moduleAssignments: [...(u.moduleAssignments || []), newAssignment],
            };
          }
          return u;
        })
      );

      setSelectedModule('');
      toast.success('Module assigned successfully');
    } catch (error) {
      console.error('Error assigning module:', error);
      toast.error('Failed to assign module');
    }
  };

  const handleRemoveModuleAssignment = async (userId: string, moduleId: string) => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admins can remove module assignments');
      return;
    }

    try {
      const { error } = await supabase
        .from('module_admins')
        .delete()
        .eq('user_id', userId)
        .eq('module_id', moduleId);

      if (error) throw error;

      setUsers(prev =>
        prev.map(u => {
          if (u.id === userId) {
            return {
              ...u,
              moduleAssignments: u.moduleAssignments?.filter(a => a.module_id !== moduleId) || [],
            };
          }
          return u;
        })
      );

      toast.success('Module assignment removed');
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast.error('Failed to remove assignment');
    }
  };

  const getModuleName = (id: string) => {
    return modules.find(m => m.id === id)?.name || 'Unknown';
  };

  const getYearName = (id: string) => {
    return years.find(y => y.id === id)?.name || 'Unknown';
  };

  const getAvailableRoles = (): AppRole[] => {
    if (isSuperAdmin) {
      return ['student', 'teacher', 'department_admin', 'platform_admin', 'super_admin'];
    }
    if (isPlatformAdmin) {
      return ['student', 'teacher', 'department_admin'];
    }
    return ['student', 'teacher'];
  };

  // Module CRUD operations
  const handleCreateModule = async () => {
    if (!moduleForm.year_id || !moduleForm.name || !moduleForm.slug) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('modules')
        .insert({
          year_id: moduleForm.year_id,
          name: moduleForm.name,
          name_ar: moduleForm.name_ar || null,
          slug: moduleForm.slug,
          description: moduleForm.description || null,
          is_published: moduleForm.is_published,
          display_order: modules.filter(m => m.year_id === moduleForm.year_id).length,
        })
        .select()
        .single();

      if (error) throw error;

      setModules(prev => [...prev, data as Module]);
      setShowModuleDialog(false);
      resetModuleForm();
      toast.success('Module created successfully');
    } catch (error) {
      console.error('Error creating module:', error);
      toast.error('Failed to create module');
    }
  };

  const handleUpdateModule = async () => {
    if (!editingModule) return;

    try {
      const { data, error } = await supabase
        .from('modules')
        .update({
          name: moduleForm.name,
          name_ar: moduleForm.name_ar || null,
          slug: moduleForm.slug,
          description: moduleForm.description || null,
          is_published: moduleForm.is_published,
        })
        .eq('id', editingModule.id)
        .select()
        .single();

      if (error) throw error;

      setModules(prev => prev.map(m => m.id === editingModule.id ? data as Module : m));
      setShowModuleDialog(false);
      setEditingModule(null);
      resetModuleForm();
      toast.success('Module updated successfully');
    } catch (error) {
      console.error('Error updating module:', error);
      toast.error('Failed to update module');
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module? This will also delete all content within it.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;

      setModules(prev => prev.filter(m => m.id !== moduleId));
      toast.success('Module deleted successfully');
    } catch (error) {
      console.error('Error deleting module:', error);
      toast.error('Failed to delete module');
    }
  };

  const resetModuleForm = () => {
    setModuleForm({
      year_id: '',
      name: '',
      name_ar: '',
      slug: '',
      description: '',
      is_published: false,
    });
  };

  const openEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleForm({
      year_id: module.year_id,
      name: module.name,
      name_ar: module.name_ar || '',
      slug: module.slug,
      description: module.description || '',
      is_published: module.is_published || false,
    });
    setShowModuleDialog(true);
  };

  const handleSendPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });
      if (error) throw error;
      toast.success(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast.error('Failed to send password reset email');
    }
  };

  if (authLoading || isLoading) {

    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-heading font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">
              {isSuperAdmin ? 'Super Admin Access - Full System Control' : 
               isPlatformAdmin ? 'Platform Admin Access - All Modules' : 
               'Admin Access'}
            </p>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="curriculum" className="gap-2">
                <Layers className="w-4 h-4" />
                Curriculum
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="admins" className="gap-2">
                <Building2 className="w-4 h-4" />
                Module Admins
              </TabsTrigger>
            )}
            <TabsTrigger value="feedback" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Feedback
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  View and manage user roles.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No users found</p>
                ) : (
                  <div className="space-y-4">
                    {users.map((u) => (
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
                            {u.role === 'department_admin' && u.moduleAssignments && u.moduleAssignments.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {u.moduleAssignments.map(a => (
                                  <Badge key={a.id} variant="outline" className="text-xs">
                                    {getModuleName(a.module_id)}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={ROLE_COLORS[u.role]}>
                            {ROLE_LABELS[u.role]}
                          </Badge>
                          {u.id === user?.id ? (
                            <Badge variant="outline">You</Badge>
                          ) : (
                            <>
                              <Select
                                value={u.role}
                                onValueChange={(value: AppRole) => handleRoleChange(u.id, value)}
                              >
                                <SelectTrigger className="w-44">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAvailableRoles().map(role => (
                                    <SelectItem key={role} value={role}>
                                      {ROLE_LABELS[role]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {isSuperAdmin && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSendPasswordReset(u.email)}
                                  title="Send password reset email"
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Curriculum Tab - Super Admin Only */}
          {isSuperAdmin && (
            <TabsContent value="curriculum">
              <div className="grid gap-6">
                {/* Years Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Academic Years
                    </CardTitle>
                    <CardDescription>
                      Years are pre-configured. Manage modules within each year below.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                      {years.map((year) => (
                        <div key={year.id} className={`p-4 rounded-lg border-2 ${year.is_active ? 'border-primary' : 'border-muted'}`}>
                          <div className={`w-10 h-10 ${year.color || 'bg-primary'} rounded-lg flex items-center justify-center mb-2`}>
                            <span className="text-lg font-bold text-primary-foreground">{year.number}</span>
                          </div>
                          <p className="font-medium">{year.name}</p>
                          <p className="text-sm text-muted-foreground">{year.subtitle}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {modules.filter(m => m.year_id === year.id).length} modules
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Modules Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="w-5 h-5" />
                          Modules
                        </CardTitle>
                        <CardDescription>
                          Create and manage modules for each academic year.
                        </CardDescription>
                      </div>
                      <Dialog open={showModuleDialog} onOpenChange={(open) => {
                        setShowModuleDialog(open);
                        if (!open) {
                          setEditingModule(null);
                          resetModuleForm();
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Module
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{editingModule ? 'Edit Module' : 'Create New Module'}</DialogTitle>
                            <DialogDescription>
                              {editingModule ? 'Update module details.' : 'Add a new module to the curriculum.'}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            {!editingModule && (
                              <div className="space-y-2">
                                <Label>Year *</Label>
                                <Select
                                  value={moduleForm.year_id}
                                  onValueChange={(value) => setModuleForm(prev => ({ ...prev, year_id: value }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select year" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {years.map(year => (
                                      <SelectItem key={year.id} value={year.id}>
                                        {year.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div className="space-y-2">
                              <Label>Name *</Label>
                              <Input
                                value={moduleForm.name}
                                onChange={(e) => setModuleForm(prev => ({ 
                                  ...prev, 
                                  name: e.target.value,
                                  slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                                }))}
                                placeholder="e.g., Cardiovascular System"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Arabic Name</Label>
                              <Input
                                value={moduleForm.name_ar}
                                onChange={(e) => setModuleForm(prev => ({ ...prev, name_ar: e.target.value }))}
                                placeholder="الاسم بالعربية"
                                dir="rtl"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Slug *</Label>
                              <Input
                                value={moduleForm.slug}
                                onChange={(e) => setModuleForm(prev => ({ ...prev, slug: e.target.value }))}
                                placeholder="cardiovascular-system"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Input
                                value={moduleForm.description}
                                onChange={(e) => setModuleForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Module description"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={moduleForm.is_published}
                                onCheckedChange={(checked) => setModuleForm(prev => ({ ...prev, is_published: checked }))}
                              />
                              <Label>Published (visible to students)</Label>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowModuleDialog(false)}>Cancel</Button>
                            <Button onClick={editingModule ? handleUpdateModule : handleCreateModule}>
                              {editingModule ? 'Update' : 'Create'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {years.map((year) => {
                      const yearModules = modules.filter(m => m.year_id === year.id);
                      if (yearModules.length === 0) return null;
                      
                      return (
                        <div key={year.id} className="mb-6 last:mb-0">
                          <h3 className="font-medium text-sm text-muted-foreground mb-3">{year.name}</h3>
                          <div className="space-y-2">
                            {yearModules.map((module) => (
                              <div key={module.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 ${year.color || 'bg-primary'} rounded flex items-center justify-center`}>
                                    <BookOpen className="w-4 h-4 text-primary-foreground" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{module.name}</p>
                                    {module.description && (
                                      <p className="text-sm text-muted-foreground">{module.description}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={module.is_published ? 'default' : 'secondary'}>
                                    {module.is_published ? 'Published' : 'Draft'}
                                  </Badge>
                                  <Button variant="ghost" size="icon" onClick={() => openEditModule(module)}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteModule(module.id)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {modules.length === 0 && (
                      <p className="text-muted-foreground text-center py-8">
                        No modules created yet. Click "Add Module" to create one.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* Module Admins Tab */}
          {isSuperAdmin && (
            <TabsContent value="admins">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Module Admin Assignments
                  </CardTitle>
                  <CardDescription>
                    Assign module admins to specific modules. Each admin can only manage content within their assigned modules.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {users.filter(u => u.role === 'department_admin').length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No module admins assigned. Change a user's role to "Module Admin" first.
                      </p>
                    ) : (
                      users
                        .filter(u => u.role === 'department_admin')
                        .map(u => (
                          <div key={u.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{u.full_name || u.email}</p>
                                <p className="text-sm text-muted-foreground">{u.email}</p>
                              </div>
                              <Badge className={ROLE_COLORS.department_admin}>
                                Module Admin
                              </Badge>
                            </div>
                            
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Assigned Modules:</p>
                              {u.moduleAssignments && u.moduleAssignments.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {u.moduleAssignments.map(a => (
                                    <Badge key={a.id} variant="secondary" className="gap-1">
                                      {getModuleName(a.module_id)}
                                      <button
                                        onClick={() => handleRemoveModuleAssignment(u.id, a.module_id)}
                                        className="ml-1 hover:text-destructive"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No modules assigned</p>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <Select
                                value={selectedUser === u.id ? selectedModule : ''}
                                onValueChange={(value) => {
                                  setSelectedUser(u.id);
                                  setSelectedModule(value);
                                }}
                              >
                                <SelectTrigger className="w-60">
                                  <SelectValue placeholder="Select module to assign" />
                                </SelectTrigger>
                                <SelectContent>
                                  {modules
                                    .filter(m => !u.moduleAssignments?.some(a => a.module_id === m.id))
                                    .map(m => (
                                      <SelectItem key={m.id} value={m.id}>
                                        {getYearName(m.year_id)} - {m.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={() => {
                                  if (selectedUser === u.id && selectedModule) {
                                    handleAssignModule(u.id, selectedModule);
                                  }
                                }}
                                disabled={selectedUser !== u.id || !selectedModule}
                              >
                                Assign
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Feedback Tab */}
          <TabsContent value="feedback">
            <AdminUploadDiagnostics />
            <AdminFeedbackPanel />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
