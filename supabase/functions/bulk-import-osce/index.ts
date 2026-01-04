import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedRow {
  rowNumber: number;
  imageFilename: string;
  historyText: string;
  statements: string[];
  answers: boolean[];
  explanations: string[];
  error?: string;
  imageFound?: boolean;
}

// Simple CSV parser
function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  const lines = content.split(/\r?\n/);
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    rows.push(row);
  }
  
  return rows;
}

// Simple ZIP parser (handles basic ZIP format)
async function parseZip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const files = new Map<string, Uint8Array>();
  const data = new Uint8Array(buffer);
  
  let offset = 0;
  
  while (offset < data.length - 4) {
    // Look for local file header signature
    if (data[offset] === 0x50 && data[offset + 1] === 0x4B && 
        data[offset + 2] === 0x03 && data[offset + 3] === 0x04) {
      
      const view = new DataView(buffer, offset);
      const compressionMethod = view.getUint16(8, true);
      const compressedSize = view.getUint32(18, true);
      const uncompressedSize = view.getUint32(22, true);
      const filenameLength = view.getUint16(26, true);
      const extraLength = view.getUint16(28, true);
      
      const filenameStart = offset + 30;
      const filename = new TextDecoder().decode(data.slice(filenameStart, filenameStart + filenameLength));
      
      const dataStart = filenameStart + filenameLength + extraLength;
      
      if (compressionMethod === 0) {
        // Stored (no compression)
        const fileData = data.slice(dataStart, dataStart + compressedSize);
        if (!filename.endsWith('/') && filename.length > 0) {
          files.set(filename, fileData);
        }
        offset = dataStart + compressedSize;
      } else {
        // Compressed - skip for now, we'll need the raw data
        offset = dataStart + compressedSize;
      }
    } else if (data[offset] === 0x50 && data[offset + 1] === 0x4B) {
      // Other ZIP record, skip
      break;
    } else {
      offset++;
    }
  }
  
  return files;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check user has admin permissions
    const { data: canManage } = await supabase.rpc('is_platform_admin_or_higher', {
      _user_id: user.id,
    });

    const { data: isTeacher } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'teacher',
    });

    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (!canManage && !isTeacher && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse form data
    const formData = await req.formData();
    const excelFile = formData.get('excel') as File;
    const zipFile = formData.get('zip') as File;
    const moduleId = formData.get('moduleId') as string;
    const chapterId = formData.get('chapterId') as string | null;
    const validateOnly = formData.get('validateOnly') === 'true';

    if (!excelFile || !zipFile || !moduleId) {
      return new Response(JSON.stringify({ error: 'Missing required files or moduleId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing bulk OSCE import for module ${moduleId}, chapter ${chapterId}`);
    console.log(`Excel file: ${excelFile.name}, ZIP file: ${zipFile.name}`);

    // Parse CSV/Excel file (we'll handle CSV for simplicity)
    const excelText = await excelFile.text();
    const rows = parseCSV(excelText);

    // Parse ZIP file
    const zipBuffer = await zipFile.arrayBuffer();
    const zipFiles = await parseZip(zipBuffer);
    
    const zipFileNames = new Map<string, string>();
    for (const [path] of zipFiles) {
      const parts = path.split('/');
      const filename = parts[parts.length - 1].toLowerCase();
      zipFileNames.set(filename, path);
    }

    console.log(`Found ${rows.length - 1} data rows and ${zipFileNames.size} images in ZIP`);

    // Parse rows (skip header)
    const parsedRows: ParsedRow[] = [];
    const missingImages: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || !row[0]) continue;

      const imageFilename = (row[0] || '').toString().trim();
      const historyText = (row[1] || '').toString().trim();
      
      const statements = [
        (row[2] || '').toString().trim(),
        (row[4] || '').toString().trim(),
        (row[6] || '').toString().trim(),
        (row[8] || '').toString().trim(),
        (row[10] || '').toString().trim(),
      ];

      const rawAnswers = [
        (row[3] || '').toString().trim().toUpperCase(),
        (row[5] || '').toString().trim().toUpperCase(),
        (row[7] || '').toString().trim().toUpperCase(),
        (row[9] || '').toString().trim().toUpperCase(),
        (row[11] || '').toString().trim().toUpperCase(),
      ];

      const explanations = [
        (row[12] || '').toString().trim(),
        (row[13] || '').toString().trim(),
        (row[14] || '').toString().trim(),
        (row[15] || '').toString().trim(),
        (row[16] || '').toString().trim(),
      ];

      // Validate
      const errors: string[] = [];

      if (!imageFilename) errors.push('Missing image filename');
      if (!historyText) errors.push('Missing history text');
      
      statements.forEach((s, idx) => {
        if (!s) errors.push(`Missing statement ${idx + 1}`);
      });

      const answers: boolean[] = [];
      rawAnswers.forEach((a, idx) => {
        if (a === 'T' || a === 'TRUE' || a === '1') {
          answers.push(true);
        } else if (a === 'F' || a === 'FALSE' || a === '0') {
          answers.push(false);
        } else {
          errors.push(`Invalid answer ${idx + 1}: "${a}" (must be T/F)`);
          answers.push(false);
        }
      });

      // Check if image exists in ZIP
      const imageFound = zipFileNames.has(imageFilename.toLowerCase());
      if (!imageFound) {
        missingImages.push(imageFilename);
      }

      parsedRows.push({
        rowNumber: i + 1,
        imageFilename,
        historyText,
        statements,
        answers,
        explanations,
        error: errors.length > 0 ? errors.join('; ') : undefined,
        imageFound,
      });
    }

    // Separate valid and invalid
    const valid = parsedRows.filter(r => !r.error && r.imageFound);
    const invalid = parsedRows.filter(r => r.error || !r.imageFound);

    console.log(`Validation result: ${valid.length} valid, ${invalid.length} invalid`);

    if (validateOnly) {
      return new Response(JSON.stringify({
        valid: valid.map(r => ({
          rowNumber: r.rowNumber,
          imageFilename: r.imageFilename,
          historyText: r.historyText.substring(0, 50) + '...',
        })),
        invalid: invalid.map(r => ({
          rowNumber: r.rowNumber,
          imageFilename: r.imageFilename,
          error: r.error || (!r.imageFound ? 'Image not found in ZIP' : undefined),
        })),
        missingImages,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Actually import
    if (valid.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid rows to import' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let importedCount = 0;

    for (const row of valid) {
      try {
        // Find the actual file path in ZIP
        const actualZipPath = zipFileNames.get(row.imageFilename.toLowerCase());
        if (!actualZipPath) {
          console.error(`Could not find image ${row.imageFilename} in ZIP`);
          continue;
        }

        const imageData = zipFiles.get(actualZipPath);
        if (!imageData) {
          console.error(`Could not read image data for ${row.imageFilename}`);
          continue;
        }

        // Upload image
        const ext = row.imageFilename.split('.').pop() || 'jpg';
        const newFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const storagePath = `${moduleId}/${chapterId || 'general'}/${newFilename}`;

        const { error: uploadError } = await supabase.storage
          .from('osce-images')
          .upload(storagePath, imageData, {
            contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          });

        if (uploadError) {
          console.error(`Failed to upload image for row ${row.rowNumber}:`, uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('osce-images')
          .getPublicUrl(storagePath);

        // Insert OSCE question
        const { error: insertError } = await supabase.from('osce_questions').insert({
          module_id: moduleId,
          chapter_id: chapterId || null,
          image_url: publicUrl,
          history_text: row.historyText,
          statement_1: row.statements[0],
          statement_2: row.statements[1],
          statement_3: row.statements[2],
          statement_4: row.statements[3],
          statement_5: row.statements[4],
          answer_1: row.answers[0],
          answer_2: row.answers[1],
          answer_3: row.answers[2],
          answer_4: row.answers[3],
          answer_5: row.answers[4],
          explanation_1: row.explanations[0] || null,
          explanation_2: row.explanations[1] || null,
          explanation_3: row.explanations[2] || null,
          explanation_4: row.explanations[3] || null,
          explanation_5: row.explanations[4] || null,
          display_order: importedCount,
          created_by: user.id,
        });

        if (insertError) {
          console.error(`Failed to insert row ${row.rowNumber}:`, insertError);
          continue;
        }

        importedCount++;
      } catch (err) {
        console.error(`Error processing row ${row.rowNumber}:`, err);
      }
    }

    console.log(`Successfully imported ${importedCount} OSCE questions`);

    return new Response(JSON.stringify({
      success: true,
      importedCount,
      skippedCount: valid.length - importedCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Bulk OSCE import error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
