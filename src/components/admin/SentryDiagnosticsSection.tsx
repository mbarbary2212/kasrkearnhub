import { useState } from 'react';
import * as Sentry from '@sentry/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Activity, ChevronRight, Bot, Database, Stethoscope } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { captureWithContext, addAppBreadcrumb } from '@/lib/sentry';

export function SentryDiagnosticsSection() {
  const [frontendLoading, setFrontendLoading] = useState(false);
  const [edgeLoading, setEdgeLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [dbLoading, setDbLoading] = useState(false);
  const [caseLoading, setCaseLoading] = useState(false);

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

  const ensureSentryInitialized = () => {
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (dsn && !Sentry.getClient()) {
      Sentry.init({
        dsn,
        environment: 'diagnostics-test',
        tracesSampleRate: 1.0,
      });
    }
    return !!Sentry.getClient();
  };

  const handleAiCallTest = async () => {
    setAiLoading(true);
    try {
      if (!ensureSentryInitialized()) {
        toast.error('Sentry DSN not configured — cannot send test event');
        return;
      }
      addAppBreadcrumb('ai_call', 'TEST gemini case_generation starting', {
        case_id: 'test-case-123',
      });
      const err = new Error('SENTRY_AI_CALL_TEST — ' + new Date().toISOString());
      captureWithContext(err, {
        tags: {
          feature: 'ai_call',
          provider: 'gemini',
          ai_task: 'case_generation',
          test: true,
        },
        extra: {
          model: 'gemini-2.5-flash',
          case_id: 'test-case-123',
          prompt_length: 1234,
          error_message: err.message,
        },
      });
      await Sentry.flush(3000);
      toast.success('AI call test event sent ✓ (feature:ai_call)');
    } catch {
      toast.error('Failed to send AI call test event');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDbWriteTest = async () => {
    setDbLoading(true);
    try {
      if (!ensureSentryInitialized()) {
        toast.error('Sentry DSN not configured — cannot send test event');
        return;
      }
      const err = new Error('SENTRY_DB_WRITE_TEST — ' + new Date().toISOString());
      captureWithContext(err, {
        tags: {
          feature: 'db_write',
          table: 'fsrs_reviews',
          operation: 'upsert',
          test: true,
        },
        extra: {
          primary_id: 'test-flashcard-456',
          error_code: 'TEST_42501',
          error_message: err.message,
          supabase_hint: 'This is a synthetic diagnostics event',
        },
      });
      await Sentry.flush(3000);
      toast.success('DB write test event sent ✓ (feature:db_write)');
    } catch {
      toast.error('Failed to send DB write test event');
    } finally {
      setDbLoading(false);
    }
  };

  const handleInteractiveCaseTest = async () => {
    setCaseLoading(true);
    try {
      if (!ensureSentryInitialized()) {
        toast.error('Sentry DSN not configured — cannot send test event');
        return;
      }
      addAppBreadcrumb('interactive_case', 'TEST stage transition: history → exam', {
        case_id: 'test-case-789',
        stage: 'exam',
      });
      const err = new Error('SENTRY_INTERACTIVE_CASE_TEST — ' + new Date().toISOString());
      captureWithContext(err, {
        tags: {
          feature: 'interactive_case',
          subfeature: 'tts',
          provider: 'elevenlabs',
          test: true,
        },
        extra: {
          case_id: 'test-case-789',
          stage: 'exam',
          retry_count: 1,
          error_message: err.message,
        },
      });
      await Sentry.flush(3000);
      toast.success('Interactive case test event sent ✓ (feature:interactive_case)');
    } catch {
      toast.error('Failed to send interactive case test event');
    } finally {
      setCaseLoading(false);
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
              Send test events to verify Sentry is capturing errors correctly.
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
              <Button size="sm" variant="outline" onClick={handleAiCallTest} disabled={aiLoading}>
                {aiLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Bot className="w-4 h-4 mr-1" />
                )}
                Test AI Call
              </Button>
              <Button size="sm" variant="outline" onClick={handleDbWriteTest} disabled={dbLoading}>
                {dbLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Database className="w-4 h-4 mr-1" />
                )}
                Test DB Write
              </Button>
              <Button size="sm" variant="outline" onClick={handleInteractiveCaseTest} disabled={caseLoading}>
                {caseLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Stethoscope className="w-4 h-4 mr-1" />
                )}
                Test Interactive Case
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              Each button sends a tagged synthetic event to Sentry. Filter in Sentry by tag <code className="font-mono">feature:ai_call</code>, <code className="font-mono">feature:db_write</code>, or <code className="font-mono">feature:interactive_case</code>. All test events also carry tag <code className="font-mono">test:true</code>.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
