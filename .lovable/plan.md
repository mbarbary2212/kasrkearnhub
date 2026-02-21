

## Fix Short Questions Bulk Upload and Template

### Problem

Two issues:

1. **The Help Templates tab defines the wrong format** for Short Questions -- it uses a clinical scenario format (`title, scenario_text, questions, model_answer, keywords, rating, section_name, section_number`) which is suited for clinical cases, not short answer questions.

2. **The bulk upload parser only reads 3 columns** (`title, question, model_answer`) by position, so when a CSV following the template is uploaded, columns get misaligned -- `scenario_text` ends up in the `question` field, and `questions` ends up in `model_answer`.

Your CSV file follows the template format, so the data was mapped incorrectly during upload.

### What Changes

**1. Fix the Help Templates tab** (`src/components/admin/HelpTemplatesTab.tsx`)

Simplify the essay template to match what short questions actually are:
- Columns: `title, question, model_answer` (with optional `section_name, section_number`)
- Remove `scenario_text`, `keywords`, `rating` columns
- Update the example rows to show simple, direct short-answer questions (not clinical scenarios)

**2. Fix the bulk upload parser** (`src/components/admin/AdminContentActions.tsx`)

Update the essay parser to:
- Detect headers and map columns by name (not position)
- Support the simplified format: `title, question, model_answer`
- Also support the old clinical format for backward compatibility: if `scenario_text` and `questions` headers are found, combine them into the `question` field
- Map `section_name`/`section_number` to `section_id` if present
- Update the CSV format hint in the upload dialog to show the correct simple format

**3. Update the CSV format hint** in the bulk upload dialog

Change from:
```
title,question,model_answer
```
To also mention the optional section columns:
```
title,question,model_answer,section_name,section_number
```

### Technical Details

**File: `src/components/admin/HelpTemplatesTab.tsx` (lines 165-180)**
- Change columns to `['title', 'question', 'model_answer', 'section_name', 'section_number']`
- Change required to `['title', 'question']`
- Change optional to `['model_answer', 'section_name', 'section_number']`
- Replace the clinical scenario example with a simple short-answer example like:
  - Title: "Describe the stages of wound healing."
  - Question: "Outline the four main stages of wound healing and their key features."
  - Model Answer: "1) Hemostasis -- platelet aggregation and clot formation. 2) Inflammation -- neutrophils and macrophages clear debris. 3) Proliferation -- fibroblast activity, granulation tissue, angiogenesis. 4) Remodeling -- collagen maturation and scar formation over weeks to months."

**File: `src/components/admin/AdminContentActions.tsx` (lines 365-406)**
- Add header detection: read the first row to build a column-name-to-index map
- If headers include `scenario_text` and `questions`, combine them into `question` for backward compatibility with existing CSVs
- If headers include `section_name`/`section_number`, resolve to `section_id`
- Update the CSV format hint (lines 673-676)

### Summary

| File | Change |
|---|---|
| `HelpTemplatesTab.tsx` | Simplify essay template to `title, question, model_answer` with simple examples |
| `AdminContentActions.tsx` | Header-based column mapping in parser; backward-compatible with old format; updated format hint |
