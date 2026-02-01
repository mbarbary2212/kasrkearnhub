
# Personal Study Coach - UI Cleanup + Gemini Guardrails + User Messages

## Overview

This plan addresses four main areas:
1. Remove the floating Coach FAB from all users
2. Unify the two student coach entry points to use the same backend
3. Switch coach to Gemini with strict server-side limitations (quota for students only, RAG-first, security)
4. Implement exact user-facing messages for error states

---

## Current State Analysis

### Entry Points for Coach
Currently there are multiple coach-related components and endpoints:

| Component | Location | Purpose |
|-----------|----------|---------|
| `CoachFAB` | Bottom-right floating button | Navigates to /progress (students) or /admin (admins) |
| `AskCoachButton` | Chapter pages, dashboard | Opens `AskCoachPanel` sheet |
| `AskCoachPanel` | Global sheet component | Chat interface using `coach-chat` endpoint |
| `TutorPage` | `/tutor` route (appears unused) | Standalone tutor using `chat-with-moderation` |

### Backend Endpoints
| Endpoint | Purpose | Provider |
|----------|---------|----------|
| `coach-chat` | Study Coach with context | Lovable AI Gateway |
| `chat-with-moderation` | General tutor with OpenAI moderation | Lovable AI Gateway |
| `med-tutor-chat` | Original tutor (unused) | Lovable AI Gateway |

---

## Implementation Plan

### Phase 1: Remove Floating Coach FAB

**Goal**: Remove the floating Coach icon from all roles while keeping existing access points.

**Files to Modify**:

1. **`src/components/layout/MainLayout.tsx`**
   - Remove `CoachFAB` import
   - Remove `<CoachFAB />` component from JSX

2. **`src/components/coach/index.ts`**
   - Remove `CoachFAB` export (cleanup)

3. **`src/components/coach/CoachFAB.tsx`**
   - Delete this file entirely (no longer needed)

**Access Points Preserved**:
- Students: Avatar menu -> "Study Coach" link
- Students: Chapter page -> "Ask Coach" button
- Admins: Avatar menu only (no floating icon, unlimited usage)

---

### Phase 2: Unify Student Coach Entry Points

**Goal**: Ensure both coach entry points use the same backend with identical quota/logging for students.

**Current State**:
- Both `AskCoachPanel` (sheet from chapters) and Avatar menu access already use the same `coach-chat` endpoint
- The `TutorPage` uses `chat-with-moderation` - this is a separate feature

**Changes Required**:

1. **`src/components/coach/AskCoachPanel.tsx`**
   - Update to call the new unified `coach-chat` endpoint (already does)
   - Add handling for new error states (disabled, quota, no RAG results)

2. **`supabase/functions/coach-chat/index.ts`**
   - Major rewrite to add all security features (see Phase 3)

---

### Phase 3: Database Additions

**New Table: `coach_usage`** - Track daily coach usage per student

```text
CREATE TABLE coach_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_date DATE NOT NULL DEFAULT CURRENT_DATE,
  question_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, question_date)
);

ALTER TABLE coach_usage ENABLE ROW LEVEL SECURITY;

-- Users can read their own usage
CREATE POLICY "Users can read own usage" ON coach_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all
CREATE POLICY "Service role full access" ON coach_usage
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_coach_usage_user_date ON coach_usage(user_id, question_date);
```

**New `ai_settings` Keys** (add to existing table):

| Key | Default Value | Description |
|-----|---------------|-------------|
| `study_coach_enabled` | `true` | Enable/disable Study Coach feature |
| `study_coach_daily_limit` | `5` | Daily question limit per student (admins unlimited) |
| `study_coach_disabled_message` | Custom message | Message when coach is disabled |
| `study_coach_provider` | `"lovable"` | AI provider: "lovable" or "gemini" |
| `study_coach_model` | `"google/gemini-3-flash-preview"` | Model for study coach |

---

### Phase 4: Edge Function Updates

**`supabase/functions/coach-chat/index.ts`** - Complete Rewrite

New features to implement:

1. **JWT + Access Control**
   - Require valid JWT
   - Extract user_id from JWT
   - Query `user_roles` table to determine role

2. **Role-Based Quota Logic**
   ```text
   Admin roles (unlimited): super_admin, platform_admin, department_admin, admin, teacher, topic_admin
   Student roles (5/day limit): student (or no role)
   ```

3. **Coach Enabled Check**
   - Query `ai_settings` for `study_coach_enabled`
   - Return structured error if disabled (affects all users)

4. **Daily Quota Enforcement (Students Only)**
   - Query `coach_usage` for today's count
   - If student AND count >= limit, return structured error
   - Admins bypass this check entirely
   - Increment count on successful response (students only)

5. **Prompt Injection Defense**
   - Import from `_shared/security.ts`
   - Scan user message before processing

6. **RAG-First Requirement** (Foundation Only)
   - For now: Add system prompt requiring coach to stay on-curriculum
   - Future: Actual RAG retrieval from uploaded PDFs
   - If no context available, return structured "not found" error

7. **Dual Provider Support**
   - Import from `_shared/ai-provider.ts`
   - Use `study_coach_provider` setting
   - Use `x-goog-api-key` header for Gemini (already in ai-provider.ts)

8. **Structured Error Responses**
   - Return JSON with `status`, `code`, `title`, `message`, `action_url`

**Response Format**:

