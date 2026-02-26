

## Analysis

I found two root causes for premature pathway termination:

**Bug 1 — Naive CSV splitting** (`useInteractiveAlgorithms.ts` line 126): Uses `line.split(',')` which breaks when content contains commas (extremely common in medical text like "chest pain, shortness of breath"). This shifts all columns, causing `next_node` to be read from the wrong column — producing empty/garbage values that the player treats as terminal.

**Bug 2 — Silent failure on missing nodes** (`AlgorithmPlayer.tsx` line 53): When `currentNodeId` references a node that doesn't exist in `nodeMap`, `currentNode` is `undefined` and the player silently shows "Pathway Complete" instead of indicating an error.

## Implementation Plan

### 1. Fix CSV parser with proper comma-in-quotes handling
**File: `src/hooks/useInteractiveAlgorithms.ts`**
- Replace naive `line.split(',')` with a proper CSV field parser that respects quoted fields (e.g. `"content with, commas"`)
- This alone likely fixes most premature terminations

### 2. Add graph validation after parsing
**File: `src/hooks/useInteractiveAlgorithms.ts`**
- New exported function `validateAlgorithmGraph(json: AlgorithmJson)` returning `{ valid: boolean; errors: string[] }`
- Checks: every `next_node_id` / option `next_node_id` references an existing node; all non-end nodes have an outgoing edge; no unreachable nodes; at least one path from start to an end node

### 3. Wire validation into bulk upload modal
**File: `src/components/algorithms/AlgorithmBulkUploadModal.tsx`**
- After parsing, run `validateAlgorithmGraph` on each pathway
- Show validation errors per pathway (which nodes are broken)
- Block import if any pathway has errors

### 4. Add dangling-node guard in the player
**File: `src/components/algorithms/AlgorithmPlayer.tsx`**
- When `currentNodeId` is set but `currentNode` is not found in `nodeMap`, show an error state ("This step references a missing node") with Back/Restart buttons instead of silently showing "Pathway Complete"

### 5. Add import summary stats
**File: `src/components/algorithms/AlgorithmBulkUploadModal.tsx`**
- After successful parse + validation, show per pathway: total nodes, decision nodes, terminal nodes, longest path depth

### 6. Add admin debug toggle in player
**File: `src/components/algorithms/AlgorithmPlayer.tsx`**
- Optional prop `debugMode?: boolean`; when true, show small overlay with current `node_id`, target `next_node_id`, node type, and whether the node is terminal

