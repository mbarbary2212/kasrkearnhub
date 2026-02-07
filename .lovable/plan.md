

# Complete Chapter/Topic Unification and Admin Workflow Hardening

## Overview

This plan addresses the critical issue of `chapterId` and `topicId` being incorrectly mixed throughout the codebase. Currently, `TopicDetailPage.tsx` passes `topicId` into props named `chapterId` in 15 places, which breaks data consistency, progress tracking, and RLS assumptions.

The solution uses **Option B (Dual Support)**: components and hooks will accept both `chapterId?` and `topicId?` as separate props, filtering by the correct column based on which ID exists.

---

## Phase 1: Database Schema Fixes

### 1.1 Add `topic_id` to `study_resources` Table

The `study_resources` table currently only has `chapter_id` (required). Topic-based modules cannot use flashcards, mind maps, or other study resources.

```sql
-- Add topic_id column
ALTER TABLE study_resources 
  ADD COLUMN topic_id UUID REFERENCES topics(id);

-- Make chapter_id nullable for topic-based resources
ALTER TABLE study_resources 
  ALTER COLUMN chapter_id DROP NOT NULL;

-- Add CHECK constraint for mutual exclusivity
ALTER TABLE study_resources 
  ADD CONSTRAINT study_resources_chapter_or_topic_check 
  CHECK (
    (chapter_id IS NOT NULL AND topic_id IS NULL) OR 
    (chapter_id IS NULL AND topic_id IS NOT NULL)
  );

-- Add index for performance
CREATE INDEX idx_study_resources_topic_id ON study_resources(topic_id);
```

### 1.2 Add `topic_id` to `question_attempts` Table

Progress tracking currently only supports `chapter_id`. Topic-based modules show 0% progress.

```sql
ALTER TABLE question_attempts 
  ADD COLUMN topic_id UUID REFERENCES topics(id);

CREATE INDEX idx_question_attempts_topic_id ON question_attempts(topic_id);
```

### 1.3 Add `topic_id` to `user_flashcard_stars` Table

Starred flashcards are stored with `chapter_id` only.

```sql
ALTER TABLE user_flashcard_stars 
  ADD COLUMN topic_id UUID REFERENCES topics(id);

CREATE INDEX idx_user_flashcard_stars_topic_id ON user_flashcard_stars(topic_id);
```

### 1.4 Data Backfill (Critical)

Because the app previously passed `topicId` into `chapterId`, some rows may have incorrect data:

```sql
-- Find study_resources where chapter_id is actually a topic_id
UPDATE study_resources sr
SET 
  topic_id = sr.chapter_id,
  chapter_id = NULL
WHERE EXISTS (
  SELECT 1 FROM topics t WHERE t.id = sr.chapter_id
);

-- Same for user_flashcard_stars
UPDATE user_flashcard_stars ufs
SET 
  topic_id = ufs.chapter_id,
  chapter_id = NULL
WHERE EXISTS (
  SELECT 1 FROM topics t WHERE t.id = ufs.chapter_id
);
```

---

## Phase 2: Content Container Type System

### 2.1 Create Shared Type Definition

**File: `src/types/content.ts`**

```typescript
/**
 * Content container identity - represents either a chapter or topic
 * NEVER pass topicId into chapterId props
 */
export interface ContentContainerId {
  chapterId?: string;
  topicId?: string;
  moduleId: string;
}

export type ContainerType = 'chapter' | 'topic';

export function getContainerType(container: ContentContainerId): ContainerType {
  return container.chapterId ? 'chapter' : 'topic';
}

export function getContainerId(container: ContentContainerId): string {
  return container.chapterId || container.topicId || '';
}

export function getContainerColumn(container: ContentContainerId): 'chapter_id' | 'topic_id' {
  return container.chapterId ? 'chapter_id' : 'topic_id';
}
```

---

## Phase 3: Hook Updates with Dual Support

### 3.1 Update `useStudyResources.ts`

Add new hook for topics and update existing hooks:

