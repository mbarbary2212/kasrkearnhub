import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  Upload, 
  Download, 
  FileSpreadsheet, 
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle 
} from 'lucide-react';
import { readExcelToJson, writeJsonToExcel } from '@/lib/excel';
import { useInviteBulkUsers, InviteResult, UserToInvite } from '@/hooks/useUserProvisioning';

interface BulkUserUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedUser extends UserToInvite {
  row: number;
  valid: boolean;
  error?: string;
}

export function BulkUserUploadModal({ open, onOpenChange }: BulkUserUploadModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload');
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [results, setResults] = useState<InviteResult[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const inviteBulkUsers = useInviteBulkUsers();

  const resetModal = () => {
    setStep('upload');
    setParsedUsers([]);
    setResults([]);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetModal();
    }
    onOpenChange(open);
  };

  const downloadTemplate = async () => {
    const template = [
      { full_name: 'Ahmed Hassan', email: 'ahmed@example.com', role: 'student' },
      { full_name: 'Dr. Sarah Ahmed', email: 'sarah@example.com', role: 'teacher' },
    ];
    await writeJsonToExcel(template, 'user_invite_template.xlsx', 'Users');
  };

  const downloadResults = async () => {
    const data = results.map(r => ({
      email: r.email,
      status: r.status,
      message: r.message,
      invited_at: r.invited_at || '',
    }));
    await writeJsonToExcel(data, `invite_results_${new Date().toISOString().split('T')[0]}.xlsx`, 'Results');
  };

  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

        const users: ParsedUser[] = jsonData.map((row, index) => {
          const email = (row.email || row.Email || '').toString().trim().toLowerCase();
          const fullName = (row.full_name || row.fullName || row.name || row.Name || row['Full Name'] || '').toString().trim();
          const role = (row.role || row.Role || 'student').toString().trim().toLowerCase();
          const requestType = (row.request_type || row.requestType || row.type || 'student').toString().trim().toLowerCase();

          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          let valid = true;
          let error = '';

          if (!email) {
            valid = false;
            error = 'Missing email';
          } else if (!emailRegex.test(email)) {
            valid = false;
            error = 'Invalid email format';
          } else if (!fullName) {
            valid = false;
            error = 'Missing name';
          }

          return {
            row: index + 2, // Excel rows start at 1, plus header
            email,
            full_name: fullName,
            role: ['student', 'teacher', 'admin'].includes(role) ? role : 'student',
            request_type: requestType,
            valid,
            error,
          };
        });

        setParsedUsers(users);
        setStep('preview');
      } catch (error) {
        console.error('Error parsing file:', error);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      parseFile(file);
    }
  }, [parseFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFile(file);
    }
  };

  const handleInvite = async () => {
    const validUsers = parsedUsers.filter(u => u.valid);
    const userPayload: UserToInvite[] = validUsers.map(u => ({
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      request_type: u.request_type,
    }));

    const results = await inviteBulkUsers.mutateAsync(userPayload);
    setResults(results);
    setStep('results');
  };

  const validCount = parsedUsers.filter(u => u.valid).length;
  const invalidCount = parsedUsers.filter(u => !u.valid).length;
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Bulk Invite Users'}
            {step === 'preview' && 'Preview Users to Invite'}
            {step === 'results' && 'Invite Results'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a CSV or Excel file with user information to send bulk invitations.'}
            {step === 'preview' && 'Review the users before sending invitations.'}
            {step === 'results' && 'View the results of the bulk invitation process.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {step === 'upload' && (
            <div className="space-y-6 py-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-muted'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  Drag and drop your file here
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Supports .xlsx, .xls, and .csv files
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" asChild>
                    <span>Choose File</span>
                  </Button>
                </label>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  File Format
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Your file should have the following columns:
                </p>
                <ul className="text-sm space-y-1 mb-4">
                  <li><code className="bg-muted px-1 rounded">full_name</code> - Required</li>
                  <li><code className="bg-muted px-1 rounded">email</code> - Required</li>
                  <li><code className="bg-muted px-1 rounded">role</code> - Optional (student, teacher, admin)</li>
                </ul>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  {validCount} valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    {invalidCount} invalid
                  </Badge>
                )}
              </div>

              <div className="border rounded-lg max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Row</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedUsers.map((user) => (
                      <TableRow key={user.row} className={!user.valid ? 'bg-destructive/5' : ''}>
                        <TableCell className="text-muted-foreground">{user.row}</TableCell>
                        <TableCell>{user.full_name || '—'}</TableCell>
                        <TableCell>{user.email || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {user.valid ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <span className="text-sm text-destructive flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {user.error}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {step === 'results' && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Badge className="gap-1 bg-green-500">
                  <CheckCircle className="h-3 w-3" />
                  {successCount} sent
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    {errorCount} failed
                  </Badge>
                )}
              </div>

              <div className="border rounded-lg max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Invited At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, idx) => (
                      <TableRow key={idx} className={result.status === 'error' ? 'bg-destructive/5' : ''}>
                        <TableCell>{result.email}</TableCell>
                        <TableCell>
                          {result.status === 'success' ? (
                            <Badge className="gap-1 bg-green-500">
                              <CheckCircle className="h-3 w-3" />
                              Sent
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{result.message}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {result.invited_at ? new Date(result.invited_at).toLocaleString() : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          {step === 'upload' && (
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button 
                onClick={handleInvite} 
                disabled={validCount === 0 || inviteBulkUsers.isPending}
              >
                {inviteBulkUsers.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending Invites...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Send {validCount} Invite{validCount !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'results' && (
            <>
              <Button variant="outline" onClick={downloadResults}>
                <Download className="h-4 w-4 mr-2" />
                Download Results
              </Button>
              <Button onClick={() => handleClose(false)}>
                Done
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
