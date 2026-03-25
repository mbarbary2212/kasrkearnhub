import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface McqChoice {
  key: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
}

// Filter choices to remove empty E option
function filterValidChoices(choices: McqChoice[]): McqChoice[] {
  return choices.filter(c => c.key !== 'E' || (c.text && c.text.trim() !== ''));
}

interface McqFormData {
  stem: string;
  choices: McqChoice[];
  correct_key: string;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  original_section_name?: string | null;
  original_section_number?: string | null;
  ai_confidence?: number | null;
}

interface RequestBody {
  mcqs: McqFormData[];
  moduleId: string;
  chapterId?: string | null;
  topicId?: string | null;
  questionFormat?: 'mcq' | 'sba';
  mode?: 'create' | 'update';
}

const VALID_CORRECT_KEYS = ['A', 'B', 'C', 'D', 'E'];

function normalizeCorrectKey(key: string | null | undefined): string | null {
  if (key === null || key === undefined) return null;
  const normalized = String(key).trim().toUpperCase();
  const match = normalized.match(/^([A-E])/);
  return match ? match[1] : normalized;
}

function validateCorrectKey(key: string | null | undefined, rowIndex: number): { valid: boolean; normalized: string | null; error?: string } {
  const normalized = normalizeCorrectKey(key);
  if (!normalized) {
    return { valid: false, normalized: null, error: `Row ${rowIndex + 1}: correct_key is missing or empty` };
  }
  if (!VALID_CORRECT_KEYS.includes(normalized)) {
    return { valid: false, normalized: null, error: `Row ${rowIndex + 1}: correct_key "${key}" is invalid. Must be A, B, C, D, or E` };
  }
  return { valid: true, normalized };
}

