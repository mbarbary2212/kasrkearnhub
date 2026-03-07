import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layers, FileText } from 'lucide-react';
import { CurriculumTab } from './CurriculumTab';
import { PDFLibraryTab } from './PDFLibraryTab';
import { useAuthContext } from '@/contexts/AuthContext';
import type { Year, Module } from '@/types/curriculum';

interface CurriculumSourcesTabProps {
  modules: Module[];
  years: Year[];
  setModules: (m: Module[]) => void;
  moduleAdminModuleIds: string[];
}

export function CurriculumSourcesTab({ modules, years, setModules, moduleAdminModuleIds }: CurriculumSourcesTabProps) {
  const { isSuperAdmin, isPlatformAdmin, isModuleAdmin } = useAuthContext();

  const tabs = [
    { value: 'curriculum', label: 'Curriculum', icon: Layers, visible: isSuperAdmin || isPlatformAdmin },
    { value: 'pdf-library', label: 'PDF Library', icon: FileText, visible: isPlatformAdmin || isModuleAdmin },
  ].filter(t => t.visible);

  const defaultTab = tabs[0]?.value || 'curriculum';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Curriculum & Sources</h2>
        <p className="text-muted-foreground">Manage curriculum structure and PDF reference documents</p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="h-auto gap-1 p-1.5 w-full justify-start flex-wrap">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                <Icon className="w-4 h-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="curriculum" className="mt-4">
          <CurriculumTab modules={modules} years={years} setModules={setModules} />
        </TabsContent>

        <TabsContent value="pdf-library" className="mt-4">
          <PDFLibraryTab moduleAdminModuleIds={moduleAdminModuleIds} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
