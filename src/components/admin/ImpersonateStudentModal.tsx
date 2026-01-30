import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Loader2, Eye, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImpersonateStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StudentProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

/**
 * Modal for selecting which student to impersonate.
 * - Search by name/email
 * - Shows only users with 'student' role
 * - Confirmation before starting impersonation
 */
export function ImpersonateStudentModal({ open, onOpenChange }: ImpersonateStudentModalProps) {
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { startImpersonation, isLoading: isStarting } = useEffectiveUser();

  // Fetch students
  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students-for-impersonation'],
    queryFn: async () => {
      // Get all users with student role
      const { data: studentRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      if (rolesError) throw rolesError;
      if (!studentRoles?.length) return [];

      const studentIds = studentRoles.map(r => r.user_id);

      // Get profiles for these students
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', studentIds)
        .order('full_name');

      if (profilesError) throw profilesError;
      return (profiles || []) as StudentProfile[];
    },
    enabled: open,
  });

  // Filter students by search
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    if (!search.trim()) return students;

    const searchLower = search.toLowerCase();
    return students.filter(s => 
      s.email.toLowerCase().includes(searchLower) ||
      s.full_name?.toLowerCase().includes(searchLower)
    );
  }, [students, search]);

  const handleSelectStudent = (student: StudentProfile) => {
    setSelectedStudent(student);
    setConfirmOpen(true);
  };

  const handleConfirmImpersonation = async () => {
    if (!selectedStudent) return;

    await startImpersonation(selectedStudent.id);
    setConfirmOpen(false);
    setSelectedStudent(null);
    onOpenChange(false);
  };

  const handleClose = () => {
    setSearch('');
    setSelectedStudent(null);
    setConfirmOpen(false);
    onOpenChange(false);
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  return (
    <>
      <Dialog open={open && !confirmOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Impersonate Student
            </DialogTitle>
            <DialogDescription>
              Select a student to view the platform as they see it. All actions are logged.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[300px] pr-4">
              {isLoadingStudents ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  {search ? 'No students found matching your search' : 'No students found'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredStudents.map(student => (
                    <button
                      key={student.id}
                      onClick={() => handleSelectStudent(student)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={student.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(student.full_name, student.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {student.full_name || 'Unnamed Student'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {student.email}
                        </p>
                      </div>
                      <Eye className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Impersonation</DialogTitle>
          </DialogHeader>

          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              You are about to view the platform as{' '}
              <strong>{selectedStudent?.full_name || selectedStudent?.email}</strong>.
              This session will last 30 minutes and all actions will be logged.
            </AlertDescription>
          </Alert>

          <p className="text-sm text-muted-foreground">
            During impersonation:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>You will see the student's dashboard and progress</li>
            <li>Progress tracking is disabled (view-only mode)</li>
            <li>A banner will always show your impersonation status</li>
          </ul>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmImpersonation}
              disabled={isStarting}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isStarting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                'Start Impersonation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
