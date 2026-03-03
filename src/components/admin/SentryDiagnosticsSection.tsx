import { useState } from 'react';
import * as Sentry from '@sentry/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function SentryDiagnosticsSection() {
  const [frontendLoading, setFrontendLoading] = useState(false);
  const [edgeLoading, setEdgeLoading] = useState(false);

  const handleFrontendTest = async () => {
    setFrontendLoading(true);
    try {
      const err = new Error('SENTRY_FRONTEND_TEST');
      Sentry.captureException(err);
      await Sentry.flush(2000);
      toast.success('Frontend Sentry event sent');
    } catch {
      toast.error('Failed to send frontend Sentry event');
    } finally {
      setFrontendLoading(false);
    }
  };

  const handleEdgeTest = async () => {
    setEdgeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('run-ai-case', {
        body: { sentry_test: true },
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
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-muted-foreground" />
        <Label className="text-base font-medium">Monitoring / Sentry</Label>
        <Badge variant="secondary" className="text-xs">Super Admin</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Send a test event to verify Sentry is capturing errors correctly.
      </p>
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={handleFrontendTest} disabled={frontendLoading}>
          {frontendLoading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
          Test Frontend Sentry
        </Button>
        <Button size="sm" variant="outline" onClick={handleEdgeTest} disabled={edgeLoading}>
          {edgeLoading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
          Test Edge Sentry
        </Button>
      </div>
    </div>
  );
}
