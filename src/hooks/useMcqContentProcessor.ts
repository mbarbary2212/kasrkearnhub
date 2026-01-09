import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { McqFormData } from '@/hooks/useMcqs';

interface ProcessResult {
  mcqs: McqFormData[];
  count: number;
  moderated: boolean;
  flagged: boolean;
}

interface ProcessError {
  error: string;
  flagged?: boolean;
  categories?: string[];
  message?: string;
}

export function useMcqContentProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  /**
   * Parse raw pasted text using AI to extract MCQs
   */
  const parseRawText = async (rawText: string): Promise<McqFormData[]> => {
    setIsProcessing(true);
    setProcessingError(null);

    try {
      const { data, error } = await supabase.functions.invoke('process-mcq-content', {
        body: { action: 'parse', rawText }
      });

      if (error) {
        console.error('Parse error:', error);
        throw new Error(error.message || 'Failed to parse text');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data.mcqs || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse text';
      setProcessingError(message);
      toast.error(message);
      return [];
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Sanitize MCQs (strip HTML/Markdown, normalize answers)
   */
  const sanitizeMcqs = async (mcqs: McqFormData[]): Promise<McqFormData[]> => {
    setIsProcessing(true);
    setProcessingError(null);

    try {
      const { data, error } = await supabase.functions.invoke('process-mcq-content', {
        body: { action: 'sanitize', mcqs }
      });

      if (error) {
        console.error('Sanitize error:', error);
        throw new Error(error.message || 'Failed to sanitize content');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data.mcqs || mcqs;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sanitize content';
      setProcessingError(message);
      // Return original MCQs if sanitization fails
      return mcqs;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Moderate MCQs for inappropriate content
   */
  const moderateMcqs = async (mcqs: McqFormData[]): Promise<{ passed: boolean; message?: string }> => {
    setIsProcessing(true);
    setProcessingError(null);

    try {
      const { data, error } = await supabase.functions.invoke('process-mcq-content', {
        body: { action: 'moderate', mcqs }
      });

      if (error) {
        console.error('Moderation error:', error);
        // Don't block on moderation errors
        return { passed: true, message: 'Moderation skipped due to error' };
      }

      if (data.flagged) {
        return { 
          passed: false, 
          message: data.message || 'Content was flagged for policy violations'
        };
      }

      return { passed: true };
    } catch (err) {
      // Don't block on moderation errors
      return { passed: true, message: 'Moderation check unavailable' };
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Full processing pipeline: parse (if raw text), sanitize, and moderate
   */
  const processContent = async (input: {
    rawText?: string;
    mcqs?: McqFormData[];
  }): Promise<{ mcqs: McqFormData[]; success: boolean; message?: string }> => {
    setIsProcessing(true);
    setProcessingError(null);

    try {
      const { data, error } = await supabase.functions.invoke('process-mcq-content', {
        body: { 
          action: 'process', 
          rawText: input.rawText,
          mcqs: input.mcqs 
        }
      });

      if (error) {
        console.error('Process error:', error);
        throw new Error(error.message || 'Failed to process content');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.flagged) {
        return {
          mcqs: [],
          success: false,
          message: data.message || 'Content was flagged for policy violations'
        };
      }

      return {
        mcqs: data.mcqs || [],
        success: true,
        message: data.count ? `Processed ${data.count} MCQs` : undefined
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process content';
      setProcessingError(message);
      return { mcqs: [], success: false, message };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    parseRawText,
    sanitizeMcqs,
    moderateMcqs,
    processContent,
    isProcessing,
    processingError
  };
}
