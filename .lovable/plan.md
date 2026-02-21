

## Add Chapter Icons for Arterial & Venous Disorders

### Overview

Add the ability for chapters to have optional icon images, then set the arteries and veins images as icons for Chapter 14 (Arterial Disorders) and Chapter 15 (Venous Disorders) in Book 3 of module SUR-523.

### Steps

**1. Database: Add `icon_url` column to `module_chapters`**

Create a migration adding a nullable `icon_url` text column:

```sql
ALTER TABLE module_chapters ADD COLUMN icon_url text;
```

**2. Copy images to project assets**

- Copy `Untitled_design.png` (arteries) to `src/assets/chapters/arteries-icon.png`
- Copy `Untitled_design_1.png` (veins) to `src/assets/chapters/veins-icon.png`

**3. Upload images to Supabase storage and set URLs**

- Create a `chapter-icons` storage bucket (public)
- Upload both images
- Update the two chapter rows with their public URLs:
  - Chapter `7348593f-...` (Arterial Disorders) -- arteries icon
  - Chapter `2120e28f-...` (Venous Disorders) -- veins icon

**4. Update TypeScript types**

Add `icon_url: string | null` to the `ModuleChapter` interface in `src/hooks/useChapters.ts`.

**5. Update chapter list UI (`ModuleLearningTab.tsx`)**

Where chapters are rendered in the list, show the icon if `chapter.icon_url` exists:

```tsx
<button onClick={() => navigate(...)}>
  {chapter.icon_url ? (
    <img 
      src={chapter.icon_url} 
      alt="" 
      className="w-9 h-9 rounded-lg object-cover flex-shrink-0" 
    />
  ) : (
    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded min-w-[2.5rem] text-center">
      {index + 1}
    </span>
  )}
  <span className="flex-1 text-[15px] font-medium truncate">
    {chapter.title}
  </span>
</button>
```

**6. Update chapter header (`ChapterPage.tsx`)**

Show the icon beside the chapter title in the header area if available.

### What changes

- **Database**: One new nullable column on `module_chapters`
- **Storage**: New `chapter-icons` public bucket with 2 images
- **Files modified**: `useChapters.ts` (type), `ModuleLearningTab.tsx` (list icons), `ChapterPage.tsx` (header icon)
- **Files created**: Migration file
- **No breaking changes** -- the column is nullable, so all other chapters continue displaying normally with the number badge

