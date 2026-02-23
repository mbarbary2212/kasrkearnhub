

## Fix Essay Bulk Upload: Accept Text Ratings + Add Default Marking Selector

### Problem
1. The CSV `rating` column contains text labels like "Intermediate", "Advanced", "Beginner" but the parser only accepts numbers 5-20, causing every row to fail with "Rating must be between 5 and 20".
2. Even when parsed correctly, the insert logic (line 583-594) drops `rating`, `max_points`, `question_type`, and `rubric_json` -- they are never sent to the database.
3. There is no way for the admin to set a default marking value (5-20) for the batch.

### Solution

All changes in **`src/components/admin/AdminContentActions.tsx`**:

#### 1. Fix the rating parser (lines 231-240)
- If `rating` is a recognized text label ("beginner", "intermediate", "advanced", "easy", "medium", "hard"), silently ignore it for the numeric field (no error).
- If it is a number, validate 5-20 as before.
- Non-numeric, unrecognized strings: skip silently (no error).

#### 2. Add a "Default Marking" dropdown (between line 865-866)
- New state: `const [defaultMarking, setDefaultMarking] = useState<number>(10)`
- A `Select` dropdown with values 5 through 20, placed between the `SectionWarningBanner` and the CSV format block.
- Label: "Default Marking (out of):" with the dropdown beside it.

#### 3. Fix the insert to include all parsed fields (lines 583-594)
Currently the insert maps only `title`, `question`, `model_answer`, `module_id`, `chapter_id`, `topic_id`, `section_id`, and `original_section_name`. Update it to also include:
- `rating`: use row value if present, otherwise use `defaultMarking`
- `max_points`: use row value if present, otherwise use `defaultMarking`
- `question_type`: pass through if present
- `rubric_json`: pass through if present
- `keywords`: pass through if present

#### 4. Update CSV format hint (line 868)
Mention that `rating` can be a text difficulty label or a number (5-20), and that the admin-selected default marking applies when no numeric value is provided.

### Technical Details

**Rating parser change:**
```
// If rating is text (e.g. "Intermediate"), skip silently
// If rating is a number outside 5-20, show error
// If rating is a number 5-20, use it
```

**Default marking dropdown:**
```
<div className="flex items-center gap-3">
  <label>Default Marking (out of):</label>
  <Select value={String(defaultMarking)} onValueChange={v => setDefaultMarking(Number(v))}>
    {/* Options 5 through 20 */}
  </Select>
</div>
```

**Insert logic fix:**
```typescript
valid.map(essay => ({
  title: essay.title,
  question: essay.question,
  model_answer: essay.model_answer || null,
  module_id: moduleId,
  chapter_id: chapterId || null,
  topic_id: topicId || null,
  ...(essay.section_id ? { section_id: essay.section_id } : {}),
  original_section_name: sectionNameMap.get(essay.title) || null,
  rating: essay.rating ?? defaultMarking,
  max_points: essay.max_points ?? defaultMarking,
  ...(essay.question_type ? { question_type: essay.question_type } : {}),
  ...(essay.rubric_json ? { rubric_json: essay.rubric_json } : {}),
  ...(essay.keywords ? { keywords: essay.keywords } : {}),
}))
```

