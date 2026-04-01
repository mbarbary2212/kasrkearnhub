import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Image, GitCompare } from "lucide-react";
import { McqAnalyticsDashboard } from "./McqAnalyticsDashboard";
import { OsceAnalyticsDashboard } from "./OsceAnalyticsDashboard";
import { MatchingAnalyticsDashboard } from "./MatchingAnalyticsDashboard";

interface Module {
  id: string;
  name: string;
  year_id?: string;
}

export interface QuestionAnalyticsTabsProps {
  modules: Module[];
  moduleAdminModuleIds?: string[];
}

export function QuestionAnalyticsTabs({ modules, moduleAdminModuleIds }: QuestionAnalyticsTabsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Content Analytics</h2>
        <p className="text-muted-foreground">Question performance and content quality signals across assessment types</p>
      </div>

      <Tabs defaultValue="mcq" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="mcq" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            MCQ
          </TabsTrigger>
          <TabsTrigger value="sba" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            SBA
          </TabsTrigger>
          <TabsTrigger value="osce" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            OSCE
          </TabsTrigger>
          <TabsTrigger value="matching" className="flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            Matching
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mcq" className="mt-6">
          <McqAnalyticsDashboard 
            modules={modules} 
            moduleAdminModuleIds={moduleAdminModuleIds}
          />
        </TabsContent>

        <TabsContent value="sba" className="mt-6">
          <McqAnalyticsDashboard 
            modules={modules} 
            moduleAdminModuleIds={moduleAdminModuleIds}
            questionFormat="sba"
          />
        </TabsContent>

        <TabsContent value="osce" className="mt-6">
          <OsceAnalyticsDashboard 
            modules={modules} 
            moduleAdminModuleIds={moduleAdminModuleIds}
          />
        </TabsContent>

        <TabsContent value="matching" className="mt-6">
          <MatchingAnalyticsDashboard 
            modules={modules} 
            moduleAdminModuleIds={moduleAdminModuleIds}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
