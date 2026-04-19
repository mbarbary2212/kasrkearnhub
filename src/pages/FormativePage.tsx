import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardCheck, ChevronRight, ArrowLeft, History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import MainLayout from '@/components/layout/MainLayout';
import { useAuthContext } from '@/contexts/AuthContext';
import { useModules } from '@/hooks/useModules';
import { useModuleChapters } from '@/hooks/useChapters';
import { ModuleFormativeTab } from '@/components/module/ModuleFormativeTab';
import { PastResultsList } from '@/components/formative/PastResultsList';
import type { Module } from '@/types/curriculum';

export default function FormativePage() {
  const { profile } = useAuthContext();
  const [searchParams] = useSearchParams();
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const formativeType = searchParams.get('type'); // 'written' or 'practical' — reserved for future use

  // Fetch all modules (filtered by preferred year if set)
  const { data: modules, isLoading } = useModules(profile?.preferred_year_id || undefined);
  const { data: chapters } = useModuleChapters(selectedModule?.id);

  if (selectedModule) {
    return (
      <MainLayout>
        <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedModule(null)}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Module Selection
          </Button>
          <ModuleFormativeTab
            moduleId={selectedModule.id}
            moduleName={selectedModule.name}
            chapters={chapters}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="text-center mb-6">
          <h1 className="text-xl font-heading font-semibold mb-2">Formative Assessment</h1>
          <p className="text-muted-foreground text-sm">
            Choose a module to practice with mock exams and quizzes
          </p>
        </div>

        <Tabs defaultValue="modules">
          <TabsList className="w-full">
            <TabsTrigger value="modules" className="flex-1 gap-1.5">
              <ClipboardCheck className="w-4 h-4" />
              Modules
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1 gap-1.5">
              <History className="w-4 h-4" />
              Past Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="modules" className="mt-6">
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
            ) : modules && modules.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {modules.map((mod) => (
                  <Card
                    key={mod.id}
                    className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group"
                    onClick={() => setSelectedModule(mod)}
                  >
                    <CardHeader className="pb-2">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                        <ClipboardCheck className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{mod.name}</CardTitle>
                      {mod.description && (
                        <CardDescription className="line-clamp-2">{mod.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-sm text-primary font-medium">
                        Start Practice <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No modules available yet.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            <PastResultsList />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