```typescript
// NEW: Fetch study resources for a topic
export function useTopicStudyResources(topicId?: string, includeDeleted = false) {
  return useQuery({
    queryKey: ['study-resources', 'topic', topicId, includeDeleted],
    queryFn: async () => {
      let query = supabase
        .from('study_resources')
        .select('*')
        .eq('topic_id', topicId!)
        .order('resource_type')
        .order('display_order');

      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as StudyResource[];
    },
    enabled: !!topicId,
  });
}

// UPDATE: Create mutation to support topic_id
export function useCreateStudyResource() {
  // Update mutation to accept topic_id in addition to chapter_id
  // Insert with correct column based on which ID is provided
}
```

### 3.2 Update `useChapterProgress.ts`

Create unified progress hook:

```typescript
export function useContentProgress(params: {
  chapterId?: string;
  topicId?: string;
}) {
  const { user } = useAuthContext();
  const { chapterId, topicId } = params;
  const containerId = chapterId || topicId;
  const containerColumn = chapterId ? 'chapter_id' : 'topic_id';

  return useQuery({
    queryKey: ['content-progress', containerColumn, containerId, user?.id],
    queryFn: async () => {
      // Query all content tables by the correct column
      // Calculate progress the same way as useChapterProgress
    },
    enabled: !!user?.id && !!containerId,
  });
}
```

### 3.3 Update `useFlashcardStars.ts`

Support both chapter and topic:

```typescript
export function useFlashcardStars(params: {
  chapterId?: string;
  topicId?: string;
}) {
  const { chapterId, topicId } = params;
  const containerColumn = chapterId ? 'chapter_id' : 'topic_id';
  const containerId = chapterId || topicId;
  
  // Query and mutations use containerColumn
}
```

### 3.4 Update `useQuestionAttempts.ts`

Support topic-based progress tracking:

```typescript
export function useSaveQuestionAttempt() {
  // Update to accept topicId in addition to chapterId
  // Insert with correct column
}
```

---

## Phase 4: Component Updates

### 4.1 Components Requiring Dual Props

Each of these components needs `topicId?` added alongside `chapterId?`:

| Component | Current Props | Updated Props |
|-----------|--------------|---------------|
| `FlashcardsTab` | `chapterId` | `chapterId?, topicId?` |
| `StudyResourceFormModal` | `chapterId` | `chapterId?, topicId?` |
| `StudyBulkUploadModal` | `chapterId` | `chapterId?, topicId?` |
| `ChapterProgressBar` | Implicit | `chapterId?, topicId?` |
| `MindMapViewer` | Uses parent data | `chapterId?, topicId?` |
| `GuidedExplanationList` | Uses parent data | `chapterId?, topicId?` |
| `ClinicalToolsSection` | `chapterId` | `chapterId?, topicId?` |
| `BulkSectionAssignment` | `chapterId` | `chapterId?, topicId?` |
| `SectionSelector` | `chapterId?, topicId?` | Already correct |
| `ClinicalCaseAdminList` | `chapterId` | `chapterId?, topicId?` |

### 4.2 FlashcardsTab Update

**File: `src/components/study/FlashcardsTab.tsx`**

```typescript
interface FlashcardsTabProps {
  resources: StudyResource[];
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
  chapterId?: string;  // For chapter-based modules
  topicId?: string;    // For topic-based modules
  moduleId?: string;
}

export function FlashcardsTab({ 
  resources, canManage, onEdit, 
  chapterId, topicId, moduleId 
}: FlashcardsTabProps) {
  // Use correct ID based on which is provided
  const containerId = chapterId || topicId;
  const containerType = chapterId ? 'chapter' : 'topic';
  
  // Pass to child hooks
  const { starredIds, toggleStar } = useFlashcardStars({ chapterId, topicId });
  const { settings } = useFlashcardSettings({ chapterId, topicId });
  
  // BulkSectionAssignment also needs both
  {(chapterId || topicId) && (
    <BulkSectionAssignment
      chapterId={chapterId}
      topicId={topicId}
      // ...
    />
  )}
}
```

