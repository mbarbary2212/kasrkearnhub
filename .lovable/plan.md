

## Generate Progress Tracking System PDF Report

The PDF report documenting KALM Hub's progress tracking system has been written as a Python script at `/tmp/generate_report.py`. It needs to be executed to produce the final PDF.

### What the report covers (8 pages)

1. **System Overview** — Two-level architecture (chapter vs. module)
2. **Chapter Progress** — 60/40 practice/video weighting, 80% video threshold, weight redistribution
3. **Exam Readiness Formula** — 0.40 Coverage + 0.30 Performance + 0.20 Improvement + 0.10 Consistency
4. **Hard Caps** — Coverage <40% caps at 50%, Performance <50% caps at 65%, Improvement <40% caps at 75%
5. **Performance Calculation** — MCQ 50%, OSCE 30%, Concept Check 20% with redistribution
6. **Improvement Tracking** — Attempt-based (last 10 MCQ, last 5 OSCE vs prior windows)
7. **Consistency Score** — 7-day and 14-day active-day scoring
8. **Mastery Indicators** — MCQ ≥70% AND OSCE ≥3.5/5 thresholds
9. **Study Streak** — Consecutive-day calculation logic
10. **Dashboard UI Components** — Table of all display components
11. **Data Architecture** — Tables, RPC, data flow
12. **Caching Strategy** — Client (React Query) and server (readiness cache with 5-min TTL)
13. **Key Files Reference** — All relevant source files

### Implementation

Run the already-written script at `/tmp/generate_report.py` using reportlab. Output goes to `/mnt/documents/KALM_Hub_Progress_Tracking_System.pdf`. Then QA by converting pages to images and inspecting for layout issues.

