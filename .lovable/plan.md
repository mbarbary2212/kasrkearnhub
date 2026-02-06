

# Plan: Fix Scrolling Issues Across the Application

## Problem Summary

The user experiences scroll "trapping" where:
1. Scrolling inside a nested frame/container doesn't propagate to the parent when reaching the boundary
2. They have to move the mouse outside a frame and scroll there for the page to scroll
3. This feels unnatural and gives the impression that scrolling is broken

## Root Cause Analysis

After investigating the codebase, I found **multiple sources of nested scroll contexts** that can trap scroll events:

### Issue 1: Nested ScrollArea + overflow-y-auto Combination
Several components use both `ScrollArea` (Radix UI) AND `overflow-y-auto` on parent containers, creating double scroll contexts:

| File | Problem |
|------|---------|
| `EssayDetailModal.tsx` | `ScrollArea` with `overflow-y-auto` class on the same element (line 162) |
| `ClinicalCaseStageFormModal.tsx` | `ScrollArea` with `overflow-y-auto` on same element (line 266) |
| `ClinicalCaseFormModal.tsx` | `ScrollArea` with `overflow-y-auto` (line 193) |

### Issue 2: DialogContent Global Scroll + Component-Level Scroll
The `dialog.tsx` component adds global `max-h-[90vh] overflow-y-auto overscroll-contain` to ALL dialogs (line 50). When modals also have their own ScrollArea inside, this creates nested scroll containers:

```
DialogContent (overflow-y-auto, overscroll-contain) ← TRAPS SCROLL
  └── ScrollArea (internal scroll) ← ALSO SCROLLS
```

The `overscroll-contain` prevents scroll events from propagating to the parent when the inner element reaches its boundary.

### Issue 3: SheetContent Missing Scroll Handling
`sheet.tsx` doesn't have consistent scroll handling for long content, causing some sheets to overflow or trap scroll.

### Issue 4: Individual Modal Scroll Patterns
Many modals apply `max-h-[90vh] overflow-y-auto` directly to DialogContent, then add another `overflow-y-auto` div inside:

```typescript
// McqList.tsx line 882
<DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
  <div className="flex-1 overflow-y-auto space-y-4">  ← Nested scroll
```

This is actually correct (using `overflow-hidden` on parent), but inconsistent across the app.

---

## Solution Architecture

### Strategy: Establish a Clear Scroll Hierarchy

1. **Dialog/Sheet containers** → Fixed position, constrained height, NO scroll
2. **Content wrapper inside** → Single scrollable area with proper overscroll behavior
3. **Nested content** → No additional scroll containers unless explicitly needed (like code previews)

---

## Implementation Plan

### Step 1: Update DialogContent Base Component

**File: `src/components/ui/dialog.tsx`**

Remove the global `overflow-y-auto overscroll-contain` from DialogContent base and instead use `overflow-hidden`:

```typescript
// Before (line 48-52)
"max-h-[90vh] overflow-y-auto overscroll-contain",
"[&]:touch-action-pan-y [-webkit-overflow-scrolling:touch]",

// After
"max-h-[90vh] overflow-hidden",  // Container holds shape, doesn't scroll
```

This forces each modal to explicitly add a single scroll wrapper inside, preventing nested scrolls.

### Step 2: Update ScrollArea Component

**File: `src/components/ui/scroll-area.tsx`**

Add `overscroll-contain` to prevent scroll chaining in the correct place:

```typescript
// Line 14 - update Viewport
<ScrollAreaPrimitive.Viewport 
  className="h-full w-full rounded-[inherit] overscroll-contain [-webkit-overflow-scrolling:touch]"
>
```

This is already correct! The issue is that ScrollArea is being combined with external `overflow-y-auto`.

### Step 3: Fix Modals with Double Scroll

Update these files to use consistent pattern: `overflow-hidden` on DialogContent, single ScrollArea or `overflow-y-auto` inside.

**Files to update:**

| File | Current Issue | Fix |
|------|---------------|-----|
| `EssayDetailModal.tsx` | ScrollArea + overflow-y-auto | Remove `overflow-y-auto` from ScrollArea element |
| `ClinicalCaseFormModal.tsx` | ScrollArea + overflow-y-auto | Remove `overflow-y-auto` from ScrollArea |
| `ClinicalCaseStageFormModal.tsx` | ScrollArea + overflow-y-auto | Remove `overflow-y-auto` from ScrollArea |
| `GuidedExplanationList.tsx` | DialogContent overflow-y-auto | Use overflow-hidden on DialogContent |
| `OsceAnalyticsDashboard.tsx` | DialogContent overflow-y-auto | Use overflow-hidden + inner scroll |

