

## Add Visual Rubric Editor with AI Generation + Difficulty Selector for Essays

### Overview
Enhance the essay edit dialog in `ContentItemActions.tsx` with three new capabilities:
1. A visual rubric editor so admins can view/edit the `rubric_json` structure without touching raw JSON
2. An "AI Generate Rubric" button that calls the AI to auto-generate rubric concepts from the question text and model answer
3. A difficulty selector (Beginner / Intermediate / Advanced) for each essay question

### Database Change

Add a `difficulty_level` column to the `essays` table:
```sql
ALTER TABLE public.essays
ADD COLUMN difficulty_level text DEFAULT NULL;
```
No RLS changes needed -- existing policies already cover essays.

### New Edge Function: `generate-essay-rubric`

A small edge function that takes the essay question + model answer and returns a `VPRubric`-shaped JSON object. It will:
- Use the existing `_shared/ai-provider.ts` to call the AI gateway
- Validate the JWT
- Accept `{ question, model_answer, keywords }` in the body
- Return `{ required_concepts, optional_concepts, pass_threshold, acceptable_phrases, critical_omissions }`

### UI Changes in `ContentItemActions.tsx`

Inside the essay edit dialog (the scrollable area), add these new sections after the Keywords field:

**1. Difficulty Selector**
A dropdown with options: Beginner, Intermediate, Advanced. Saved to the new `difficulty_level` column.

**2. Rubric Editor (collapsible)**
An accordion/collapsible section titled "Marking Rubric" with:
- **Required Concepts**: A textarea where each line is a required concept. These are the concepts the student MUST mention.
- **Optional Concepts**: A textarea for bonus concepts.
- **Critical Omissions**: A textarea for concepts that, if missing, cause automatic failure.
- **Pass Threshold**: A slider (0-100%) showing the percentage of required concepts needed to pass. Default 60%.
- **Acceptable Phrases**: A simple key-value display showing synonym mappings (read-only for now, editable in future).

**3. "Generate Rubric with AI" Button**
- Placed at the top of the rubric section
- When clicked, calls the `generate-essay-rubric` edge function
- Shows a loading spinner while generating
- On success, populates the rubric fields (required concepts, optional concepts, etc.)
- Admin can then review and edit before saving

### Props / Interface Updates

**`ContentItemActionsProps`**: Add `difficultyLevel?: string | null`

**`Essay` interface in `EssayList.tsx`**: Add `difficulty_level?: string | null`, `question_type?: string | null`, `rubric_json?: unknown | null`

**`EssayList.tsx`**: Pass `difficultyLevel`, `questionType`, `rubricJson` to `ContentItemActions`

### Save Logic

When saving, include:
- `difficulty_level` in the update payload
- `rubric_json` as a JSON object built from the visual editor fields
- `question_type` (keep existing)

### Files to Create/Modify

| File | Action |
|---|---|
| `supabase/functions/generate-essay-rubric/index.ts` | **Create** -- AI rubric generation endpoint |
| `supabase/config.toml` | **Edit** -- Add function entry with `verify_jwt = false` |
| `src/components/admin/ContentItemActions.tsx` | **Edit** -- Add difficulty selector, rubric editor UI, AI generate button |
| `src/components/content/EssayList.tsx` | **Edit** -- Pass new props (difficulty_level, rubric_json, question_type) |
| `src/components/content/EssaysAdminTable.tsx` | **Edit** -- Add difficulty column |
| Migration | **Create** -- Add `difficulty_level` column to essays |

### Technical Details

**Rubric state management in ContentItemActions:**
```typescript
const [editDifficulty, setEditDifficulty] = useState<string>(difficultyLevel || '');
const [editRequiredConcepts, setEditRequiredConcepts] = useState<string>('');
const [editOptionalConcepts, setEditOptionalConcepts] = useState<string>('');
const [editCriticalOmissions, setEditCriticalOmissions] = useState<string>('');
const [editPassThreshold, setEditPassThreshold] = useState<number>(60);
const [isGeneratingRubric, setIsGeneratingRubric] = useState(false);
```

On `handleOpenEdit`, parse `rubricJson` (if present) into the individual fields. On save, rebuild the `rubric_json` object from the fields.

**AI Rubric Generation prompt (edge function):**
The system prompt instructs the AI to analyze the question and model answer, then extract structured rubric data using tool calling to ensure valid JSON output.

