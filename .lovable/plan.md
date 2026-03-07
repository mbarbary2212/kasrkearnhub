

## Plan: Create Comprehensive Interactive Cases Documentation

### What will be created

A single file `docs/KALMHUB_Interactive_Cases_Documentation.md` containing three major sections:

**Section 1 — How the System Works**
- Case structure: 10 sections from History Taking through Conclusion, plus Professional Attitude
- AI scoring logic per section (comprehension answers, checklist evaluation, lab/imaging penalty system, rubric-based free-text scoring)
- Anti-cheating measures (select-none, blocked copy/paste, KALMHUB watermark)
- Voice mode: Egyptian Arabic speech recognition with interim transcript, error toasts, fallback text input
- Linear progression: no skipping ahead, section locking after submission, exit confirmation dialog

**Section 2 — Admin Guide**
- Two creation pathways: AI Generation (from chapter PDF + reference docs) vs Build Manually (empty skeleton)
- Step-by-step walkthrough of the 5-tab StructuredCaseCreator (Basics, Sections, History Mode, Patient, Review)
- Case Preview Editor capabilities: inline editing of all fields, section toggle with auto score recalculation, avatar picker, publish flow
- How to define expected answers: MCQ correct options, free-text model answers and expected points, diagnosis rubric, key labs/imaging
- Reference document upload (checklist PDFs for history items, lecture/guideline docs for context)
- Lab unit convention (Conventional US units enforced globally)

**Section 3 — External AI Generation Prompt**
- A complete, ready-to-paste prompt for Claude/ChatGPT that produces the exact JSON schema the app expects
- Includes all placeholders in `[BRACKETS]` for admins to fill in
- Covers every section's data structure with field-level examples
- Instructions on how to import the output into the Case Preview Editor

**Appendix**: Default max scores table (total 120 points across all sections)

### Implementation
- Single file creation: `docs/KALMHUB_Interactive_Cases_Documentation.md`
- Clean markdown formatting, no technical jargon, suitable for non-technical medical educators
- Approximately 500 lines of well-structured documentation