### Step 4: Establish Consistent Modal Pattern

Create a standard pattern for all modals:

```typescript
// CORRECT PATTERN
<DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
  <DialogHeader className="flex-shrink-0">
    {/* Header - always visible */}
  </DialogHeader>
  
  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
    {/* Scrollable content */}
  </div>
  
  <DialogFooter className="flex-shrink-0">
    {/* Footer - always visible */}
  </DialogFooter>
</DialogContent>
```

Or using ScrollArea:

```typescript
<DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
  <DialogHeader className="flex-shrink-0">{/* ... */}</DialogHeader>
  
  <ScrollArea className="flex-1 min-h-0">
    {/* Content */}
  </ScrollArea>
  
  <DialogFooter className="flex-shrink-0">{/* ... */}</DialogFooter>
</DialogContent>
```

### Step 5: Fix Sheet Components

**File: `src/components/ui/sheet.tsx`**

Add proper scroll handling for sheet content:

```typescript
// Update SheetContent (around line 58)
<SheetPrimitive.Content 
  ref={ref} 
  className={cn(
    sheetVariants({ side }), 
    "flex flex-col overflow-hidden",  // Add overflow-hidden
    className
  )} 
  {...props}
>
```

### Step 6: Update Coach Panel Sheet

**File: `src/components/coach/AskCoachPanel.tsx`**

The coach panel uses ScrollArea correctly inside SheetContent, but ensure the SheetContent itself uses `overflow-hidden`:

```typescript
<SheetContent 
  side={isMobile ? "bottom" : "right"} 
  className={`flex flex-col p-0 overflow-hidden ${...}`}  // Add overflow-hidden
>
```

### Step 7: Add Global CSS Utility

**File: `src/index.css`**

Add a utility class for consistent modal scrolling:

```css
@layer utilities {
  /* Single scroll container pattern */
  .scroll-container {
    @apply overflow-y-auto overscroll-contain;
    -webkit-overflow-scrolling: touch;
  }
}
```

---

## Files to Modify

| File | Change Type |
|------|-------------|
| `src/components/ui/dialog.tsx` | Change from `overflow-y-auto` to `overflow-hidden` on DialogContent |
| `src/components/ui/sheet.tsx` | Add `overflow-hidden` to SheetContent |
| `src/index.css` | Add `.scroll-container` utility class |
| `src/components/content/EssayDetailModal.tsx` | Remove duplicate `overflow-y-auto` from ScrollArea |
| `src/components/clinical-cases/ClinicalCaseFormModal.tsx` | Remove duplicate overflow |
| `src/components/clinical-cases/ClinicalCaseStageFormModal.tsx` | Remove duplicate overflow |
| `src/components/study/GuidedExplanationList.tsx` | Fix modal scroll pattern |
| `src/components/analytics/OsceAnalyticsDashboard.tsx` | Fix modal scroll pattern |
| `src/components/coach/AskCoachPanel.tsx` | Ensure overflow-hidden on SheetContent |
| `src/components/dashboard/HeaderBadgesPanel.tsx` | Add overflow handling if content is long |

---

## Testing Checklist

After implementation, verify these scenarios:

1. **Topic/Chapter pages**: Scroll down through MCQ list, verify page scrolls when reaching content end
2. **Essay modal**: Open essay detail, scroll through content, verify it doesn't trap when reaching top/bottom
3. **Bulk upload modals**: Scroll through preview list, verify smooth scroll behavior
4. **Coach panel**: Open coach panel, scroll chat messages, verify doesn't trap
5. **Mobile**: Test on mobile viewport - swipe/scroll should feel natural
6. **Flashcard slideshow**: Navigate through flashcards, verify no scroll trapping

---

## Technical Notes

### Why `overscroll-contain` matters
- It prevents scroll events from "chaining" to parent elements when reaching the boundary
- Should be applied to the **innermost** scroll container only
- When applied to multiple nested containers, it creates scroll traps

### The `min-h-0` trick
- In flexbox, children with `flex-1` need `min-h-0` to allow shrinking below content size
- Without it, the `overflow-y-auto` won't activate properly

### ScrollArea vs native scroll
- `ScrollArea` provides custom scrollbar styling but adds complexity
- For simple cases, native `overflow-y-auto` is sufficient and less prone to issues
- Reserve `ScrollArea` for cases where custom scrollbar appearance is needed

