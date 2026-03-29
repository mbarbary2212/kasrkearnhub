import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAdminData } from '@/hooks/useAdminData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { ExamStructureTab } from '@/components/admin/blueprint/ExamStructureTab';
import { ChapterWeightsTab } from '@/components/admin/blueprint/ChapterWeightsTab';
import { AssessmentRulesTab } from '@/components/admin/blueprint/AssessmentRulesTab';
import { ValidationSummaryTab } from '@/components/admin/blueprint/ValidationSummaryTab';
import { ExamPreviewTab } from '@/components/admin/blueprint/ExamPreviewTab';

export default function AssessmentBlueprintPage() {
  const { isAdmin, isSuperAdmin, isPlatformAdmin, isModuleAdmin, moduleAdminModuleIds, isLoading: authLoading } = useAuthContext();
  const { data: adminData, isLoading: dataLoading } = useAdminData(!!isAdmin);
  const [searchParams] = useSearchParams();

  const years = adminData?.years ?? [];
  const modules = adminData?.modules ?? [];

  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('structure');

  // Auto-select first year/module
  useEffect(() => {
    if (years.length && !selectedYearId) setSelectedYearId(years[0].id);
  }, [years, selectedYearId]);

  useEffect(() => {
    const filtered = modules.filter(m => m.year_id === selectedYearId);
    if (filtered.length && !filtered.find(m => m.id === selectedModuleId)) {
      setSelectedModuleId(filtered[0].id);
    }
  }, [selectedYearId, modules, selectedModuleId]);

  const filteredModules = modules.filter(m => m.year_id === selectedYearId);
  const canManage = isSuperAdmin || isPlatformAdmin || (isModuleAdmin && moduleAdminModuleIds?.includes(selectedModuleId));

  if (authLoading || dataLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-heading font-bold">Assessment Blueprint</h1>
          <p className="text-muted-foreground">Define exam structures, eligibility rules, and chapter question pools.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="structure">Exam Structure</TabsTrigger>
            <TabsTrigger value="weights">Chapter Eligibility</TabsTrigger>
            <TabsTrigger value="rules">Generation Rules</TabsTrigger>
            <TabsTrigger value="validation">Validation &amp; Summary</TabsTrigger>
            <TabsTrigger value="preview">Exam Preview</TabsTrigger>
          </TabsList>

          <div className="flex gap-4 mt-4 flex-wrap">
            <div>
              <label className="text-sm font-medium mb-1 block">Year</label>
              <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Module</label>
              <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {filteredModules.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="structure">
            <ExamStructureTab
              moduleId={selectedModuleId}
              yearId={selectedYearId}
              canManage={!!canManage}
            />
          </TabsContent>
          <TabsContent value="weights">
            <ChapterWeightsTab
              moduleId={selectedModuleId}
              canManage={!!canManage}
            />
          </TabsContent>
          <TabsContent value="rules">
            <AssessmentRulesTab
              moduleId={selectedModuleId}
              canManage={!!canManage}
            />
          </TabsContent>
          <TabsContent value="validation">
            <ValidationSummaryTab moduleId={selectedModuleId} />
          </TabsContent>
          <TabsContent value="preview">
            <ExamPreviewTab moduleId={selectedModuleId} yearId={selectedYearId} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
