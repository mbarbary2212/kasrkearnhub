

# Redesign PDF Library: Table View with Year/Module Grouping

## Problem
The current card-based layout shows all PDFs in a flat grid — overwhelming for super admins and platform admins who see every document across all modules. No clear organizational hierarchy.

## Solution
Replace the card grid with a **table view** that groups documents by **Year → Module** in collapsible folder-like sections. Documents sorted alphabetically within each group.

## Design

```text
┌─────────────────────────────────────────────────────────────┐
│ 📁 Year 1                                            [▾]   │
│ ├── 📁 MOD-101: Anatomy                             [▾]   │
│ │   ┌──────────────────────────────────────────────────┐   │
│ │   │ Title          │ Chapter │ Type  │ Size │ Actions│   │
│ │   │ Anatomy Ch1... │ Upper.. │ Ch PDF│ 2.1MB│ ⬇ 👁 🗑│   │
│ │   │ Anatomy Ch2... │ Lower.. │ Ch PDF│ 3.4MB│ ⬇ 👁 🗑│   │
│ │   └──────────────────────────────────────────────────┘   │
│ ├── 📁 MOD-102: Physiology                          [▸]   │
│                                                             │
│ 📁 Year 2                                            [▸]   │
│ 📁 Unlinked Documents                                [▸]   │
└─────────────────────────────────────────────────────────────┘
```

## Changes

### 1. New component: `PDFLibraryTableView.tsx`
- Receives documents, years, and modules as props
- Groups documents: `Year → Module → alphabetically sorted docs`
- Documents without a module go into an "Unlinked Documents" section at the bottom
- Each year is a collapsible section (Collapsible from shadcn)
- Each module within a year is a collapsible sub-section
- Shows document count badges on folder headers
- Table columns: Title, Chapter, Type, Size, Date, Actions (Preview, Download, AI Source, Delete as icon buttons)
- Compact row design — no cards

### 2. Modify `PDFLibraryTab.tsx`
- Replace the card grid rendering with `<PDFLibraryTableView>`
- Keep existing filters (search, module, doc type) — they filter the data before grouping
- Keep the Upload modal and AI factory modals unchanged
- Pass years and modules data for grouping
- The query already joins module data (including `module.name`) — also need `year_id` from the module to group by year

### 3. Update `useAdminDocuments` hook
- Expand the module select to include `year_id`: `module:modules(id, name, slug, year_id)`
- This lets the table view group by year without an extra query

## Files Modified

| File | Change |
|------|--------|
| `src/components/admin/PDFLibraryTableView.tsx` | **New** — grouped table view component |
| `src/components/admin/PDFLibraryTab.tsx` | Replace card grid with table view, pass years/modules |
| `src/hooks/useAdminDocuments.ts` | Add `year_id` to module select join |

