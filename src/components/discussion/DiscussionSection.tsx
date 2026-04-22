import { useState, useEffect, useMemo } from "react";
import { useModuleThreads, useChapterThreads, useAllOpenThreads, DiscussionThread } from "@/hooks/useDiscussions";
import { ThreadList } from "./ThreadList";
import { ThreadView } from "./ThreadView";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markDiscussionsSeen } from "@/hooks/useConnectBadges";

interface DiscussionSectionProps {
  moduleId?: string;
  chapterId?: string;
}

export function DiscussionSection({ moduleId, chapterId }: DiscussionSectionProps) {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const moduleThreads = useModuleThreads(chapterId ? undefined : moduleId);
  const chapterThreads = useChapterThreads(chapterId);
  const openThreads = useAllOpenThreads();

  const isOpenDiscussion = !moduleId && !chapterId;

  const allThreads = isOpenDiscussion
    ? openThreads.data
    : chapterId
      ? chapterThreads.data
      : moduleThreads.data;
  const isLoading = isOpenDiscussion
    ? openThreads.isLoading
    : chapterId
      ? chapterThreads.isLoading
      : moduleThreads.isLoading;

  // Mark discussions as seen whenever the user opens the open-forum view
  useEffect(() => {
    if (isOpenDiscussion) markDiscussionsSeen();
  }, [isOpenDiscussion]);

  const filteredThreads = useMemo(() => {
    if (!allThreads) return allThreads;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allThreads;
    return allThreads.filter(t => t.title.toLowerCase().includes(q));
  }, [allThreads, searchQuery]);

  const selectedThread = allThreads?.find(t => t.id === selectedThreadId);

  if (selectedThread) {
    return (
      <ThreadView 
        thread={selectedThread} 
        onBack={() => setSelectedThreadId(null)} 
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search discussions by title…"
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setSearchQuery("")}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {searchQuery && allThreads && filteredThreads && filteredThreads.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No discussions match "{searchQuery}". Try a different keyword or create a new thread.
          </CardContent>
        </Card>
      )}
      <ThreadList
        threads={filteredThreads}
        isLoading={isLoading}
        moduleId={moduleId}
        chapterId={chapterId}
        isOpenDiscussion={isOpenDiscussion}
        onSelectThread={setSelectedThreadId}
        selectedThreadId={selectedThreadId || undefined}
      />
    </div>
  );
}
