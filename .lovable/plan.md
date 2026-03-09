

# Apply Previously Approved: Fix AI Patient Chat (Wrong Age, Truncated Responses)

This plan was already approved but not yet implemented. Three changes to **one file**:

## File: `supabase/functions/patient-history-chat/index.ts`

### Change 1 — Increase maxTokens (line 98)
`maxTokens: 512` → `maxTokens: 1024`

### Change 2 — Override stale ATMIST age_time (lines 128-134)
Replace the current block with logic that uses canonical `patient.age` over `handover.age_time`:

```typescript
parts.push(`Patient: ${patient.name || 'Unknown'}, ${patient.age || '?'}yo, ${patient.gender || '?'}`);

// Override stale ATMIST age_time with canonical patient data
if (patient.age) {
  const ageTime = `${patient.age} year old ${patient.gender || 'patient'}`;
  parts.push(`Age/Time: ${ageTime}`);
} else if (handover.age_time) {
  parts.push(`Age/Time: ${handover.age_time}`);
}
if (handover.mechanism) parts.push(`Mechanism: ${handover.mechanism}`);
if (handover.injuries) parts.push(`Injuries: ${handover.injuries}`);
if (handover.signs) parts.push(`Signs: ${handover.signs}`);
if (handover.treatment) parts.push(`Treatment given: ${handover.treatment}`);
```

### Change 3 — Add explicit age rule to system prompts

**English prompt** (line 185, after name rule): Insert new rule 3:
```
3. Your age is exactly ${patient.age || '?'} years old. Always state your age as ${patient.age || '?'} if asked.
```
Renumber subsequent rules 3→4, 4→5, etc.

**Arabic prompt** (line 210, after name rule): Insert new rule 3:
```
3. عمرك بالظبط ${patient.age || '?'} سنة. لو حد سألك عن عمرك قول ${patient.age || '?'} سنة.
```
Renumber subsequent rules.

After editing, **deploy the edge function** via `supabase--deploy_edge_functions`.

