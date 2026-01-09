import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface McqChoice {
  key: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
}

interface McqData {
  stem: string;
  choices: McqChoice[];
  correct_key: string;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
}

interface ParsedMcqResult {
  stem: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  choiceE: string;
  correct_key: string;
  explanation: string | null;
}

// HTML and Markdown stripping
function stripHtmlAndMarkdown(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  let result = text;
  
  // Strip HTML tags
  result = result.replace(/<[^>]*>/g, '');
  
  // Strip Markdown bold/italic
  result = result.replace(/\*\*([^*]+)\*\*/g, '$1'); // **bold**
  result = result.replace(/\*([^*]+)\*/g, '$1');     // *italic*
  result = result.replace(/__([^_]+)__/g, '$1');     // __bold__
  result = result.replace(/_([^_]+)_/g, '$1');       // _italic_
  
  // Strip Markdown headers
  result = result.replace(/^#{1,6}\s*/gm, '');
  
  // Strip Markdown links [text](url) -> text
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Strip Markdown images ![alt](url) -> alt
  result = result.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  
  // Strip backticks for inline code
  result = result.replace(/`([^`]+)`/g, '$1');
  
  // Strip code blocks
  result = result.replace(/```[\s\S]*?```/g, '');
  
  // Collapse multiple spaces to one
  result = result.replace(/\s+/g, ' ');
  
  // Trim
  result = result.trim();
  
  return result;
}

// Normalize correct key from various formats
function normalizeCorrectKey(value: string, choices: McqChoice[]): string {
  const trimmed = (value || '').trim();
  
  // Already a letter A-E
  if (/^[A-Ea-e]$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  
  // Numeric: 1=A, 2=B, etc.
  const numericMap: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' };
  if (numericMap[trimmed]) {
    return numericMap[trimmed];
  }
  
  // Text containing letter reference (e.g., "Option B", "Answer: C")
  const letterMatch = trimmed.match(/\b([A-Ea-e])\b/);
  if (letterMatch) {
    return letterMatch[1].toUpperCase();
  }
  
  // Try matching text to choices
  const lowerTrimmed = trimmed.toLowerCase();
  for (const choice of choices) {
    if (choice.text.toLowerCase().trim() === lowerTrimmed) {
      return choice.key;
    }
    // Partial match - if the answer text contains the choice text or vice versa
    if (lowerTrimmed.includes(choice.text.toLowerCase().trim()) || 
        choice.text.toLowerCase().trim().includes(lowerTrimmed)) {
      return choice.key;
    }
  }
  
  // Default fallback
  return 'A';
}

// Sanitize a single MCQ
function sanitizeMcq(mcq: McqData): McqData {
  return {
    stem: stripHtmlAndMarkdown(mcq.stem),
    choices: mcq.choices.map(c => ({
      key: c.key,
      text: stripHtmlAndMarkdown(c.text)
    })),
    correct_key: mcq.correct_key,
    explanation: mcq.explanation ? stripHtmlAndMarkdown(mcq.explanation) : null,
    difficulty: mcq.difficulty
  };
}

// Build the AI prompt for parsing raw text
function buildParsePrompt(rawText: string): string {
  return `You are an expert at parsing medical MCQ questions from unstructured text.

Parse the following raw text and extract MCQ questions. The text may come from Cairo University PDFs and have irregular formatting.

For each question found, extract:
- stem: The main question text
- choiceA through choiceE: The five answer options (some may be empty)
- correct_key: The correct answer letter (A-E)
- explanation: Any explanation provided (or null)

Handle these common formats:
- Choices numbered 1-5 instead of A-E
- Choices with "A." or "a)" or just letters
- Choices on new lines without markers
- Answer specified as "Answer: B" or "Correct: 2" or just the answer text

Return a JSON array of parsed MCQs in this exact format:
[
  {
    "stem": "Question text here?",
    "choiceA": "First option",
    "choiceB": "Second option", 
    "choiceC": "Third option",
    "choiceD": "Fourth option",
    "choiceE": "Fifth option or empty string",
    "correct_key": "B",
    "explanation": "Explanation or null"
  }
]

If you cannot find any valid MCQs, return an empty array [].

Raw text to parse:
${rawText}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { 
      action, 
      mcqs, 
      rawText, 
      moduleId, 
      chapterId 
    } = body;

    console.log(`process-mcq-content action: ${action}`);

    // ACTION 1: Sanitize existing MCQs (for file upload or manual entry)
    if (action === 'sanitize') {
      if (!mcqs || !Array.isArray(mcqs)) {
        return new Response(
          JSON.stringify({ error: 'MCQs array is required for sanitize action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const sanitizedMcqs = mcqs.map((mcq: McqData) => {
        const sanitized = sanitizeMcq(mcq);
        // Re-normalize correct key with sanitized choices
        sanitized.correct_key = normalizeCorrectKey(mcq.correct_key, sanitized.choices);
        return sanitized;
      });

      return new Response(
        JSON.stringify({ mcqs: sanitizedMcqs, action: 'sanitized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTION 2: Parse raw text using AI (for copy-paste)
    if (action === 'parse') {
      if (!rawText || typeof rawText !== 'string') {
        return new Response(
          JSON.stringify({ error: 'rawText is required for parse action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Parsing raw text (${rawText.length} chars)`);

      // Call Lovable AI Gateway
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'user', content: buildParsePrompt(rawText) }
          ],
          temperature: 0.1,
        }),
      });

      if (!aiResponse.ok) {
        const errorStatus = aiResponse.status;
        if (errorStatus === 429) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (errorStatus === 402) {
          return new Response(
            JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const errorText = await aiResponse.text();
        console.error('AI Gateway error:', errorStatus, errorText);
        return new Response(
          JSON.stringify({ error: 'AI parsing service unavailable' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || '[]';
      
      // Extract JSON from response (might be wrapped in markdown code blocks)
      let jsonContent = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }

      let parsedMcqs: ParsedMcqResult[] = [];
      try {
        parsedMcqs = JSON.parse(jsonContent.trim());
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        return new Response(
          JSON.stringify({ error: 'Failed to parse AI response', mcqs: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Convert to standard MCQ format and sanitize
      const mcqsFormatted: McqData[] = parsedMcqs.map(parsed => {
        const choices: McqChoice[] = [
          { key: 'A', text: stripHtmlAndMarkdown(parsed.choiceA || '') },
          { key: 'B', text: stripHtmlAndMarkdown(parsed.choiceB || '') },
          { key: 'C', text: stripHtmlAndMarkdown(parsed.choiceC || '') },
          { key: 'D', text: stripHtmlAndMarkdown(parsed.choiceD || '') },
          { key: 'E', text: stripHtmlAndMarkdown(parsed.choiceE || '') },
        ];

        const correctKey = normalizeCorrectKey(parsed.correct_key || 'A', choices);

        return {
          stem: stripHtmlAndMarkdown(parsed.stem || ''),
          choices,
          correct_key: correctKey,
          explanation: parsed.explanation ? stripHtmlAndMarkdown(parsed.explanation) : null,
          difficulty: null,
        };
      });

      console.log(`Parsed ${mcqsFormatted.length} MCQs from raw text`);

      return new Response(
        JSON.stringify({ mcqs: mcqsFormatted, action: 'parsed', count: mcqsFormatted.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTION 3: Moderate content before saving
    if (action === 'moderate') {
      if (!mcqs || !Array.isArray(mcqs)) {
        return new Response(
          JSON.stringify({ error: 'MCQs array is required for moderate action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!openAIApiKey) {
        console.warn('OPENAI_API_KEY not configured, skipping moderation');
        return new Response(
          JSON.stringify({ mcqs, moderated: false, message: 'Moderation skipped - API key not configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build content string for moderation
      const contentToModerate = mcqs.map((mcq: McqData, i: number) => {
        const choicesText = mcq.choices.map(c => `${c.key}: ${c.text}`).join('\n');
        return `Question ${i + 1}:\n${mcq.stem}\n${choicesText}\n${mcq.explanation || ''}`;
      }).join('\n\n---\n\n');

      console.log(`Moderating ${mcqs.length} MCQs`);

      const moderationResponse = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: contentToModerate }),
      });

      if (!moderationResponse.ok) {
        console.error('Moderation API error:', await moderationResponse.text());
        return new Response(
          JSON.stringify({ mcqs, moderated: false, message: 'Moderation service unavailable' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const moderationData = await moderationResponse.json();
      const result = moderationData.results?.[0];
      
      if (result?.flagged) {
        const flaggedCategories = Object.entries(result.categories)
          .filter(([_, value]) => value === true)
          .map(([key]) => key);
        
        console.warn('Content flagged:', flaggedCategories);
        
        return new Response(
          JSON.stringify({ 
            flagged: true, 
            categories: flaggedCategories,
            message: `Content flagged for: ${flaggedCategories.join(', ')}`,
            mcqs: null 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ mcqs, moderated: true, flagged: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTION 4: Full pipeline - sanitize, parse (if raw), and moderate
    if (action === 'process') {
      let processedMcqs: McqData[] = [];

      // If raw text provided, parse it first
      if (rawText && typeof rawText === 'string' && rawText.trim()) {
        console.log(`Processing raw text input (${rawText.length} chars)`);
        
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              { role: 'user', content: buildParsePrompt(rawText) }
            ],
            temperature: 0.1,
          }),
        });

        if (!aiResponse.ok) {
          const errorStatus = aiResponse.status;
          if (errorStatus === 429) {
            return new Response(
              JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          if (errorStatus === 402) {
            return new Response(
              JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
              { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          throw new Error('AI parsing failed');
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || '[]';
        
        let jsonContent = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonContent = jsonMatch[1];

        try {
          const parsedMcqs: ParsedMcqResult[] = JSON.parse(jsonContent.trim());
          processedMcqs = parsedMcqs.map(parsed => {
            const choices: McqChoice[] = [
              { key: 'A', text: stripHtmlAndMarkdown(parsed.choiceA || '') },
              { key: 'B', text: stripHtmlAndMarkdown(parsed.choiceB || '') },
              { key: 'C', text: stripHtmlAndMarkdown(parsed.choiceC || '') },
              { key: 'D', text: stripHtmlAndMarkdown(parsed.choiceD || '') },
              { key: 'E', text: stripHtmlAndMarkdown(parsed.choiceE || '') },
            ];
            return {
              stem: stripHtmlAndMarkdown(parsed.stem || ''),
              choices,
              correct_key: normalizeCorrectKey(parsed.correct_key || 'A', choices),
              explanation: parsed.explanation ? stripHtmlAndMarkdown(parsed.explanation) : null,
              difficulty: null,
            };
          });
        } catch {
          return new Response(
            JSON.stringify({ error: 'Failed to parse AI response' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else if (mcqs && Array.isArray(mcqs)) {
        // Sanitize provided MCQs
        processedMcqs = mcqs.map((mcq: McqData) => {
          const sanitized = sanitizeMcq(mcq);
          sanitized.correct_key = normalizeCorrectKey(mcq.correct_key, sanitized.choices);
          return sanitized;
        });
      } else {
        return new Response(
          JSON.stringify({ error: 'Either mcqs or rawText is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Run moderation if OpenAI key available
      if (openAIApiKey && processedMcqs.length > 0) {
        const contentToModerate = processedMcqs.map((mcq, i) => {
          const choicesText = mcq.choices.map(c => `${c.key}: ${c.text}`).join('\n');
          return `Question ${i + 1}:\n${mcq.stem}\n${choicesText}\n${mcq.explanation || ''}`;
        }).join('\n\n---\n\n');

        try {
          const moderationResponse = await fetch('https://api.openai.com/v1/moderations', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ input: contentToModerate }),
          });

          if (moderationResponse.ok) {
            const moderationData = await moderationResponse.json();
            const result = moderationData.results?.[0];
            
            if (result?.flagged) {
              const flaggedCategories = Object.entries(result.categories)
                .filter(([_, value]) => value === true)
                .map(([key]) => key);
              
              return new Response(
                JSON.stringify({ 
                  flagged: true, 
                  categories: flaggedCategories,
                  message: `Content flagged for: ${flaggedCategories.join(', ')}`,
                  mcqs: null 
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        } catch (modError) {
          console.warn('Moderation check failed, continuing:', modError);
        }
      }

      console.log(`Processed ${processedMcqs.length} MCQs successfully`);

      return new Response(
        JSON.stringify({ 
          mcqs: processedMcqs, 
          count: processedMcqs.length,
          moderated: !!openAIApiKey,
          flagged: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: sanitize, parse, moderate, or process' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-mcq-content:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
