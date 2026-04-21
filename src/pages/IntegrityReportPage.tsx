import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL } from '@/lib/supabaseUrl';

interface IntegrityResult {
  issue: string;
  count: number;
  sampleIds: string[];
}

export default function IntegrityReportPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<IntegrityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirect non-admins
  if (!authLoading && (!user || !isAdmin)) {
    navigate('/');
    return null;
  }

  const runIntegrityCheck = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/integrity-pilot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to run integrity check');
      }

      const data: IntegrityResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Data Integrity Pilot</h1>
            <p className="text-muted-foreground">Read-only safety check for orphaned MCQs</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Orphaned MCQ Check</CardTitle>
            <CardDescription>
              Detect MCQs that reference deleted chapters. This is a read-only check.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={runIntegrityCheck} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Check...
                </>
              ) : (
                'Run Integrity Pilot'
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert variant={result.count > 0 ? "destructive" : "default"}>
                {result.count > 0 ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <AlertTitle>
                  {result.count > 0 
                    ? `Found ${result.count} Orphaned MCQ${result.count !== 1 ? 's' : ''}`
                    : 'No Issues Found'
                  }
                </AlertTitle>
                <AlertDescription>
                  {result.count > 0 ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-sm">
                        These MCQs reference chapters that no longer exist:
                      </p>
                      <ul className="text-xs font-mono bg-muted p-2 rounded space-y-1 max-h-48 overflow-y-auto">
                        {result.sampleIds.map((id) => (
                          <li key={id} className="truncate">{id}</li>
                        ))}
                      </ul>
                      {result.count > 10 && (
                        <p className="text-xs text-muted-foreground">
                          Showing first 10 of {result.count} orphaned MCQs
                        </p>
                      )}
                    </div>
                  ) : (
                    <p>All MCQs with chapter references are valid.</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
