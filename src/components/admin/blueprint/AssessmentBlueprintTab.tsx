import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ExamStructureSubtab } from './ExamStructureSubtab';
import { TopicWeightsSubtab } from './TopicWeightsSubtab';
import { ValidationSummarySubtab } from './ValidationSummarySubtab';
import { ChapterBlueprintSubtab } from './ChapterBlueprintSubtab';

interface Props {
  years: { id: string; name: string }[];
  modules: { id: string; name: string; year_id: string }[];
}

export function AssessmentBlueprintTab({ years, modules }: Props) {
  const [subtab, setSubtab] = useState('chapters');
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-heading font-bold">Assessment Blueprint</h2>
        <p className="text-sm text-muted-foreground">
          Define exam structures, component weights, and chapter/topic allocations.
        </p>
      </div>

      <Tabs value={subtab} onValueChange={setSubtab}>
        <TabsList>
          <TabsTrigger value="chapters">Chapter Blueprint</TabsTrigger>
          <TabsTrigger value="structure">Exam Structure</TabsTrigger>
          <TabsTrigger value="weights">Topic / Chapter Weights</TabsTrigger>
          <TabsTrigger value="validation">Validation & Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="chapters" className="mt-4">
          <ChapterBlueprintSubtab
            years={years}
            modules={modules}
            selectedYearId={selectedYearId}
            onYearChange={setSelectedYearId}
            selectedModuleId={selectedModuleId}
            onModuleChange={setSelectedModuleId}
          />
        </TabsContent>
        <TabsContent value="structure" className="mt-4">
          <ExamStructureSubtab
            years={years}
            modules={modules}
            selectedYearId={selectedYearId}
            onYearChange={setSelectedYearId}
            selectedModuleId={selectedModuleId}
            onModuleChange={setSelectedModuleId}
          />
        </TabsContent>
        <TabsContent value="weights" className="mt-4">
          <TopicWeightsSubtab
            years={years}
            modules={modules}
            selectedYearId={selectedYearId}
            onYearChange={setSelectedYearId}
            selectedModuleId={selectedModuleId}
            onModuleChange={setSelectedModuleId}
          />
        </TabsContent>
        <TabsContent value="validation" className="mt-4">
          <ValidationSummarySubtab
            years={years}
            modules={modules}
            selectedYearId={selectedYearId}
            onYearChange={setSelectedYearId}
            selectedModuleId={selectedModuleId}
            onModuleChange={setSelectedModuleId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
