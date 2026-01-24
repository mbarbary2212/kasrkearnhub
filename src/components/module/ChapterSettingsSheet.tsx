import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Settings } from 'lucide-react';
import { SectionsManager } from '@/components/sections';

interface ChapterSettingsSheetProps {
  chapterId: string;
  chapterTitle: string;
  canManage: boolean;
}

export function ChapterSettingsSheet({
  chapterId,
  chapterTitle,
  canManage,
}: ChapterSettingsSheetProps) {
  const [open, setOpen] = useState(false);

  if (!canManage) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Chapter Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Chapter Settings</SheetTitle>
          <SheetDescription>{chapterTitle}</SheetDescription>
        </SheetHeader>
        
        <div className="mt-6">
          <SectionsManager chapterId={chapterId} canManage={canManage} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