### 4.3 StudyResourceFormModal Update

**File: `src/components/study/StudyResourceFormModal.tsx`**

```typescript
interface StudyResourceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId?: string;  // For chapter-based
  topicId?: string;    // For topic-based
  moduleId: string;
  resourceType: StudyResourceType;
  resource?: StudyResource | null;
}

// In handleSubmit:
await createResource.mutateAsync({
  module_id: moduleId,
  chapter_id: chapterId || null,
  topic_id: topicId || null,
  resource_type: resourceType,
  // ...
});
```

---

## Phase 5: Fix TopicDetailPage Anti-Patterns

### 5.1 Replace All `chapterId={topicId}` Instances

**File: `src/pages/TopicDetailPage.tsx`**

15 occurrences to fix:

```typescript
// Line 397: FlashcardsTab
// BEFORE (wrong)
<FlashcardsTab chapterId={topicId} />
// AFTER (correct)
<FlashcardsTab topicId={topicId} />

// Line 652: StudyResourceFormModal
// BEFORE
<StudyResourceFormModal chapterId={topicId} />
// AFTER
<StudyResourceFormModal topicId={topicId} />

// Line 660: StudyBulkUploadModal
// BEFORE
<StudyBulkUploadModal chapterId={topicId} />
// AFTER
<StudyBulkUploadModal topicId={topicId} />

// All other occurrences follow same pattern
```

### 5.2 Add Missing Features to TopicDetailPage

Features present in `ChapterPage` but missing in `TopicDetailPage`:

1. **Progress Bar** - Add `useContentProgress({ topicId })` and display
2. **Mind Maps Tab** - Add resource tab with `MindMapViewer`
3. **Guided Explanations Tab** - Add resource tab
4. **Clinical Tools Tab** - Add `ClinicalToolsSection`
5. **Mobile Section Dropdown** - Add `MobileSectionDropdown` for practice tabs
6. **ClinicalCaseAdminList** - Replace basic card list with full admin controls
7. **Ask Coach Button** - Add `AskCoachButton` in header
8. **Deleted Essays Toggle** - Add `showDeletedToggle` prop

### 5.3 Add Missing Hooks to TopicDetailPage

```typescript
// Add these hooks
import { useTopicStudyResources } from '@/hooks/useStudyResources';
import { useContentProgress } from '@/hooks/useChapterProgress';
import { MindMapViewer } from '@/components/study/MindMapViewer';
import { GuidedExplanationList } from '@/components/study/GuidedExplanationList';
import { ClinicalToolsSection } from '@/components/study/ClinicalToolsSection';
import { ClinicalCaseAdminList } from '@/components/clinical-cases';
import { AskCoachButton } from '@/components/coach';
import { MobileSectionDropdown } from '@/components/content/MobileSectionDropdown';

// Replace useChapterStudyResourcesByType with topic-aware hook
const { data: studyResources, isLoading: studyResourcesLoading } = 
  useTopicStudyResources(topicId);

// Add progress tracking
const { data: progress, isLoading: progressLoading } = 
  useContentProgress({ topicId });
```

---

## Phase 6: Admin Routing & Notifications Hardening

### 6.1 Update `notify-ticket-admins` Edge Function

**File: `supabase/functions/notify-ticket-admins/index.ts`**

Add topic support and security hardening:

