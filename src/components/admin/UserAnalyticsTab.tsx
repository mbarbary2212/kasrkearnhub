import { useState, useMemo } from 'react';
import { useUserAnalytics } from '@/hooks/useUserAnalytics';
import { useAuth } from '@/hooks/useAuth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Shield, Clock, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

type SortField = 'name' | 'last_seen' | 'sessions' | 'time_7d' | 'time_30d';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'banned' | 'removed';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

export function UserAnalyticsTab() {
  const { data: users, isLoading } = useUserAnalytics();
  const { hasRole } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('last_seen');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const canManageUsers = hasRole('platform_admin') || hasRole('super_admin');

  const filteredAndSortedUsers = useMemo(() => {
    if (!users) return [];

    let filtered = users.filter(user => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        user.email.toLowerCase().includes(searchLower) ||
        (user.full_name?.toLowerCase().includes(searchLower) ?? false);

      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = (a.full_name || a.email).localeCompare(b.full_name || b.email);
          break;
        case 'last_seen':
          const aDate = a.last_seen ? new Date(a.last_seen).getTime() : 0;
          const bDate = b.last_seen ? new Date(b.last_seen).getTime() : 0;
          comparison = aDate - bDate;
          break;
        case 'sessions':
          comparison = a.sessions_30d - b.sessions_30d;
          break;
        case 'time_7d':
          comparison = a.total_time_7d - b.total_time_7d;
          break;
        case 'time_30d':
          comparison = a.total_time_30d - b.total_time_30d;
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [users, searchQuery, statusFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getStatusBadge = (status: string, bannedUntil: string | null) => {
    switch (status) {
      case 'banned':
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
            Suspended
          </Badge>
        );
      case 'removed':
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            Deactivated
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            Active
          </Badge>
        );
    }
  };

  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Shield className="h-5 w-5 mr-2" />
        You do not have permission to view user analytics.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="banned">Suspended</SelectItem>
            <SelectItem value="removed">Deactivated</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_seen">Last Seen</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="sessions">Sessions (30d)</SelectItem>
            <SelectItem value="time_7d">Time (7d)</SelectItem>
            <SelectItem value="time_30d">Time (30d)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Summary */}
      {users && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-sm text-muted-foreground">Total Users</div>
            <div className="text-2xl font-semibold">{users.length}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-sm text-muted-foreground">Active</div>
            <div className="text-2xl font-semibold text-green-600">
              {users.filter(u => u.status === 'active').length}
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-sm text-muted-foreground">Suspended</div>
            <div className="text-2xl font-semibold text-orange-600">
              {users.filter(u => u.status === 'banned').length}
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-sm text-muted-foreground">Deactivated</div>
            <div className="text-2xl font-semibold text-muted-foreground">
              {users.filter(u => u.status === 'removed').length}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('last_seen')}
              >
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Last Seen
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('sessions')}
              >
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Sessions (30d)
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('time_7d')}
              >
                Time (7d)
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('time_30d')}
              >
                Time (30d)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                </TableRow>
              ))
            ) : filteredAndSortedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.full_name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">
                          {user.full_name || 'No name'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">
                      {user.role?.replace('_', ' ') || 'student'}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(user.status, user.banned_until)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.last_seen 
                      ? formatDistanceToNow(new Date(user.last_seen), { addSuffix: true })
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell className="text-sm">{user.sessions_30d}</TableCell>
                  <TableCell className="text-sm">{formatDuration(user.total_time_7d)}</TableCell>
                  <TableCell className="text-sm">{formatDuration(user.total_time_30d)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
