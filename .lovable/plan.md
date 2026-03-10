

# Issue: Case Editor Voice Dropdown Only Shows Voices Matching Patient Gender

## What's Happening

The case editor's "Voice Character" dropdown filters voices by the patient's gender. On line 110 of `CasePreviewEditor.tsx`:

```
const patientGender = (editedData?.patient?.gender === 'female' ? 'female' : 'male');
const { data: ttsVoices } = useTTSVoices(patientGender);
```

So if the patient is male, only male voices (7) are shown. Female voices (3) are hidden. This is why you only see male voices in the case editor for male patients.

The **Admin panel** also only shows one gender at a time (whichever toggle is active), but that's intentional since it has the Male/Female toggle buttons.

## Proposed Fix

**Remove the gender filter from the case editor's voice dropdown** so all 10 voices (male + female) appear, grouped by gender for clarity.

### Changes

1. **`CasePreviewEditor.tsx`** -- Call `useTTSVoices()` without a gender filter, then group voices by gender in the dropdown with labeled sections (e.g., "Male Voices" / "Female Voices").

2. **Admin panel** stays as-is since the gender toggle there is intentional (setting the global default per gender).

This way, when editing a case, you can pick any voice regardless of patient gender -- for example, using a female voice for a male patient if the character calls for it.

