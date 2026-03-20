

## Plan: Fix Build Errors + Create useAdminData Hook

### Context
There are 4 TypeScript build errors (Badge import missing in RealtimeAnalyticsTab) plus the previously identified edge function errors, and a new hook to create.

### 1. Create `src/hooks/useAdminData.ts` (new file)
Create with the exact code previously provided by the user — a `useQuery`-based hook that fetches profiles, roles, department assignments, module assignments, departments, years, and modules in parallel via `Promise.all`.

### 2. Fix `src/components/admin/RealtimeAnalyticsTab.tsx` (Badge import)
The last diff removed the `Badge` import but `Badge` is still used on lines 159 and 163.

**Line 1-2** — add back the Badge import:
```typescript
import { Users, User, Monitor, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
```

### 3. Fix `supabase/functions/gemini-tts/index.ts` (2 fixes)

**Line 84** — non-null assertion (guarded by early return above):
```typescript
'X-Goog-Api-Key': GEMINI_API_KEY!,
```

**Line 114** — cast unknown err:
```typescript
if ((err as Error).name === 'AbortError') {
```

### 4. Fix `supabase/functions/med-tutor-chat/index.ts` (2 fixes)

**Line 38** — change parameter type to `any`:
```typescript
async function getGlobalAISettings(serviceClient: any): Promise<{ provider: 'lovable' | 'gemini'; model: string }> {
```

**Lines 48-49** — cast data array:
```typescript
for (const row of (data as { key: string; value: string }[])) {
```

### Files Changed
- `src/hooks/useAdminData.ts` — new file
- `src/components/admin/RealtimeAnalyticsTab.tsx` — 1 line (add Badge import)
- `supabase/functions/gemini-tts/index.ts` — 2 line fixes
- `supabase/functions/med-tutor-chat/index.ts` — 2 line fixes

