import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MappingSuggestion {
  sourceColumn: string;
  targetColumn: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface AnalysisIssue {
  type: 'missing_column' | 'format_error' | 'quality_warning';
  message: string;
  severity: 'error' | 'warning';
}

export interface AnalysisResult {
  mappingSuggestions: MappingSuggestion[];
  issues: AnalysisIssue[];
  overallStatus: 'ready' | 'needs_mapping' | 'needs_fixes';
  summary: string;
}

export type UploadType = 'mcq' | 'osce' | 'matching';

export function useBulkUploadAnalyzer() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const analyzeFile = useCallback(async (
    type: UploadType,
    headers: string[],
    sampleRows: string[][]
  ): Promise<AnalysisResult | null> => {
    console.log('[BulkUploadAnalyzer] Starting analysis...');
    console.log('[BulkUploadAnalyzer] Type:', type);
    console.log('[BulkUploadAnalyzer] Headers:', headers);
    console.log('[BulkUploadAnalyzer] Sample rows count:', sampleRows.length);
    
    // Validate inputs
    if (!headers || headers.length === 0) {
      const errorMsg = 'No headers found in file';
      console.error('[BulkUploadAnalyzer] Validation error:', errorMsg);
      toast.error(errorMsg);
      setAnalyzeError(errorMsg);
      return null;
    }

    if (!sampleRows || sampleRows.length === 0) {
      const errorMsg = 'No data rows found in file';
      console.error('[BulkUploadAnalyzer] Validation error:', errorMsg);
      toast.error(errorMsg);
      setAnalyzeError(errorMsg);
      return null;
    }

    setIsAnalyzing(true);
    setAnalysis(null);
    setAnalyzeError(null);

    try {
      console.log('[BulkUploadAnalyzer] Invoking edge function: analyze-bulk-upload');
      
      const { data, error } = await supabase.functions.invoke('analyze-bulk-upload', {
        body: { type, headers, sampleRows },
      });

      console.log('[BulkUploadAnalyzer] Edge function response:', { data, error });

      if (error) {
        console.error('[BulkUploadAnalyzer] Edge function error:', error);
        
        // Handle specific error types
        let errorMessage = 'Analysis failed';
        if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (error.message?.includes('402') || error.message?.includes('Payment')) {
          errorMessage = 'AI service limit reached. Please try again later.';
        } else if (error.message?.includes('LOVABLE_API_KEY')) {
          errorMessage = 'AI service not configured. Contact support.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast.error(errorMessage);
        setAnalyzeError(errorMessage);
        return null;
      }

      // Check for error in data response
      if (data?.error) {
        console.error('[BulkUploadAnalyzer] API returned error:', data.error);
        toast.error(data.error);
        setAnalyzeError(data.error);
        return null;
      }

      const result = data as AnalysisResult;
      console.log('[BulkUploadAnalyzer] Analysis result:', result);
      
      // Validate result structure
      if (!result || typeof result !== 'object') {
        const errorMsg = 'Invalid response from AI analysis';
        console.error('[BulkUploadAnalyzer] Invalid result structure:', result);
        toast.error(errorMsg);
        setAnalyzeError(errorMsg);
        return null;
      }

      setAnalysis(result);
      
      // Show toast based on status
      if (result.overallStatus === 'ready') {
        toast.success('File structure looks good!');
      } else if (result.overallStatus === 'needs_mapping') {
        toast.info('Some columns need mapping. Check suggestions below.');
      } else {
        toast.warning('Issues found. Please review before importing.');
      }

      return result;
    } catch (error) {
      console.error('[BulkUploadAnalyzer] Unexpected error:', error);
      const message = error instanceof Error ? error.message : 'Failed to analyze file. Please try again.';
      toast.error(message);
      setAnalyzeError(message);
      return null;
    } finally {
      setIsAnalyzing(false);
      console.log('[BulkUploadAnalyzer] Analysis complete');
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setAnalyzeError(null);
  }, []);

  return {
    isAnalyzing,
    analysis,
    analyzeError,
    analyzeFile,
    clearAnalysis,
  };
}