```text
// Success: Stream response
// Error: JSON with structure
{
  "status": "error",
  "code": "COACH_DISABLED" | "QUOTA_EXCEEDED" | "RAG_NO_RESULTS" | "INJECTION_DETECTED",
  "title": "string",
  "message": "string",
  "action_url": "/admin/inbox",
  "action_label": "Open Feedback & Inquiries"
}
```

---

### Phase 5: Frontend Error Handling

**`src/components/coach/AskCoachPanel.tsx`** - Add Error States

New UI states to handle:

**A) Coach Disabled (all users)**
```text
Title: "Coach is temporarily unavailable"
Body: "The study coach is currently disabled by the course administrators 
       due to usage limits. Please use your course materials and send 
       questions via Feedback & Inquiries."
Action: Button -> Navigate to /admin/inbox (Feedback & Inquiries)
```

**B) Daily Limit Reached (students only)**
```text
Title: "Daily question limit reached"
Body: "You have used all 5 coach questions for today. Please try again 
       tomorrow, or send your question to the moderators."
Actions: 
  - "Open Feedback & Inquiries" -> /admin/inbox
  - "Try again tomorrow" -> Close panel
```

**C) RAG Can't Find Answer**
```text
Title: "Not found in course materials"
Body: "I couldn't find this answer in the uploaded course resources. 
       Please select a chapter/section or paste the relevant paragraph, 
       or send your question to the moderators."
Actions:
  - "Open Feedback & Inquiries" -> /admin/inbox
  - Optional: "Choose chapter/section" -> Chapter picker
```

**Implementation**:
- Create `CoachErrorState` component for consistent error UI
- Handle error codes from backend in `streamChat` function
- Show appropriate error UI instead of chat

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| Migration SQL | Add `coach_usage` table + new ai_settings keys |

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/layout/MainLayout.tsx` | Remove CoachFAB import and usage |
| `src/components/coach/index.ts` | Remove CoachFAB export |
| `src/components/coach/AskCoachPanel.tsx` | Add error state handling UI |
| `supabase/functions/coach-chat/index.ts` | Complete rewrite with quota, security, RAG-first |
| `supabase/config.toml` | Update coach-chat config if needed |

### Files to Delete
| File | Reason |
|------|--------|
| `src/components/coach/CoachFAB.tsx` | Floating icon removed per requirements |

---

## Technical Details

### Role-Based Access Summary

| Role | Coach Access | Daily Limit | Quota Tracked |
|------|--------------|-------------|---------------|
| `super_admin` | Unlimited | None | No |
| `platform_admin` | Unlimited | None | No |
| `department_admin` | Unlimited | None | No |
| `admin` | Unlimited | None | No |
| `teacher` | Unlimited | None | No |
| `topic_admin` | Unlimited | None | No |
| `student` | Limited | 5/day | Yes |

### Error Codes and Messages

| Code | HTTP Status | Title | Message | Affects |
|------|-------------|-------|---------|---------|
| `COACH_DISABLED` | 503 | Coach is temporarily unavailable | The study coach is currently disabled by the course administrators due to usage limits. Please use your course materials and send questions via Feedback & Inquiries. | All users |
| `QUOTA_EXCEEDED` | 429 | Daily question limit reached | You have used all 5 coach questions for today. Please try again tomorrow, or send your question to the moderators. | Students only |
| `RAG_NO_RESULTS` | 422 | Not found in course materials | I couldn't find this answer in the uploaded course resources. Please select a chapter/section or paste the relevant paragraph, or send your question to the moderators. | All users |
| `INJECTION_DETECTED` | 400 | Invalid request | I cannot process this request. Please rephrase your question in an academic context. | All users |

### Quota Logic (Edge Function)

```text
1. Validate JWT and extract user_id
2. Query user_roles to determine role
3. Check if study_coach_enabled = true (abort if false)
4. If role is in admin_roles:
   - Skip quota check, proceed to AI
5. Else (student):
   - Get current date (UTC)
   - Query coach_usage WHERE user_id = ? AND question_date = TODAY
   - If count >= limit:
     - Return QUOTA_EXCEEDED error
6. Process AI request with security checks
7. If successful AND student:
   - UPSERT coach_usage: increment count or insert new row
```

### Security Layers

1. **JWT Validation**: Required for all requests
2. **Role Check**: Determines admin vs student for quota
3. **Prompt Injection Detection**: Using shared security.ts
4. **Trust Boundary in Prompt**: User message wrapped with delimiters
5. **RAG Confinement**: System prompt requires staying on-curriculum
6. **Gemini Key Security**: Using X-goog-api-key header (already in ai-provider.ts)

---

## Implementation Order

1. **Database migration** - Add coach_usage table + ai_settings keys
2. **Remove CoachFAB** - Delete component and remove from MainLayout
3. **Update coach-chat Edge Function** - Add role-based quota, security features
4. **Update AskCoachPanel** - Add error state handling
5. **Test end-to-end** - Verify admin unlimited access, student quota enforcement
6. **Deploy and verify** - Test with both admin and student accounts

---

## Scope Clarification (Confirmed)

The Personal Study Coach is a separate feature from the AI Content Factory:
- **Independent AI provider configuration** (via `study_coach_provider` setting)
- **Independent quota controls** (via `study_coach_daily_limit`, students only)
- **Role-aware limits** (admins unlimited, students limited)
- **RAG-first approach** (confined to in-app content only)
- **Budget/billing control** (Super Admin can disable for all users)

Future enhancements (not in this plan):
- Actual vector-based RAG from uploaded PDFs
- Per-user quota customization
- Usage analytics dashboard
