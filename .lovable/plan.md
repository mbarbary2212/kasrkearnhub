

# Fix Study Coach: Markdown Rendering + Chapter Grounding + Download

## 4 Changes

### 1. Install `remark-gfm` dependency
Not currently installed. Needed for markdown table support in `react-markdown`.

### 2. `src/components/coach/AskCoachPanel.tsx`

**Markdown rendering (Fix 1):**
- Import `ReactMarkdown` and `remarkGfm`
- For assistant messages (line 400-402): replace `{msg.content}` with `<ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>`
- Remove `whitespace-pre-wrap break-all` from assistant message div (keep for user messages)
- Add overflow-x-auto for tables

**Download button:**
- Import `Download` icon from lucide-react
- Add a small download button below each assistant message
- On click: create a Blob with the markdown content, trigger download as `.md` file

**Chapter PDF grounding (Fix 2):**
- When panel opens and `studyContext.chapterId` exists, fetch `pdf_text` from `module_chapters` table
- Store in local state, include first ~8000 chars in the `context` string sent to the edge function
- This happens in `streamChat` or `handleSend` — append to the context prompt

### 3. `supabase/functions/coach-chat/index.ts`

Update the system prompt (lines 14-70) to add:
- Explicit instruction to use markdown tables for comparisons, differential diagnoses, and feature lists
- Stronger grounding: "When CHAPTER CONTENT is provided below, it is your PRIMARY and ONLY source. Do not supplement with general knowledge. If the answer is not in the chapter content, say so and suggest the student check the textbook or ask their professor."
- Instruction to reference page numbers when available

### 4. No changes to `CoachContext.tsx`
`chapterId` is already available in the study context. The fetching will happen directly in `AskCoachPanel.tsx`.

## Files Modified
| File | What |
|------|------|
| `package.json` | Add `remark-gfm` |
| `src/components/coach/AskCoachPanel.tsx` | ReactMarkdown rendering, download button, fetch chapter pdf_text |
| `supabase/functions/coach-chat/index.ts` | System prompt: tables + grounding |

