

## Plan: Bulk Convert Card Type (Classic ↔ Cloze)

### Problem
You uploaded cloze flashcards into a classic cards interface. Currently, changing card type requires editing one card at a time.

### Solution
Add a **"Change Type"** bulk action button next to the existing bulk Delete and Assign Section buttons in `FlashcardsTab.tsx`. When selected cards are chosen, the button lets you convert them between Classic and Cloze format.

### How it works

1. Select multiple cards using the existing checkboxes
2. Click new **"Convert to Cloze"** or **"Convert to Classic"** button
3. A confirmation dialog shows how many cards will be converted
4. On confirm, each selected card's `content` JSON is updated:
   - **Classic → Cloze**: Sets `card_type: 'cloze'`, moves `front` text to `cloze_text` field
   - **Cloze → Classic**: Sets `card_type: 'normal'`, clears `cloze_text`

### Files to change

**1. `src/components/study/FlashcardsTab.tsx`**
- Add a dropdown or two buttons in the bulk actions bar (where Delete and Assign Section already are)
- Options: "Convert to Cloze" / "Convert to Classic"
- On click, open confirmation dialog, then call mutation

**2. `src/hooks/useStudyResources.ts`**
- Add a `useBulkConvertCardType` mutation that:
  - Fetches selected cards
  - Updates each card's `content` JSON with the new `card_type`
  - Uses individual `.update()` calls (content is JSONB, no batch update for JSON fields)
  - Invalidates query cache on success

### UI placement
The button appears in the existing bulk actions toolbar (visible when cards are selected), between "Assign Section" and "Delete".

