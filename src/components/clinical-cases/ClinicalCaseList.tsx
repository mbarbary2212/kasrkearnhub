import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClinicalCaseCard, ClinicalCaseCardSkeleton } from './ClinicalCaseCard';
import { useClinicalCases } from '@/hooks/useClinicalCases';
import { Stethoscope, Search, Filter, BookOpen, Play } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthContext } from '@/contexts/AuthContext';
import { CaseMode, CASE_MODE_TABS } from '@/types/clinicalCase';
import { Badge } from '@/components/ui/badge';

interface ClinicalCaseListProps {
  moduleId?: string;
  chapterId?: string;
}

export function ClinicalCaseList({ moduleId, chapterId }: ClinicalCaseListProps) {
  const navigate = useNavigate();
  const { isAdmin, isTeacher, isPlatformAdmin, isSuperAdmin } = useAuthContext();
  const canSeeUnpublished = isAdmin || isTeacher || isPlatformAdmin || isSuperAdmin;
  
  const [modeFilter, setModeFilter] = useState<CaseMode | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  
  const { data: cases, isLoading } = useClinicalCases(moduleId, canSeeUnpublished, modeFilter);

  // Filter cases
  const filteredCases = (cases || []).filter(c => {
    // Filter by chapter if provided
    if (chapterId && c.chapter_id !== chapterId) return false;
    
    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.title.toLowerCase().includes(q) && !c.intro_text.toLowerCase().includes(q)) {
        return false;
      }
    }
    
    // Filter by level
    if (levelFilter !== 'all' && c.level !== levelFilter) return false;
    
    return true;
  });

  const handleStartCase = (caseId: string) => {
    navigate(`/clinical-case/${caseId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Mode Tabs */}
        <Tabs value={modeFilter} className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
            {CASE_MODE_TABS.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} disabled>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input placeholder="Search cases..." className="h-9" disabled />
          </div>
          <Select disabled>
            <SelectTrigger className="w-full sm:w-40 h-9">
              <SelectValue placeholder="All levels" />
            </SelectTrigger>
          </Select>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <ClinicalCaseCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!cases || cases.length === 0) {
    return (
      <div className="space-y-4">
        {/* Mode Tabs */}
        <Tabs value={modeFilter} onValueChange={(v) => setModeFilter(v as CaseMode | 'all')} className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
            {CASE_MODE_TABS.map(tab => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                disabled={tab.comingSoon}
                className="relative"
              >
                {tab.label}
                {tab.comingSoon && (
                  <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">Soon</Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        
        <div className="text-center py-12 border rounded-lg">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
            <Stethoscope className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-1">No Clinical Cases Available</h3>
          <p className="text-sm text-muted-foreground">
            {moduleId 
              ? "Clinical cases haven't been added to this module yet."
              : "No clinical cases are available."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode Tabs */}
      <Tabs value={modeFilter} onValueChange={(v) => setModeFilter(v as CaseMode | 'all')} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          {CASE_MODE_TABS.map(tab => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              disabled={tab.comingSoon}
              className="relative"
            >
              {tab.label}
              {tab.comingSoon && (
                <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">Soon</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-full sm:w-40 h-9">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cases Grid */}
      {filteredCases.length === 0 ? (
        <div className="text-center py-8 border rounded-lg">
          <p className="text-muted-foreground">No cases match your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredCases.map((clinicalCase) => (
            <ClinicalCaseCard
              key={clinicalCase.id}
              clinicalCase={clinicalCase}
              onStart={handleStartCase}
            />
          ))}
        </div>
      )}
    </div>
  );
}
