# Reorder Exam Paper Config Fields

## Problem

The current field order in each paper's configuration card doesn't follow the logical exam-building flow. Fields need to be reordered to match how an admin thinks about building an exam.

**type of exam written vs practical** 

**this is for written only. the**

## New Field Order (per paper) on  the final paper that appears to the student it should look like this. i want to add the logos of the collage latter. the short answer questions are usally in hand writting but in the app of course it will be in typing. a small note to the student expalining the diffrence and telling thme that spelling will not be marked

1. **Paper Name** (keep at top)
2. **Special Instructions** -- textarea at the bottom
3. **Duration (minutes)** -- time allocated for this paper



1. **Question Types and Counts** -- MCQ count/points, Essay count/points (written) or OSCE/Clinical/POXA counts (practical)
2. **Chapter/Book Scope** -- which chapters the questions are drawn from
3. &nbsp;
4. File Changed

`src/components/exam/ExamPaperConfig.tsx` -- reorder the JSX blocks inside `CollapsibleContent` so that:

- Question type inputs come first (already there)
- Chapter scope moves up to right after question types
- Duration moves down below chapter scope
- Instructions stays last

This is a simple reorder of existing JSX blocks with no logic changes.