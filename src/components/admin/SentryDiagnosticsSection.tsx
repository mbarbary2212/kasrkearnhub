import { useState } from 'react';
import * as Sentry from '@sentry/react';
import { BrowserClient, defaultStackParser, makeFetchTransport, Scope } from '@sentry/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Activity, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getBetterStackClient } from '@/lib/sentry';

export function SentryDiagnosticsSection() {
  const [frontendLoading, setFrontendLoading] = useState(false);
  const [edgeLoading, setEdgeLoading] = useState(false);
  const [betterStackLoading, setBetterStackLoading] = useState(false);

  const handleFrontendTest = async () => {
    setFrontendLoading(true);
    try {
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

  const handleBetterStackTest = async () => {
    setBetterStackLoading(true);
    try {
      const dsn = import.meta.env.VITE_BETTERSTACK_DSN;
      let client = getBetterStackClient();

      // If not initialized (e.g. in dev/preview), create a temporary client
      if (!client && dsn) {
        client = new BrowserClient({
          dsn,
          transport: makeFetchTransport,
          stackParser: defaultStackParser,
          integrations: [],
          environment: 'diagnostics-test',
        });
        client.init();
      }

      if (!client) {
        toast.error('Better Stack DSN not configured — cannot send test event');
        return;
      }

      const scope = new Scope();
      scope.setClient(client);
      const err = new Error('BETTERSTACK_FRONTEND_TEST — ' + new Date().toISOString());
      scope.captureException(err);
      await client.flush(3000);
      toast.success('Better Stack test event sent ✓');
    } catch {
      toast.error('Failed to send Better Stack event');
    } finally {
      setBetterStackLoading(false);
    }
  };

  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              <Activity className="w-5 h-5" />
              Monitoring / Error Tracking
              <Badge variant="secondary" className="text-xs ml-auto">Super Admin</Badge>
            </CardTitle>
            <CardDescription>
              Send test events to verify Sentry and Better Stack are capturing errors correctly.
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <div className="flex items-center gap-3 flex-wrap">
              <Button size="sm" variant="outline" onClick={handleFrontendTest} disabled={frontendLoading}>
                {frontendLoading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Test Sentry
              </Button>
              <Button size="sm" variant="outline" onClick={handleEdgeTest} disabled={edgeLoading}>
                {edgeLoading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Test Edge
              </Button>
              <Button size="sm" variant="outline" onClick={handleBetterStackTest} disabled={betterStackLoading}>
                {betterStackLoading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Test Better Stack
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
