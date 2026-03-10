import { useState } from 'react';
import * as Sentry from '@sentry/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function SentryDiagnosticsSection() {
  const [frontendLoading, setFrontendLoading] = useState(false);
  const [edgeLoading, setEdgeLoading] = useState(false);

  const handleFrontendTest = async () => {
    setFrontendLoading(true);
    try {
      // Ensure Sentry is initialized even in dev/preview
      const dsn = import.meta.env.VITE_SENTRY_DSN;
      if (dsn && !Sentry.getClient()) {
        Sentry.init({
          dsn,
          environment: 'diagnostics-test',
          tracesSampleRate: 1.0,
        });
      }

      if (!Sentry.getClient()) {
        toast.error('Sentry DSN not configured — cannot send test event');
        return;
      }

      const err = new Error('SENTRY_FRONTEND_TEST — ' + new Date().toISOString());
      Sentry.captureException(err);
      await Sentry.flush(3000);
      toast.success('Frontend Sentry test event sent ✓');
    } catch {
      toast.error('Failed to send frontend Sentry event');
    } finally {
      setFrontendLoading(false);
    }
  };

  const handleEdgeTest = async () => {
    setEdgeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sentry-ping', {
        body: { ping: true },
      });
      if (error) throw error;
      if (data?.ok) {
        toast.success('Edge Sentry event sent');
      } else {
        toast.error(data?.error || 'Unknown error from edge function');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to call edge function');
    } finally {
      setEdgeLoading(false);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="w-5 h-5" />
          Monitoring / Sentry
          <Badge variant="secondary" className="text-xs ml-auto">Super Admin</Badge>
        </CardTitle>
        <CardDescription>
          Send a test event to verify Sentry is capturing errors correctly.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={handleFrontendTest} disabled={frontendLoading}>
            {frontendLoading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Test Frontend
          </Button>
          <Button size="sm" variant="outline" onClick={handleEdgeTest} disabled={edgeLoading}>
            {edgeLoading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Test Edge
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
