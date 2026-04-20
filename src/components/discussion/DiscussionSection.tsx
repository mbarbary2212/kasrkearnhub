import { useState } from "react";
import { useModuleThreads, useChapterThreads, useAllOpenThreads, DiscussionThread } from "@/hooks/useDiscussions";
import { ThreadList } from "./ThreadList";
import { ThreadView } from "./ThreadView";
import { Card, CardContent } from "@/components/ui/card";

interface DiscussionSectionProps {
  moduleId?: string;
  chapterId?: string;
}

export function DiscussionSection({ moduleId, chapterId }: DiscussionSectionProps) {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  
  const moduleThreads = useModuleThreads(chapterId ? undefined : moduleId);
  const chapterThreads = useChapterThreads(chapterId);
  const openThreads = useAllOpenThreads();

  const isOpenDiscussion = !moduleId && !chapterId;

  const threads = isOpenDiscussion
    ? openThreads.data
    : chapterId
      ? chapterThreads.data
      : moduleThreads.data;
  const isLoading = isOpenDiscussion
    ? openThreads.isLoading
    : chapterId
      ? chapterThreads.isLoading
      : moduleThreads.isLoading;
  
  const selectedThread = threads?.find(t => t.id === selectedThreadId);

  if (selectedThread) {
    return (
      <ThreadView 
        thread={selectedThread} 
        onBack={() => setSelectedThreadId(null)} 
      />
    );
  }

  return (
    <ThreadList
      threads={threads}
      isLoading={isLoading}
      moduleId={moduleId}
      chapterId={chapterId}
      isOpenDiscussion={isOpenDiscussion}
      onSelectThread={setSelectedThreadId}
      selectedThreadId={selectedThreadId || undefined}
    />
  );
}
