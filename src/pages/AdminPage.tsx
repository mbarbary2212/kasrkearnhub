import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Shield, Users, Building2, MessageSquare, ChevronRight, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Profile, AppRole, Department, DepartmentAdmin } from '@/types/database';

interface UserWithRole extends Profile {
  role: AppRole;
  departmentAssignments?: DepartmentAdmin[];
}

const ROLE_LABELS: Record<AppRole, string> = {
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Admin (Legacy)',
  department_admin: 'Department Admin',
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');

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

        // Fetch department assignments
        const { data: assignments } = await supabase
          .from('department_admins')
          .select('*');

        // Fetch departments
        const { data: depts } = await supabase
          .from('departments')
          .select('*')
          .order('display_order');

        setDepartments((depts as Department[]) || []);

        // Combine profiles with roles and assignments
        const usersWithRoles = (profiles || []).map((profile) => {
          const userRole = roles?.find(r => r.user_id === profile.id);
          const userAssignments = assignments?.filter(a => a.user_id === profile.id) || [];
          return {
            ...profile,
            role: (userRole?.role as AppRole) || 'student',
            departmentAssignments: userAssignments as DepartmentAdmin[],
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
    // Only super admin can assign platform_admin or super_admin roles
    if ((newRole === 'super_admin' || newRole === 'platform_admin') && !isSuperAdmin) {
      toast.error('Only Super Admins can assign this role');
      return;
    }

    try {
      // Delete existing role
      await supabase.from('user_roles').delete().eq('user_id', userId);

      // Insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (error) throw error;

      // If changing away from department_admin, remove assignments
      if (newRole !== 'department_admin') {
        await supabase.from('department_admins').delete().eq('user_id', userId);
      }

      // Update local state
      setUsers(prev =>
        prev.map(u => 
          u.id === userId 
            ? { ...u, role: newRole, departmentAssignments: newRole === 'department_admin' ? u.departmentAssignments : [] } 
            : u
        )
      );

      toast.success('Role updated successfully');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleAssignDepartment = async (userId: string, departmentId: string) => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admins can assign departments');
      return;
    }

    try {
      const { error } = await supabase
        .from('department_admins')
        .insert({ 
          user_id: userId, 
          department_id: departmentId,
          assigned_by: user?.id 
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('User is already assigned to this department');
          return;
        }
        throw error;
      }

      // Update local state
      setUsers(prev =>
        prev.map(u => {
          if (u.id === userId) {
            const newAssignment: DepartmentAdmin = {
              id: crypto.randomUUID(),
              user_id: userId,
              department_id: departmentId,
              assigned_by: user?.id || null,
              created_at: new Date().toISOString(),
            };
            return {
              ...u,
              departmentAssignments: [...(u.departmentAssignments || []), newAssignment],
            };
          }
          return u;
        })
      );

      setSelectedDepartment('');
      toast.success('Department assigned successfully');
    } catch (error) {
      console.error('Error assigning department:', error);
      toast.error('Failed to assign department');
    }
  };

  const handleRemoveDepartmentAssignment = async (userId: string, departmentId: string) => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admins can remove department assignments');
      return;
    }

    try {
      const { error } = await supabase
        .from('department_admins')
        .delete()
        .eq('user_id', userId)
        .eq('department_id', departmentId);

      if (error) throw error;

      // Update local state
      setUsers(prev =>
        prev.map(u => {
          if (u.id === userId) {
            return {
              ...u,
              departmentAssignments: u.departmentAssignments?.filter(a => a.department_id !== departmentId) || [],
            };
          }
          return u;
        })
      );

      toast.success('Department assignment removed');
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast.error('Failed to remove assignment');
    }
  };

  const getDepartmentName = (id: string) => {
    return departments.find(d => d.id === id)?.name || 'Unknown';
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
               isPlatformAdmin ? 'Platform Admin Access - All Departments' : 
               'Admin Access'}
            </p>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="hierarchy" className="gap-2">
                <Building2 className="w-4 h-4" />
                Department Admins
              </TabsTrigger>
            )}
            <TabsTrigger value="feedback" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Feedback
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  View and manage user roles. {isSuperAdmin ? 'You can assign any role.' : 'Role changes are restricted based on your access level.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No users found</p>
                ) : (
                  <div className="space-y-4">
                    {users.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                            <span className="font-semibold text-secondary-foreground">
                              {u.full_name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{u.full_name || 'No name'}</p>
                            <p className="text-sm text-muted-foreground">{u.email}</p>
                            {u.role === 'department_admin' && u.departmentAssignments && u.departmentAssignments.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {u.departmentAssignments.map(a => (
                                  <Badge key={a.id} variant="outline" className="text-xs">
                                    {getDepartmentName(a.department_id)}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={ROLE_COLORS[u.role]}>
                            {ROLE_LABELS[u.role]}
                          </Badge>
                          {u.id === user?.id ? (
                            <Badge variant="outline">You</Badge>
                          ) : (
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
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="hierarchy">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Department Admin Assignments
                  </CardTitle>
                  <CardDescription>
                    Assign department admins to specific departments. Each department admin can only manage content within their assigned departments.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {users.filter(u => u.role === 'department_admin').length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No department admins assigned. Change a user's role to "Department Admin" first.
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
                                Department Admin
                              </Badge>
                            </div>
                            
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Assigned Departments:</p>
                              {u.departmentAssignments && u.departmentAssignments.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {u.departmentAssignments.map(a => (
                                    <Badge key={a.id} variant="secondary" className="gap-1">
                                      {getDepartmentName(a.department_id)}
                                      <button
                                        onClick={() => handleRemoveDepartmentAssignment(u.id, a.department_id)}
                                        className="ml-1 hover:text-destructive"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No departments assigned</p>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <Select
                                value={selectedUser === u.id ? selectedDepartment : ''}
                                onValueChange={(value) => {
                                  setSelectedUser(u.id);
                                  setSelectedDepartment(value);
                                }}
                              >
                                <SelectTrigger className="w-60">
                                  <SelectValue placeholder="Select department to assign" />
                                </SelectTrigger>
                                <SelectContent>
                                  {departments
                                    .filter(d => !u.departmentAssignments?.some(a => a.department_id === d.id))
                                    .map(d => (
                                      <SelectItem key={d.id} value={d.id}>
                                        {d.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={() => {
                                  if (selectedUser === u.id && selectedDepartment) {
                                    handleAssignDepartment(u.id, selectedDepartment);
                                  }
                                }}
                                disabled={selectedUser !== u.id || !selectedDepartment}
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

          <TabsContent value="feedback">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Student Feedback Analytics
                </CardTitle>
                <CardDescription>
                  View aggregated anonymous feedback from students. Individual responses are never visible to protect student privacy.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No Feedback Data Yet</p>
                  <p className="text-sm mt-2">
                    Feedback will appear here once students submit responses and the minimum threshold (5 responses) is met.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate('/feedback')}
                  >
                    View Feedback Portal
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}