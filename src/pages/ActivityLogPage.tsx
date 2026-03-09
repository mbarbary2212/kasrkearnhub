import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Download, RefreshCw, Activity, Users, BookOpen } from 'lucide-react';
import { AppRole } from '@/types/database';
import { useModules } from '@/hooks/useModules';

interface ActivityLog {
  id: string;
  created_at: string;
  actor_user_id: string;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  scope: {
    module_id?: string | null;
    chapter_id?: string | null;
    topic_id?: string | null;
  } | null;
  metadata: Record<string, unknown> | null;
}

const ACTION_LABELS: Record<string, string> = {
  created_mcq: 'Created MCQ',
  updated_mcq: 'Updated MCQ',
  deleted_mcq: 'Deleted MCQ',
  bulk_upload_mcq: 'Bulk Upload MCQs',
  created_essay: 'Created Essay',
  updated_essay: 'Updated Essay',
  deleted_essay: 'Deleted Essay',
  bulk_upload_essay: 'Bulk Upload Essays',
  created_osce: 'Created OSCE',
  updated_osce: 'Updated OSCE',
  deleted_osce: 'Deleted OSCE',
  bulk_upload_osce: 'Bulk Upload OSCE',
  created_flashcard: 'Created Flashcard',
  updated_flashcard: 'Updated Flashcard',
  deleted_flashcard: 'Deleted Flashcard',
  bulk_upload_flashcard: 'Bulk Upload Flashcards',
};

const ENTITY_COLORS: Record<string, string> = {
  mcq: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  essay: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  osce: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  flashcard: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

interface AdminUser {
  user_id: string;
  role: AppRole;
  full_name: string | null;
  email: string | null;
}

export default function ActivityLogPage() {
  const auth = useAuthContext();
  const [selectedAdminId, setSelectedAdminId] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7');

  // Fetch all modules for filter dropdown
  const { data: modules } = useModules();

  // Only admins can access
  const canAccess = auth.isAdmin || auth.isModuleAdmin || auth.isTopicAdmin || 
                    auth.isDepartmentAdmin || auth.isPlatformAdmin || auth.isSuperAdmin;

  // Fetch all admin users for dropdown - two-step query since no FK relationship
  const { data: adminUsers } = useQuery({
    queryKey: ['admin-users-for-filter'],
    queryFn: async () => {
      // Step 1: Get all admin roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['super_admin', 'platform_admin', 'department_admin', 'topic_admin', 'admin', 'teacher']);
      
      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];
      
      // Step 2: Get profiles for those user IDs
      const userIds = roles.map(r => r.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Step 3: Combine the data
      const profilesMap = Object.fromEntries(
        (profilesData || []).map(p => [p.id, p])
      );
      
      return roles.map(role => ({
        user_id: role.user_id,
        role: role.role as AppRole,
        full_name: profilesMap[role.user_id]?.full_name || null,
        email: profilesMap[role.user_id]?.email || null,
      })) as AdminUser[];
    },
    enabled: canAccess,
  });

  // Fetch activity logs
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['activity-logs', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      // Apply date range filter
      if (dateRange !== 'all') {
        const days = parseInt(dateRange);
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);
        query = query.gte('created_at', fromDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ActivityLog[];
    },
    enabled: canAccess,
  });

  // Fetch user profiles for display
  const actorIds = useMemo(() => {
    if (!logs) return [];
    return [...new Set(logs.map(l => l.actor_user_id))];
  }, [logs]);

  const { data: profiles } = useQuery({
    queryKey: ['profiles-for-logs', actorIds],
    queryFn: async () => {
      if (actorIds.length === 0) return {};
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', actorIds);
      if (error) throw error;
      return Object.fromEntries((data || []).map(p => [p.id, p]));
    },
    enabled: actorIds.length > 0,
  });

  // Get unique actions and entity types for filters
  const { actions, entityTypes } = useMemo(() => {
    if (!logs) return { actions: [], entityTypes: [] };
    return {
      actions: [...new Set(logs.map(l => l.action))],
      entityTypes: [...new Set(logs.map(l => l.entity_type))],
    };
  }, [logs]);

  // Apply filters
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter(log => {
      // Admin filter
      if (selectedAdminId !== 'all' && log.actor_user_id !== selectedAdminId) {
        return false;
      }

      // Action filter
      if (actionFilter !== 'all' && log.action !== actionFilter) {
        return false;
      }

      // Entity type filter
      if (entityFilter !== 'all' && log.entity_type !== entityFilter) {
        return false;
      }

      // Module filter
      if (moduleFilter !== 'all' && log.scope?.module_id !== moduleFilter) {
        return false;
      }

      return true;
    });
  }, [logs, selectedAdminId, actionFilter, entityFilter, moduleFilter]);

  // Export to CSV
  const handleExportCsv = () => {
    if (!filteredLogs.length) return;

    const headers = ['Timestamp', 'Actor', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Module', 'Chapter ID', 'Metadata'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      profiles?.[log.actor_user_id]?.full_name || profiles?.[log.actor_user_id]?.email || log.actor_user_id,
      log.actor_role || '',
      log.action,
      log.entity_type,
      log.entity_id || '',
      log.scope?.module_id 
        ? modules?.find(m => m.id === log.scope?.module_id)?.name || log.scope.module_id 
        : '',
      log.scope?.chapter_id || '',
      log.metadata ? JSON.stringify(log.metadata) : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (auth.isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Activity Log</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={!filteredLogs.length}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Filter by Admin" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Admins</SelectItem>
                  {adminUsers?.map(admin => (
                    <SelectItem key={admin.user_id} value={admin.user_id}>
                      <div className="flex items-center gap-2">
                        <span>{admin.full_name || admin.email?.split('@')[0] || 'Unknown'}</span>
                        <Badge variant="outline" className="text-xs">
                          {admin.role.replace('_', ' ')}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actions.map(action => (
                    <SelectItem key={action} value={action}>
                      {ACTION_LABELS[action] || action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Entity Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entity Types</SelectItem>
                  {entityTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="All Modules" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  <YearGroupedModuleOptions modules={modules} showSlug={false} />
                </SelectContent>
              </Select>

              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No activity logs found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">Timestamp</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {profiles?.[log.actor_user_id]?.full_name || 
                               profiles?.[log.actor_user_id]?.email?.split('@')[0] || 
                               'Unknown'}
                            </span>
                            {log.actor_role && (
                              <span className="text-xs text-muted-foreground">
                                {log.actor_role.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </TableCell>
                        <TableCell>
                          {log.scope?.module_id ? (
                            <span className="text-sm truncate max-w-[120px] block" title={modules?.find(m => m.id === log.scope?.module_id)?.name}>
                              {modules?.find(m => m.id === log.scope?.module_id)?.name || '-'}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary" 
                              className={ENTITY_COLORS[log.entity_type] || ''}
                            >
                              {log.entity_type}
                            </Badge>
                            {log.entity_id && (
                              <span className="text-xs text-muted-foreground font-mono">
                                {log.entity_id.slice(0, 8)}...
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {Object.entries(log.metadata)
                                .slice(0, 2)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(', ')}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredLogs.length} of {logs?.length || 0} entries (max 200)
        </p>
      </div>
    </MainLayout>
  );
}
