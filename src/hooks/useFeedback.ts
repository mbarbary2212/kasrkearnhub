import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export type FeedbackCategory = 'bug' | 'content_error' | 'suggestion' | 'complaint' | 'academic_integrity' | 'other';
export type FeedbackSeverity = 'normal' | 'urgent' | 'extreme';
export type FeedbackStatus = 'new' | 'in_review' | 'closed';

export interface FeedbackItem {
  id: string;
  created_at: string;
  role: string;
  category: FeedbackCategory;
  severity: FeedbackSeverity;
  year_id: string | null;
  module_id: string | null;
  topic_id: string | null;
  chapter_id: string | null;
  tab: string | null;
  message: string;
  screenshot_url: string | null;
  status: FeedbackStatus;
  admin_notes: string | null;
}

export interface FeedbackFormData {
  category: FeedbackCategory;
  severity: FeedbackSeverity;
  year_id?: string;
  module_id?: string;
  topic_id?: string;
  chapter_id?: string;
  tab?: string;
  message: string;
  screenshot_url?: string;
}

const DAILY_LIMIT = 5;

export function useFeedback() {
  const { user, role } = useAuthContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [isCheckingLimit, setIsCheckingLimit] = useState(true);

  useEffect(() => {
    checkDailyLimit();
  }, [user]);

  const checkDailyLimit = async () => {
    if (!user) {
      setIsCheckingLimit(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_user_feedback_count_today', {
        _user_id: user.id
      });

      if (error) throw error;
      setDailyCount(data || 0);
    } catch (error) {
      console.error('Error checking daily limit:', error);
    } finally {
      setIsCheckingLimit(false);
    }
  };

  const canSubmit = dailyCount < DAILY_LIMIT;
  const remainingSubmissions = DAILY_LIMIT - dailyCount;

  const submitFeedback = async (data: FeedbackFormData): Promise<boolean> => {
    if (!user || !canSubmit) return false;

    setIsSubmitting(true);

    try {
      const feedbackRole = role === 'teacher' ? 'faculty' : role || 'student';

      const { error } = await supabase.from('feedback').insert({
        created_by: user.id,
        role: feedbackRole,
        category: data.category,
        severity: data.severity,
        year_id: data.year_id || null,
        module_id: data.module_id || null,
        topic_id: data.topic_id || null,
        chapter_id: data.chapter_id || null,
        tab: data.tab || null,
        message: data.message,
        screenshot_url: data.screenshot_url || null,
      });

      if (error) throw error;

      // Log the submission
      await supabase.rpc('log_audit_event', {
        _action: 'FEEDBACK_SUBMIT',
        _entity_type: 'feedback',
        _entity_id: null,
        _metadata: { category: data.category, severity: data.severity }
      });

      setDailyCount(prev => prev + 1);
      return true;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitFeedback,
    isSubmitting,
    canSubmit,
    remainingSubmissions,
    isCheckingLimit,
    dailyCount,
  };
}

export function useAdminFeedback() {
  const { isAdmin, isSuperAdmin } = useAuthContext();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchFeedback();
    }
  }, [isAdmin]);

  const fetchFeedback = async () => {
    try {
      // Use the admin view that hides created_by
      const { data, error } = await supabase
        .from('feedback_admin_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedback((data as FeedbackItem[]) || []);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFeedbackStatus = async (id: string, status: FeedbackStatus, adminNotes?: string) => {
    try {
      const updateData: { status: FeedbackStatus; admin_notes?: string } = { status };
      if (adminNotes !== undefined) {
        updateData.admin_notes = adminNotes;
      }

      const { error } = await supabase
        .from('feedback')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setFeedback(prev => prev.map(f => 
        f.id === id ? { ...f, status, ...(adminNotes !== undefined && { admin_notes: adminNotes }) } : f
      ));

      return true;
    } catch (error) {
      console.error('Error updating feedback:', error);
      return false;
    }
  };

  const revealIdentity = async (feedbackId: string, reason: string): Promise<string | null> => {
    if (!isSuperAdmin) return null;

    try {
      const { data, error } = await supabase.rpc('reveal_feedback_identity', {
        _feedback_id: feedbackId,
        _reason: reason
      });

      if (error) throw error;
      return data as string;
    } catch (error) {
      console.error('Error revealing identity:', error);
      throw error;
    }
  };

  return {
    feedback,
    isLoading,
    fetchFeedback,
    updateFeedbackStatus,
    revealIdentity,
  };
}
