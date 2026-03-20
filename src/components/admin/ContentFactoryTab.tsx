import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layers, BookOpen, Network } from 'lucide-react';
import { AISettingsPanel } from './AISettingsPanel';
import { AIBatchJobsList } from './AIBatchJobsList';
import { MindMapPromptSettings } from './MindMapPromptSettings';
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
        <p className="text-muted-foreground">Batch generation, content rules, and mind map prompts</p>
      </div>

      <Tabs defaultValue="batch" className="w-full">
        <TabsList className="h-auto gap-1 p-1.5 w-full justify-start flex-wrap">
          <TabsTrigger value="batch" className="gap-2">
            <Layers className="w-4 h-4" />
            Batch Generation & Jobs
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <BookOpen className="w-4 h-4" />
            AI Rules
          </TabsTrigger>
          <TabsTrigger value="mindmap-prompts" className="gap-2">
            <Network className="w-4 h-4" />
            Mind Map Prompts
          </TabsTrigger>
        </TabsList>

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

        <TabsContent value="mindmap-prompts" className="mt-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Mind Map Prompt Presets</h3>
              <p className="text-sm text-muted-foreground">
                Configure AI prompts used when generating Markmap mind maps from chapter/topic PDFs
              </p>
            </div>
            <MindMapPromptSettings />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
