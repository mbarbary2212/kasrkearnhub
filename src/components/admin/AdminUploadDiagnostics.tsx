import { useState } from 'react';
import { Bug, CheckCircle, XCircle, Upload, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DragDropZone } from '@/components/ui/drag-drop-zone';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TestResult {
  success: boolean;
  message: string;
  details?: string;
}

export function AdminUploadDiagnostics() {
  const { user, isAdmin, isSuperAdmin } = useAuthContext();
  const [isOpen, setIsOpen] = useState(false);
  
  // Feedback test state
  const [feedbackTestResult, setFeedbackTestResult] = useState<TestResult | null>(null);
  const [feedbackTestRunning, setFeedbackTestRunning] = useState(false);
  
  // Drag-drop test state
  const [dropTestResult, setDropTestResult] = useState<TestResult | null>(null);
  const [testFileName, setTestFileName] = useState<string>('');
  
  // Storage test state
  const [storageTestResult, setStorageTestResult] = useState<TestResult | null>(null);
  const [storageTestRunning, setStorageTestRunning] = useState(false);

  // Only show for admins
  if (!isAdmin && !isSuperAdmin) return null;

  const runFeedbackTest = async () => {
    setFeedbackTestRunning(true);
    setFeedbackTestResult(null);
    
    try {
      // Check daily count first
      const { data: countData, error: countError } = await supabase.rpc('get_user_feedback_count_today', {
        _user_id: user?.id || ''
      });
      
      if (countError) {
        setFeedbackTestResult({
          success: false,
          message: 'Daily count check failed',
          details: JSON.stringify(countError, null, 2)
        });
        return;
      }
      
      // Try to insert test feedback
      const { data, error } = await supabase.from('feedback').insert({
        created_by: user?.id,
        role: 'admin',
        category: 'other',
        severity: 'normal',
        message: '[DIAGNOSTIC TEST] This is an automated test submission - safe to ignore.',
      }).select();
      
      if (error) {
        setFeedbackTestResult({
          success: false,
          message: 'Insert failed',
          details: `Error: ${error.message}\nCode: ${error.code}\nDaily count: ${countData}\n\nThis means RLS is blocking the insert. Check your authentication and feedback table policies.`
        });
      } else {
        setFeedbackTestResult({
          success: true,
          message: 'Feedback insert successful',
          details: `ID: ${data?.[0]?.id}\nDaily count before insert: ${countData}\n\nFeedback submission is working correctly. Note: Test entry will remain in DB (delete not allowed by RLS).`
        });
      }
    } catch (e) {
      setFeedbackTestResult({
        success: false,
        message: 'Exception occurred',
        details: (e as Error).message
      });
    } finally {
      setFeedbackTestRunning(false);
    }
  };

  const handleDropTest = (file: File) => {
    setTestFileName(file.name);
    setDropTestResult({
      success: true,
      message: 'File drop successful',
      details: `File: ${file.name}\nType: ${file.type}\nSize: ${(file.size / 1024).toFixed(2)} KB`
    });
    toast.success('Drop test passed!');
  };

  const runStorageTest = async () => {
    setStorageTestRunning(true);
    setStorageTestResult(null);
    
    try {
      // List buckets
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        setStorageTestResult({
          success: false,
          message: 'Failed to list storage buckets',
          details: JSON.stringify(bucketsError, null, 2)
        });
        return;
      }
      
      const bucketNames = buckets?.map(b => b.name).join(', ') || 'No buckets found';
      
      // Try to access study-resources bucket
      const { data: files, error: filesError } = await supabase.storage
        .from('study-resources')
        .list('', { limit: 1 });
      
      if (filesError) {
        setStorageTestResult({
          success: false,
          message: 'Cannot access study-resources bucket',
          details: `Buckets available: ${bucketNames}\nError: ${filesError.message}`
        });
      } else {
        setStorageTestResult({
          success: true,
          message: 'Storage access OK',
          details: `Buckets: ${bucketNames}\nFiles in study-resources: ${files?.length || 0} found`
        });
      }
    } catch (e) {
      setStorageTestResult({
        success: false,
        message: 'Exception occurred',
        details: (e as Error).message
      });
    } finally {
      setStorageTestRunning(false);
    }
  };

  const ResultBadge = ({ result }: { result: TestResult | null }) => {
    if (!result) return <Badge variant="outline">Not tested</Badge>;
    return result.success ? (
      <Badge className="bg-green-500">
        <CheckCircle className="w-3 h-3 mr-1" /> Pass
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" /> Fail
      </Badge>
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full mb-4">
          <Bug className="w-4 h-4 mr-2" />
          {isOpen ? 'Hide' : 'Show'} Upload Diagnostics (Admin)
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="border-dashed border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bug className="w-4 h-4" />
              Upload & Feedback Diagnostics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Test A: Feedback Submission */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Test A: Feedback Submission
                </span>
                <ResultBadge result={feedbackTestResult} />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={runFeedbackTest}
                disabled={feedbackTestRunning}
              >
                {feedbackTestRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Run Test'
                )}
              </Button>
              {feedbackTestResult && (
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  {feedbackTestResult.details}
                </pre>
              )}
            </div>

            {/* Test B: Drag & Drop */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Test B: Drag & Drop CSV
                </span>
                <ResultBadge result={dropTestResult} />
              </div>
              <DragDropZone
                id="diagnostic-drop-test"
                onFileSelect={handleDropTest}
                accept=".csv"
                fileName={testFileName}
                acceptedTypes={['.csv']}
                maxSizeMB={5}
              />
              {dropTestResult && (
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  {dropTestResult.details}
                </pre>
              )}
            </div>

            {/* Test C: Storage Access */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Test C: Supabase Storage Access
                </span>
                <ResultBadge result={storageTestResult} />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={runStorageTest}
                disabled={storageTestRunning}
              >
                {storageTestRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Run Test'
                )}
              </Button>
              {storageTestResult && (
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  {storageTestResult.details}
                </pre>
              )}
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
