

## Plan: Add Debug Logging to gemini-tts Edge Function

Two `console.log` statements will be added to `supabase/functions/gemini-tts/index.ts`:

1. **After the OPTIONS check** (~line 48): `console.log('gemini-tts invoked, method:', req.method);`
2. **Before the Gemini API fetch call** (~line 88): `console.log('Calling Gemini API with text length:', finalText.length, 'voice:', voiceName || 'Kore');`

No other changes to the file.