// Normalize stem text for matching (lowercase, trim, collapse whitespace)
function normalizeStem(stem: string): string {
  return stem.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function handleCreate(adminClient: ReturnType<typeof createClient>, validatedMcqs: Array<McqFormData & { normalizedCorrectKey: string }>, moduleId: string, chapterId: string | null | undefined, topicId: string | null | undefined, questionFormat: string, userId: string, sectionIdMap: Map<number, string>) {
  const records = validatedMcqs.map((mcq, index) => ({
    module_id: moduleId,
    chapter_id: chapterId || null,
    topic_id: topicId || null,
    stem: mcq.stem,
    choices: filterValidChoices(mcq.choices),
    correct_key: mcq.normalizedCorrectKey,
    explanation: mcq.explanation,
    difficulty: mcq.difficulty,
    display_order: index,
    created_by: userId,
    original_section_name: mcq.original_section_name || null,
    original_section_number: mcq.original_section_number || null,
    question_format: questionFormat,
    section_id: sectionIdMap.get(index) || null,
    ai_confidence: (mcq.ai_confidence !== null && mcq.ai_confidence !== undefined) ? Math.min(10, Math.max(0, mcq.ai_confidence)) : null,
  }));

  console.log(`Inserting ${records.length} MCQs for module ${moduleId}, chapter ${chapterId}`);
  const { error: insertError } = await adminClient.from('mcqs').insert(records);
  if (insertError) {
    console.error('Insert error:', insertError);
    if (records.length > 0) {
      console.error('First record that failed:', JSON.stringify(records[0], null, 2));
    }
    throw new Error(`Failed to import MCQs: ${insertError.message}`);
  }
  return records.length;
}

async function handleUpdate(adminClient: ReturnType<typeof createClient>, validatedMcqs: Array<McqFormData & { normalizedCorrectKey: string }>, moduleId: string, chapterId: string | null | undefined, topicId: string | null | undefined, userId: string) {
  // Fetch existing MCQs for matching
  let query = adminClient.from('mcqs').select('id, stem').eq('module_id', moduleId).eq('is_deleted', false);
  if (chapterId) query = query.eq('chapter_id', chapterId);
  if (topicId) query = query.eq('topic_id', topicId);

  const { data: existing, error: fetchError } = await query;
  if (fetchError) throw new Error(`Failed to fetch existing MCQs: ${fetchError.message}`);

  // Build a map of normalized stem → id
  const stemToId = new Map<string, string>();
  for (const row of existing || []) {
    stemToId.set(normalizeStem(row.stem), row.id);
  }

  let updatedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < validatedMcqs.length; i++) {
    const mcq = validatedMcqs[i];
    const normalized = normalizeStem(mcq.stem);
    const existingId = stemToId.get(normalized);

    if (!existingId) {
      continue; // No match found, skip
    }

    const updateData: Record<string, unknown> = { updated_by: userId };

    // Only update fields that have values in the CSV
    if (mcq.ai_confidence !== null && mcq.ai_confidence !== undefined) {
      updateData.ai_confidence = Math.min(10, Math.max(0, mcq.ai_confidence));
    }
    if (mcq.difficulty) {
      updateData.difficulty = mcq.difficulty;
    }
    if (mcq.explanation) {
      updateData.explanation = mcq.explanation;
    }

    // Only update if there's something to update beyond updated_by
    if (Object.keys(updateData).length <= 1) continue;

    const { error: updateError } = await adminClient
      .from('mcqs')
      .update(updateData)
      .eq('id', existingId);

    if (updateError) {
      errors.push(`Row ${i + 1}: ${updateError.message}`);
    } else {
      updatedCount++;
    }
  }

  if (errors.length > 0) {
    console.error('Update errors:', errors);
  }

  console.log(`Updated ${updatedCount} MCQs for module ${moduleId}, chapter ${chapterId}`);
  return updatedCount;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RequestBody = await req.json();
    const { mcqs, moduleId, chapterId, topicId, questionFormat = 'mcq', mode = 'create' } = body;

    if (!mcqs || !Array.isArray(mcqs) || mcqs.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No MCQs provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const MAX_BULK_MCQ_COUNT = 500;
    if (mcqs.length > MAX_BULK_MCQ_COUNT) {
      return new Response(
        JSON.stringify({ error: `Too many MCQs. Maximum ${MAX_BULK_MCQ_COUNT} per request.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!moduleId) {
      return new Response(
        JSON.stringify({ error: 'Module ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Permission checks
    const { data: canManageModule, error: modulePermError } = await adminClient.rpc(
      'can_manage_module_content',
      { _user_id: user.id, _module_id: moduleId }
    );

    if (modulePermError) {
      console.error('Module permission check error:', modulePermError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let canManageChapter: boolean | null = null;
    if (chapterId) {
      const { data, error } = await adminClient.rpc('can_manage_chapter_content', {
        _user_id: user.id,
        _chapter_id: chapterId,
      });
      if (error) {
        console.error('Chapter permission check error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to verify permissions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      canManageChapter = data as boolean;
    }

    const canManage = Boolean(canManageModule) || Boolean(canManageChapter);

    console.log('bulk-import-mcqs permission check', {
      user_id: user.id, moduleId, chapterId: chapterId || null,
      canManageModule: Boolean(canManageModule),
      canManageChapter: canManageChapter === null ? null : Boolean(canManageChapter),
      canManage, mode,
    });

    if (!canManage) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to import MCQs to this module' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate correct_keys
    const validationErrors: string[] = [];
    const validatedMcqs: Array<McqFormData & { normalizedCorrectKey: string }> = [];

    for (let i = 0; i < mcqs.length; i++) {
      const mcq = mcqs[i];
      const validation = validateCorrectKey(mcq.correct_key, i);
      if (!validation.valid) {
        validationErrors.push(validation.error!);
      } else {
        validatedMcqs.push({ ...mcq, normalizedCorrectKey: validation.normalized! });
      }
    }

    if (validationErrors.length > 0 && mode === 'create') {
      return new Response(
        JSON.stringify({
          error: `Invalid MCQ data:\n${validationErrors.slice(0, 5).join('\n')}${validationErrors.length > 5 ? `\n...and ${validationErrors.length - 5} more errors` : ''}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For update mode, we also include MCQs that failed key validation since we only update metadata
    const mcqsToProcess = mode === 'update'
      ? mcqs.map(m => ({ ...m, normalizedCorrectKey: normalizeCorrectKey(m.correct_key) || 'A' }))
      : validatedMcqs;

    let count = 0;

    if (mode === 'update') {
      count = await handleUpdate(adminClient, mcqsToProcess, moduleId, chapterId, topicId, user.id);
    } else {
      // Section resolution for create mode
      const sectionIdMap = new Map<number, string>();
      const needsSectionResolution = validatedMcqs.some(
        m => m.original_section_name || m.original_section_number
      );

      if (needsSectionResolution && (chapterId || topicId)) {
        const filterCol = chapterId ? 'chapter_id' : 'topic_id';
        const filterVal = chapterId || topicId;

        const { data: sections } = await adminClient
          .from('sections')
          .select('id, name, section_number')
          .eq(filterCol, filterVal!);

        if (sections && sections.length > 0) {
          for (let i = 0; i < validatedMcqs.length; i++) {
            const mcq = validatedMcqs[i];
            const origName = mcq.original_section_name;
            const origNum = mcq.original_section_number;
            if (!origName && !origNum) continue;

            let matched: string | null = null;

            if (origNum) {
              const numMatch = sections.find(s => s.section_number === origNum.trim());
              if (numMatch) matched = numMatch.id;
            }

            if (!matched && origName) {
              const nameLower = origName.toLowerCase().trim();
              const exact = sections.find(s => s.name?.toLowerCase().trim() === nameLower);
              if (exact) {
                matched = exact.id;
              } else {
                const stripped = nameLower.replace(/^\d+(\.\d+)*\s*[-–—.]?\s*/, '');
                if (stripped) {
                  const prefixMatch = sections.find(s => {
                    const sStripped = s.name?.toLowerCase().trim().replace(/^\d+(\.\d+)*\s*[-–—.]?\s*/, '');
                    return sStripped === stripped;
                  });
                  if (prefixMatch) matched = prefixMatch.id;
                }
                if (!matched) {
                  const containsMatch = sections.find(s =>
                    s.name?.toLowerCase().includes(nameLower) || nameLower.includes(s.name?.toLowerCase() || '')
                  );
                  if (containsMatch) matched = containsMatch.id;
                }
              }
            }

            if (matched) sectionIdMap.set(i, matched);
          }
        }
      }

      count = await handleCreate(adminClient, validatedMcqs, moduleId, chapterId, topicId, questionFormat, user.id, sectionIdMap);
    }

    // Audit log
    try {
      await adminClient.from('audit_log').insert({
        actor_id: user.id,
        action: mode === 'update' ? 'BULK_UPDATE_MCQ' : 'BULK_IMPORT_MCQ',
        entity_type: 'mcqs',
        entity_id: moduleId,
        metadata: { count, moduleId, chapterId: chapterId || null, topicId: topicId || null, mode },
      });
    } catch (auditErr) {
      console.error('Audit log error (non-fatal):', auditErr);
    }

    return new Response(
      JSON.stringify({ success: true, count, moduleId, chapterId, mode }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
