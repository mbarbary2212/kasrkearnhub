import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClinicalCaseCard, ClinicalCaseCardSkeleton } from './ClinicalCaseCard';
import { useClinicalCases } from '@/hooks/useClinicalCases';
import { Stethoscope, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthContext } from '@/contexts/AuthContext';

interface ClinicalCaseListProps {
  moduleId?: string;
  chapterId?: string;
  topicId?: string;
}

const LEVEL_ORDER: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };

export function ClinicalCaseList({ moduleId, chapterId, topicId }: ClinicalCaseListProps) {
  const navigate = useNavigate();
  const { isAdmin, isTeacher, isPlatformAdmin, isSuperAdmin } = useAuthContext();
  const canSeeUnpublished = isAdmin || isTeacher || isPlatformAdmin || isSuperAdmin;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  
  const { data: cases, isLoading } = useClinicalCases(moduleId, canSeeUnpublished, 'all');

  const filteredCases = (cases || [])
    .filter(c => {
      if (chapterId && c.chapter_id !== chapterId) return false;
      if (topicId && c.topic_id !== topicId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!c.title.toLowerCase().includes(q) && !c.intro_text.toLowerCase().includes(q)) return false;
      }
      if (levelFilter !== 'all' && c.level !== levelFilter) return false;
      return true;
    })
    .sort((a, b) => (LEVEL_ORDER[a.level] ?? 1) - (LEVEL_ORDER[b.level] ?? 1));

  const handleStartCase = (caseId: string) => {
    navigate(`/virtual-patient/${caseId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
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
        <div className="text-center py-12 border rounded-lg">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
            <Stethoscope className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-1">No Cases Available</h3>
          <p className="text-sm text-muted-foreground">
            {moduleId 
              ? "Cases haven't been added to this module yet."
              : "No cases are available."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
