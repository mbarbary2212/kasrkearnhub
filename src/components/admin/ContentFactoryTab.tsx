import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Layers, BookOpen } from 'lucide-react';
import { AISettingsPanel } from './AISettingsPanel';
import { AIBatchJobsList } from './AIBatchJobsList';
import { Button } from '@/components/ui/button';

// Lazy wrapper for AI Batch Generator Modal
function AIBatchGeneratorModalLazy(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [Component, setComponent] = useState<React.ComponentType<typeof props> | null>(null);

  useEffect(() => {
    import('./AIBatchGeneratorModal').then(mod => {
      setComponent(() => mod.AIBatchGeneratorModal);
    });
  }, []);

  if (!Component) return null;
  return <Component {...props} />;
}

export function ContentFactoryTab() {
  const [batchGeneratorOpen, setBatchGeneratorOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Content Factory</h2>
        <p className="text-muted-foreground">AI settings, batch generation, and content rules</p>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="h-auto gap-1 p-1.5 w-full justify-start flex-wrap">
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="batch" className="gap-2">
            <Layers className="w-4 h-4" />
            Batch Generation & Jobs
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <BookOpen className="w-4 h-4" />
            AI Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4">
          <AISettingsPanel showRules={false} />
        </TabsContent>

        <TabsContent value="batch" className="mt-4">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Batch Generation</h3>
                <p className="text-sm text-muted-foreground">Generate content in bulk from PDF documents</p>
              </div>
              <Button onClick={() => setBatchGeneratorOpen(true)}>
                <Layers className="w-4 h-4 mr-2" />
                New Batch Job
              </Button>
            </div>
            <AIBatchJobsList />
          </div>

          {batchGeneratorOpen && (
            <AIBatchGeneratorModalLazy
              open={batchGeneratorOpen}
              onOpenChange={setBatchGeneratorOpen}
            />
          )}
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <AISettingsPanel showRules="only" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
