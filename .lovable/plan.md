

## Fix ttsProvider Race Condition

### Problem
`useAISettings()` is async. When the user clicks "Voice", settings may not be loaded yet, causing `ttsProvider` to default to `'browser'` instead of `'gemini'`.

### Changes (1 file: `HistoryTakingSection.tsx`)

**1. Destructure `isLoading` from the hook (line 61)**

Change:
```typescript
const { data: ttsSettings } = useAISettings();
```
To:
```typescript
const { data: ttsSettings, isLoading: ttsSettingsLoading } = useAISettings();
```

**2. Guard the Voice button onClick (line 702)**

Add at the top of the onClick handler:
```typescript
if (ttsSettingsLoading) return;
```

**3. Disable the Voice button while loading (line 698)**

Add `disabled={ttsSettingsLoading}` and apply a loading opacity class:
```typescript
<Button
  size="lg"
  variant="outline"
  className={cn("gap-2", ttsSettingsLoading && "opacity-50")}
  disabled={ttsSettingsLoading}
  onClick={() => { ... }}
>
```

**4. Add debug log in greeting handler**

At the start of `sendChatMessageInitial` (or the greeting TTS section), add:
```typescript
console.log('[Greeting] ttsProvider resolved as:', ttsProvider);
```

### No other files touched.

