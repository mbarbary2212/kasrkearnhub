

## Root Cause

`ChapterPage` initializes `activeSection` with a hardcoded `'resources'` default and **never reads the `?section=interactive` query parameter** from the URL. So when `VirtualPatientPage` navigates to `/module/.../chapter/...?section=interactive`, the chapter page ignores the query param and always opens on the Resources tab.

## Fix

**File: `src/pages/ChapterPage.tsx`**

1. Import `useSearchParams` (or use `useLocation`) from `react-router-dom`
2. Read the `section` query param on mount
3. Use it as the initial value for `activeSection` state (falling back to `'resources'`)

```typescript
const [searchParams] = useSearchParams();
const initialSection = (searchParams.get('section') as SectionMode) || 'resources';
const [activeSection, setActiveSection] = useState<SectionMode>(initialSection);
```

This is a ~3-line change in one file. The `VirtualPatientPage` already sends `?section=interactive` correctly -- it just wasn't being consumed.

