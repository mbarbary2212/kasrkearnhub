import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { StudyGroupList, GroupDetailView } from '@/components/study-groups';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function StudyGroupsPage() {
  const navigate = useNavigate();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              if (selectedGroupId) setSelectedGroupId(null);
              else navigate(-1);
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">
            {selectedGroupId ? 'Study Group' : 'Study Groups'}
          </h1>
        </div>
        {selectedGroupId ? (
          <GroupDetailView groupId={selectedGroupId} onBack={() => setSelectedGroupId(null)} />
        ) : (
          <StudyGroupList onSelectGroup={(id) => setSelectedGroupId(id)} />
        )}
      </div>
    </MainLayout>
  );
}
