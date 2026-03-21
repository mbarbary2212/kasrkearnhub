

# Fix: "Maximum call stack size exceeded" in PDF Section Extraction

## Root Cause

Line 53 of `extract-pdf-sections/index.ts`:
```typescript
const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));
```

The spread operator (`...pdfBytes`) pushes every byte as a separate argument to `String.fromCharCode()`. For a 1MB PDF (1,075,000 bytes), that's over 1 million function arguments — exceeding the JavaScript call stack limit.

## Fix

Replace line 53 with a chunked base64 encoder that processes the `Uint8Array` in small batches (e.g., 8KB chunks), then calls `btoa()` on the resulting string.

```typescript
// Convert Uint8Array to base64 without stack overflow
let binary = "";
const chunkSize = 8192;
for (let i = 0; i < pdfBytes.length; i += chunkSize) {
  const chunk = pdfBytes.subarray(i, i + chunkSize);
  for (let j = 0; j < chunk.length; j++) {
    binary += String.fromCharCode(chunk[j]);
  }
}
const pdfBase64 = btoa(binary);
```

## File Changed

| File | Change |
|------|--------|
| `supabase/functions/extract-pdf-sections/index.ts` | Replace line 53 with chunked base64 encoding |

One-line fix, then redeploy the function.

