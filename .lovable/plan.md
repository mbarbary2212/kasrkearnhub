

# Add Penalty Warning to Investigation Sections

The scoring logic already deducts 1 point per unnecessary test/imaging ordered (floor of 0). Students need a visible warning so they don't just check everything.

## Changes

### 1. `InvestigationsLabsSection.tsx` (line 53-55)
Replace the description paragraph with:
```
Select the lab investigations you would order for this patient.
⚠️ Choose carefully — unnecessary tests will reduce your score.
```
The warning line styled with `text-amber-600 font-medium text-xs`.

### 2. `InvestigationsImagingSection.tsx` (line 54-55)
Same pattern:
```
Select the imaging studies you would order.
⚠️ Choose carefully — unnecessary imaging will reduce your score.
```

Two small text additions, no logic changes needed.