```typescript
interface NotifyRequest {
  type: "inquiry" | "feedback" | "reply" | "ticket_assigned";
  id?: string;
  threadType?: "inquiry" | "feedback";
  threadId?: string;
  module_id?: string | null;
  chapter_id?: string | null;
  topic_id?: string | null;  // NEW
  category?: string;
  subject?: string;
  replyBy?: string;
  assignedTo?: string;  // NEW: For assignment notifications
}

// Security: Validate JWT
const authHeader = req.headers.get("Authorization");
if (!authHeader?.startsWith("Bearer ")) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: corsHeaders,
  });
}

// Validate the token
const { data: { user }, error: authError } = await supabase.auth.getUser(
  authHeader.replace("Bearer ", "")
);
if (authError || !user) {
  return new Response(JSON.stringify({ error: "Invalid token" }), {
    status: 401,
    headers: corsHeaders,
  });
}

// Input validation
if (!["inquiry", "feedback", "reply", "ticket_assigned"].includes(body.type)) {
  return new Response(JSON.stringify({ error: "Invalid type" }), {
    status: 400,
    headers: corsHeaders,
  });
}

// UUID validation for IDs
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (body.id && !uuidRegex.test(body.id)) {
  return new Response(JSON.stringify({ error: "Invalid ID format" }), {
    status: 400,
    headers: corsHeaders,
  });
}

// Context resolution for topics
let topicName = "";
if (body.topic_id) {
  const { data: topicData } = await supabase
    .from("topics")
    .select("name, module_id")
    .eq("id", body.topic_id)
    .single();
  topicName = topicData?.name || "Unknown Topic";
  
  // Get module from topic if not provided
  if (!moduleId && topicData?.module_id) {
    moduleId = topicData.module_id;
    // Fetch module name...
  }
}

// Admin routing for topics
if (body.topic_id) {
  const { data: topicAdmins } = await supabase
    .from("topic_admins")
    .select("user_id")
    .eq("topic_id", body.topic_id);
  
  if (topicAdmins) {
    for (const ta of topicAdmins) {
      adminsToNotify.push({ userId: ta.user_id, level: "topic" });
    }
  }
}

// Build location context
const locationContext = topicName 
  ? `${moduleName} > ${topicName}`
  : chapterName 
    ? `${moduleName} > ${chapterName}`
    : moduleName || "General";
```

### 6.2 Add Assignment Notification Support

When `assigned_to_user_id` changes on inquiries or item_feedback:

