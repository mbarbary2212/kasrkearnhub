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

  const analyzeFile = useCallback(async (
    type: UploadType,
    headers: string[],
    sampleRows: string[][]
  ): Promise<AnalysisResult | null> => {
    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-bulk-upload', {
        body: { type, headers, sampleRows },
      });

      if (error) {
        throw new Error(error.message || 'Analysis failed');
      }

      const result = data as AnalysisResult;
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
      console.error('Analysis error:', error);
      const message = error instanceof Error ? error.message : 'Failed to analyze file';
      toast.error(message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
  }, []);

  return {
    isAnalyzing,
    analysis,
    analyzeFile,
    clearAnalysis,
  };
}
