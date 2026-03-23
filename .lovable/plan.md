

## Cross-List MED-422 & SUR-423 in Year 5 — Seamless UI

### Approach

On the Year 5 page, fetch MED-422 and SUR-423 by ID and prepend them to the module list so they appear naturally before the 500-level modules. No "shared" labels, no separate sections — students see a single unified list. On Year 4, add a small subtle note under those two modules.

### Changes

**1. `src/hooks/useModules.ts`** — Add `useModulesByIds(ids: string[])` hook
- Simple query: `supabase.from('modules').select('*').in('id', ids)`

**2. `src/pages/YearPage.tsx`**
- For Year 5: import `useModulesByIds`, fetch the two modules, merge them at the top of the modules array before rendering (cross-listed first, then regular Year 5 modules). The list renders as one unified block — no visual distinction.
- For Year 4: when rendering MED-422 or SUR-423, add a small muted italic line below the module name: *"Also available in Year 5 this year"*
- Module IDs:
  - MED-422: `a6c13735-4299-4c40-8a41-500c6edcf723`
  - SUR-423: `153318ba-32b9-4f8e-9cbc-bdd8df9b9b10`

No database changes. Progress tracking works automatically since it's keyed by module ID. Easy to remove next year — just delete the hook call and merge logic.