```typescript
// Handle ticket_assigned type
if (body.type === "ticket_assigned" && body.assignedTo) {
  notificationType = "ticket_assigned";
  title = "Ticket Assigned to You";
  message = `You've been assigned a ${body.threadType || 'inquiry'} about ${locationContext}`;
  
  // Only notify the assignee
  filteredAdmins = [{ userId: body.assignedTo, level: "assigned" }];
}
```

### 6.3 Update Hooks to Trigger Assignment Notifications

**File: `src/hooks/useInquiries.ts`**

```typescript
export function useAssignInquiry() {
  return useMutation({
    mutationFn: async ({ id, userId, team }: { id: string; userId?: string; team: string }) => {
      const { error } = await supabase
        .from('inquiries')
        .update({ 
          assigned_to_user_id: userId || null,
          assigned_team: team,
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Trigger notification to assignee
      if (userId) {
        await supabase.functions.invoke('notify-ticket-admins', {
          body: {
            type: 'ticket_assigned',
            threadType: 'inquiry',
            threadId: id,
            assignedTo: userId,
          },
        });
      }
    },
  });
}
```

---

## Phase 7: RLS Verification

### 7.1 Verify Existing Policies

The current RLS policies need verification for topic-based content:

```sql
-- Verify topic admins can manage their topic content
-- For each content table (mcqs, essays, osce_questions, etc.):
SELECT * FROM pg_policies WHERE tablename = 'mcqs' AND policyname LIKE '%topic%';

-- Ensure policies check topic_id correctly
CREATE POLICY "Topic admins can manage their topic MCQs"
ON mcqs FOR ALL
USING (
  topic_id IN (
    SELECT topic_id FROM topic_admins WHERE user_id = auth.uid()
  )
  OR
  chapter_id IN (
    SELECT chapter_id FROM topic_admins WHERE user_id = auth.uid()
  )
);
```

### 7.2 Add Policies for New Columns

```sql
-- study_resources policy for topic_id
CREATE POLICY "Topic admins can manage topic study resources"
ON study_resources FOR ALL
USING (
  topic_id IN (
    SELECT topic_id FROM topic_admins WHERE user_id = auth.uid()
  )
);
```

---

## Implementation Order

### Step 1: Database Migration (Blocking)
1. Add `topic_id` to `study_resources`, `question_attempts`, `user_flashcard_stars`
2. Make `chapter_id` nullable in `study_resources`
3. Add CHECK constraint
4. Add indexes
5. Run data backfill migration

### Step 2: Type System
1. Create `src/types/content.ts` with `ContentContainerId`

### Step 3: Hook Updates
1. Update `useStudyResources.ts` - add topic support
2. Create `useContentProgress.ts` - unified progress
3. Update `useFlashcardStars.ts` - dual support
4. Update `useQuestionAttempts.ts` - topic support
5. Update `useFlashcardSettings.ts` - dual support

### Step 4: Component Updates
1. Update `FlashcardsTab.tsx` - add `topicId` prop
2. Update `StudyResourceFormModal.tsx` - add `topicId` prop
3. Update `StudyBulkUploadModal.tsx` - add `topicId` prop
4. Update `BulkSectionAssignment.tsx` - add `topicId` prop
5. Update `ClinicalCaseAdminList.tsx` - add `topicId` prop
6. Update `ClinicalToolsSection.tsx` - add `topicId` prop

### Step 5: Page Fixes
1. Fix all 15 `chapterId={topicId}` anti-patterns in `TopicDetailPage.tsx`
2. Add missing features (Progress bar, Mind Maps, etc.)
3. Add missing hooks and state

### Step 6: Edge Function Security
1. Add JWT validation to `notify-ticket-admins`
2. Add input validation
3. Add topic routing support
4. Add assignment notification support

### Step 7: Testing & Verification
1. Test Surgery chapter page - verify all controls
2. Test Pharmacology topic page - verify same controls
3. Create flashcard on topic - verify saves with `topic_id`
4. Complete MCQ on topic - verify progress updates
5. Test as topic admin - verify scoped access
6. Test as module admin - verify module-wide access
7. Test inquiry submission from topic - verify notifications

---

## Files to Create/Modify Summary

### New Files
| File | Purpose |
|------|---------|
| `src/types/content.ts` | ContentContainerId type |
| `src/hooks/useContentProgress.ts` | Unified progress hook |

### Database Migration
| Change | Description |
|--------|-------------|
| `study_resources.topic_id` | Add column, nullable FK |
| `study_resources.chapter_id` | Make nullable |
| `question_attempts.topic_id` | Add column |
| `user_flashcard_stars.topic_id` | Add column |
| Data backfill | Fix corrupted chapter_id values |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/TopicDetailPage.tsx` | Fix 15 anti-patterns, add missing features |
| `src/components/study/FlashcardsTab.tsx` | Add `topicId` prop |
| `src/components/study/StudyResourceFormModal.tsx` | Add `topicId` prop |
| `src/components/study/StudyBulkUploadModal.tsx` | Add `topicId` prop |
| `src/hooks/useStudyResources.ts` | Add topic hooks and mutations |
| `src/hooks/useFlashcardStars.ts` | Add dual support |
| `src/hooks/useFlashcardSettings.ts` | Add dual support |
| `src/hooks/useQuestionAttempts.ts` | Add topic support |
| `src/components/sections/BulkSectionAssignment.tsx` | Add `topicId` prop |
| `src/components/clinical-cases/ClinicalCaseAdminList.tsx` | Add `topicId` prop |
| `supabase/functions/notify-ticket-admins/index.ts` | Security + topic support |

---

## Final Verification Checklist

- [ ] Surgery chapter page shows all controls
- [ ] Pharmacology topic page shows identical controls
- [ ] Flashcards on topics save with `topic_id` (not `chapter_id`)
- [ ] Progress updates correctly on topic practice
- [ ] Topic inquiries notify topic admins + module admins + platform admins
- [ ] Assignment sends `ticket_assigned` notification
- [ ] Unauthorized Edge Function calls are rejected
- [ ] RLS correctly scopes topic admin access
- [ ] No console errors or TypeScript warnings

