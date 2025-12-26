import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  ClipboardCheck, 
  BookOpen, 
  Layers, 
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import { ModuleChapter } from '@/hooks/useChapters';
import { cn } from '@/lib/utils';

interface ModuleFormativeTabProps {
  moduleId: string;
  moduleName: string;
  chapters: ModuleChapter[] | undefined;
  selectorLabel?: string;
}

type FormativeMode = null | 'chapter' | 'full';

export function ModuleFormativeTab({ 
  moduleId, 
  moduleName,
  chapters,
  selectorLabel = 'Department',
}: ModuleFormativeTabProps) {
  const navigate = useNavigate();
  const [formativeMode, setFormativeMode] = useState<FormativeMode>(null);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');

  const hasChapters = chapters && chapters.length > 0;

  // Group chapters by book_label
  const groupedChapters = hasChapters ? chapters.reduce((acc, chapter) => {
    const label = chapter.book_label || 'General';
    if (!acc[label]) acc[label] = [];
    acc[label].push(chapter);
    return acc;
  }, {} as Record<string, typeof chapters>) : {};

  const bookLabels = Object.keys(groupedChapters);
  const hasMultipleBooks = bookLabels.length > 1;

  const filteredChapters = selectedBook 
    ? groupedChapters[selectedBook] || []
    : chapters || [];

  const handleStartChapterFormative = () => {
    if (selectedChapter) {
      // Navigate to mock exam with chapter scope
      navigate(`/module/${moduleId}/mock-exam?scope=chapter&chapterId=${selectedChapter}`);
    }
  };

  const handleStartFullFormative = () => {
    // Navigate to mock exam with full module scope
    navigate(`/module/${moduleId}/mock-exam?scope=full`);
  };

  // Initial mode selection
  if (!formativeMode) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">Formative Assessment</h2>
          <p className="text-muted-foreground text-sm">
            Choose your assessment scope
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card 
            className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
            onClick={() => setFormativeMode('chapter')}
          >
            <CardHeader className="pb-2">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Chapter Formative</CardTitle>
              <CardDescription>
                Test yourself on a specific chapter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-primary font-medium">
                Select Chapter <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
            onClick={() => setFormativeMode('full')}
          >
            <CardHeader className="pb-2">
              <div className="w-12 h-12 bg-accent/50 rounded-lg flex items-center justify-center mb-2">
                <Layers className="w-6 h-6 text-accent-foreground" />
              </div>
              <CardTitle className="text-lg">Full Module Formative</CardTitle>
              <CardDescription>
                Comprehensive assessment across all chapters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-primary font-medium">
                Start Now <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Full module formative
  if (formativeMode === 'full') {
    return (
      <div className="space-y-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setFormativeMode(null)}
          className="gap-1 mb-2"
        >
          ← Back
        </Button>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 bg-accent/50 rounded-lg flex items-center justify-center mb-2">
              <GraduationCap className="w-6 h-6 text-accent-foreground" />
            </div>
            <CardTitle>Full Module Formative</CardTitle>
            <CardDescription>
              Test your knowledge across all chapters in {moduleName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleStartFullFormative} className="w-full gap-2">
              <ClipboardCheck className="w-4 h-4" />
              Start Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Chapter formative selection
  return (
    <div className="space-y-6">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => {
          setFormativeMode(null);
          setSelectedBook('');
          setSelectedChapter('');
        }}
        className="gap-1 mb-2"
      >
        ← Back
      </Button>

      <Card>
        <CardHeader>
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Chapter Formative</CardTitle>
          <CardDescription>
            Select a {selectorLabel.toLowerCase()} and chapter to assess
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Book/Department selector (only if multiple books) */}
          {hasMultipleBooks && (
            <div className="space-y-2">
              <Label>{selectorLabel}</Label>
              <Select value={selectedBook} onValueChange={(v) => {
                setSelectedBook(v);
                setSelectedChapter('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${selectorLabel.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {bookLabels.map((book) => (
                    <SelectItem key={book} value={book}>{book}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Chapter selector */}
          <div className="space-y-2">
            <Label>Chapter</Label>
            <Select 
              value={selectedChapter} 
              onValueChange={setSelectedChapter}
              disabled={hasMultipleBooks && !selectedBook}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select chapter" />
              </SelectTrigger>
              <SelectContent>
                {filteredChapters.map((chapter) => (
                  <SelectItem key={chapter.id} value={chapter.id}>
                    Ch {chapter.chapter_number}: {chapter.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleStartChapterFormative} 
            className="w-full gap-2"
            disabled={!selectedChapter}
          >
            <ClipboardCheck className="w-4 h-4" />
            Start Chapter Assessment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
