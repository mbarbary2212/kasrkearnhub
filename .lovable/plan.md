

## Move Sentry.init After All Imports

Currently `Sentry.init()` sits between the first and second import blocks (line 4-7). Move it to after line 16 (after all imports), before the constants.

### Change (single file)

**`supabase/functions/run-ai-case/index.ts`** lines 1-18 become:

```typescript
import * as Sentry from "https://deno.land/x/sentry@8.45.0/index.mjs";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getAISettings,
  getAIProvider,
  getModelForContentType,
  getContentTypeOverrides,
  callAIWithMessages,
  logAIUsage,
} from "../_shared/ai-provider.ts";
import { detectPromptInjection, detectProfanity } from "../_shared/security.ts";

Sentry.init({
  dsn: Deno.env.get("SENTRY_DSN"),
  tracesSampleRate: 0.2,
});

const MAX_TURNS_DEFAULT = 10;
const REDIRECT_LIMIT = 2;
```

Will redeploy after applying.

