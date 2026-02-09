import { createClient } from "npm:@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";

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
  hasImage?: boolean;
}

// Parse Excel file using xlsx library
async function parseExcel(file: File): Promise<Record<string, any>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  return data as Record<string, any>[];
}

// Simple ZIP parser (handles basic ZIP format with stored/deflated files)
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
      const filenameLength = view.getUint16(26, true);
      const extraLength = view.getUint16(28, true);
      
      const filenameStart = offset + 30;
      const filename = new TextDecoder().decode(data.slice(filenameStart, filenameStart + filenameLength));
      
      const dataStart = filenameStart + filenameLength + extraLength;
      
      if (compressionMethod === 0) {
        // Stored (no compression)
        const fileData = data.slice(dataStart, dataStart + compressedSize);
        if (!filename.endsWith('/') && filename.length > 0) {
          // Extract just the filename without directory path
          const parts = filename.split('/');
          const justFilename = parts[parts.length - 1];
          if (justFilename) {
            files.set(justFilename, fileData);
          }
        }
        offset = dataStart + compressedSize;
      } else {
        // Compressed - skip for now
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

Deno.serve(async (req: Request) => {
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
    const zipFile = formData.get('zip') as File | null; // ZIP is now optional
    const moduleId = formData.get('moduleId') as string;
    const moduleCode = formData.get('moduleCode') as string || 'module';
    const chapterTitle = formData.get('chapterTitle') as string || 'chapter';
    const chapterId = formData.get('chapterId') as string | null;
    const validateOnly = formData.get('validateOnly') === 'true';
    const skipImages = formData.get('skipImages') === 'true';

    if (!excelFile || !moduleId) {
      return new Response(JSON.stringify({ error: 'Missing required excel file or moduleId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Limit file sizes to prevent abuse
    const MAX_EXCEL_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_ZIP_SIZE = 50 * 1024 * 1024; // 50MB
    if (excelFile.size > MAX_EXCEL_SIZE) {
      return new Response(JSON.stringify({ error: 'Excel file too large. Maximum 10MB.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (zipFile && zipFile.size > MAX_ZIP_SIZE) {
      return new Response(JSON.stringify({ error: 'ZIP file too large. Maximum 50MB.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create clean folder path
    const cleanModuleCode = moduleCode.replace(/[^a-zA-Z0-9-_]/g, '_');
    const cleanChapterTitle = chapterTitle.replace(/[^a-zA-Z0-9-_]/g, '_');
    const storagePath = `${cleanModuleCode}/${cleanChapterTitle}`;

    console.log(`Processing bulk OSCE import for module ${moduleId}, chapter ${chapterId}`);
    console.log(`Storage path: ${storagePath}`);
    console.log(`Excel file: ${excelFile.name}, ZIP file: ${zipFile?.name || 'none'}, skipImages: ${skipImages}`);

    // Parse Excel file
    const excelRows = await parseExcel(excelFile);
    
    console.log(`Found ${excelRows.length} data rows in Excel`);

    const MAX_OSCE_ROWS = 200;
    if (excelRows.length > MAX_OSCE_ROWS) {
      return new Response(JSON.stringify({ error: `Too many rows (${excelRows.length}). Maximum ${MAX_OSCE_ROWS} per import.` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse ZIP file if provided
    let zipFiles = new Map<string, Uint8Array>();
    let zipFileNames = new Map<string, string>();
    
    if (zipFile && !skipImages) {
      const zipBuffer = await zipFile.arrayBuffer();
      zipFiles = await parseZip(zipBuffer);
      
      // Build case-insensitive lookup for ZIP files
      for (const [filename] of zipFiles) {
        zipFileNames.set(filename.toLowerCase(), filename);
      }
      console.log(`Found ${zipFileNames.size} images in ZIP`);
    }

    // Parse rows
    const parsedRows: ParsedRow[] = [];
    const missingImages: string[] = [];

    for (let i = 0; i < excelRows.length; i++) {
      const row = excelRows[i];
      const rowNumber = i + 2; // +2 because row 1 is header and Excel is 1-indexed

      const imageFilename = String(row['image_filename'] || '').trim();
      const historyText = String(row['case_history'] || '').trim();
      
      const statements = [
        String(row['statement_1_text'] || '').trim(),
        String(row['statement_2_text'] || '').trim(),
        String(row['statement_3_text'] || '').trim(),
        String(row['statement_4_text'] || '').trim(),
        String(row['statement_5_text'] || '').trim(),
      ];

      const rawAnswers = [
        String(row['statement_1_answer'] || '').trim().toUpperCase(),
        String(row['statement_2_answer'] || '').trim().toUpperCase(),
        String(row['statement_3_answer'] || '').trim().toUpperCase(),
        String(row['statement_4_answer'] || '').trim().toUpperCase(),
        String(row['statement_5_answer'] || '').trim().toUpperCase(),
      ];

      const explanations = [
        String(row['statement_1_explanation'] || '').trim(),
        String(row['statement_2_explanation'] || '').trim(),
        String(row['statement_3_explanation'] || '').trim(),
        String(row['statement_4_explanation'] || '').trim(),
        String(row['statement_5_explanation'] || '').trim(),
      ];

      // Validate - image_filename is now OPTIONAL
      const errors: string[] = [];

      if (!historyText) errors.push('Missing case_history');
      
      statements.forEach((s, idx) => {
        if (!s) errors.push(`Missing statement_${idx + 1}_text`);
      });

      const answers: boolean[] = [];
      rawAnswers.forEach((a, idx) => {
        if (a === 'T' || a === 'TRUE' || a === '1' || a === 'YES') {
          answers.push(true);
        } else if (a === 'F' || a === 'FALSE' || a === '0' || a === 'NO') {
          answers.push(false);
        } else {
          errors.push(`Invalid statement_${idx + 1}_answer: "${a}" (must be TRUE/FALSE)`);
          answers.push(false);
        }
      });

      // Check if image exists in ZIP (only if image was specified and not skipping)
      const hasImage = !!imageFilename;
      let imageFound = false;
      
      if (hasImage && !skipImages && zipFileNames.size > 0) {
        imageFound = zipFileNames.has(imageFilename.toLowerCase());
        if (!imageFound) {
          missingImages.push(imageFilename);
        }
      } else if (!hasImage || skipImages) {
        // No image required or skipping images
        imageFound = true; // Consider "found" since not needed
      }

      parsedRows.push({
        rowNumber,
        imageFilename,
        historyText,
        statements,
        answers,
        explanations,
        error: errors.length > 0 ? errors.join('; ') : undefined,
        imageFound,
        hasImage,
      });
    }

    // Valid rows: no errors AND (no image needed OR image found OR skipping images)
    const valid = parsedRows.filter(r => {
      if (r.error) return false;
      if (skipImages) return true;
      if (!r.hasImage) return true;
      return r.imageFound;
    });
    const invalid = parsedRows.filter(r => !valid.includes(r));

    console.log(`Validation result: ${valid.length} valid, ${invalid.length} invalid`);

    if (validateOnly) {
      return new Response(JSON.stringify({
        valid: valid.map(r => ({
          rowNumber: r.rowNumber,
          imageFilename: r.imageFilename,
          hasImage: r.hasImage,
          historyText: r.historyText.substring(0, 50) + (r.historyText.length > 50 ? '...' : ''),
        })),
        invalid: invalid.map(r => ({
          rowNumber: r.rowNumber,
          imageFilename: r.imageFilename,
          error: r.error || (!r.imageFound && r.hasImage ? 'Image not found in ZIP' : undefined),
        })),
        missingImages: [...new Set(missingImages)],
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
    let importedWithImage = 0;
    let importedWithoutImage = 0;

    for (const row of valid) {
      try {
        let publicUrl: string | null = null;

        // Only upload image if specified and not skipping
        if (row.hasImage && !skipImages && zipFileNames.size > 0) {
          const actualFilename = zipFileNames.get(row.imageFilename.toLowerCase());
          if (actualFilename) {
            const imageData = zipFiles.get(actualFilename);
            if (imageData) {
              // Upload image to storage with structured path
              const ext = row.imageFilename.split('.').pop()?.toLowerCase() || 'jpg';
              const timestamp = Date.now();
              const randomSuffix = Math.random().toString(36).substring(2, 8);
              const newFilename = `${timestamp}-${randomSuffix}.${ext}`;
              const fullStoragePath = `${storagePath}/${newFilename}`;

              const { error: uploadError } = await supabase.storage
                .from('osce-images')
                .upload(fullStoragePath, imageData, {
                  contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
                });

              if (uploadError) {
                console.error(`Failed to upload image for row ${row.rowNumber}:`, uploadError);
                // Continue without image
              } else {
                const { data: { publicUrl: url } } = supabase.storage
                  .from('osce-images')
                  .getPublicUrl(fullStoragePath);
                publicUrl = url;
              }
            }
          }
        }

        // Insert OSCE question (image_url can be null)
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
        if (publicUrl) {
          importedWithImage++;
        } else {
          importedWithoutImage++;
        }
      } catch (err) {
        console.error(`Error processing row ${row.rowNumber}:`, err);
      }
    }

    console.log(`Successfully imported ${importedCount} OSCE questions (${importedWithImage} with images, ${importedWithoutImage} without)`);

    // Audit log the bulk import
    try {
      await supabase.from('audit_log').insert({
        actor_id: user.id,
        action: 'BULK_IMPORT_OSCE',
        entity_type: 'osce_questions',
        entity_id: moduleId,
        metadata: { importedCount, importedWithImage, importedWithoutImage, chapterId: chapterId || null },
      });
    } catch (auditErr) {
      console.error('Audit log error (non-fatal):', auditErr);
    }

    return new Response(JSON.stringify({
      success: true,
      importedCount,
      importedWithImage,
      importedWithoutImage,
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
