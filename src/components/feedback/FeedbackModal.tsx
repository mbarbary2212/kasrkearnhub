import { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useFeedback, FeedbackCategory, FeedbackSeverity } from '@/hooks/useFeedback';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, ShieldCheck, AlertTriangle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Year {
  id: string;
  name: string;
}

interface Module {
  id: string;
  name: string;
  year_id: string;
}

const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: 'bug', label: 'Bug / Technical issue' },
  { value: 'content_error', label: 'Content error' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'academic_integrity', label: 'Academic integrity concern' },
  { value: 'other', label: 'Other' },
];

const SEVERITIES: { value: FeedbackSeverity; label: string; description: string }[] = [
  { value: 'normal', label: 'Normal', description: 'General feedback' },
  { value: 'urgent', label: 'Urgent', description: 'Needs attention soon' },
  { value: 'extreme', label: 'Extreme condition', description: 'Safety / Abuse / Serious misconduct' },
];

const TABS = [
  { value: 'videos', label: 'Videos' },
  { value: 'resources', label: 'Resources' },
  { value: 'mcqs', label: 'MCQs' },
  { value: 'practical', label: 'Practical' },
  { value: 'short_questions', label: 'Short Questions' },
];

export default function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const { user } = useAuthContext();
  const isMobile = useIsMobile();
  const { submitFeedback, isSubmitting, canSubmit, remainingSubmissions, isCheckingLimit } = useFeedback();

  const [years, setYears] = useState<Year[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Form state
  const [category, setCategory] = useState<FeedbackCategory | ''>('');
  const [severity, setSeverity] = useState<FeedbackSeverity>('normal');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedTab, setSelectedTab] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const [yearsRes, modulesRes] = await Promise.all([
        supabase.from('years').select('id, name').eq('is_active', true).order('display_order'),
        supabase.from('modules').select('id, name, year_id').eq('is_published', true).order('display_order'),
      ]);

      setYears((yearsRes.data as Year[]) || []);
      setModules((modulesRes.data as Module[]) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const filteredModules = selectedYear 
    ? modules.filter(m => m.year_id === selectedYear)
    : modules;

  const resetForm = () => {
    setCategory('');
    setSeverity('normal');
    setSelectedYear('');
    setSelectedModule('');
    setSelectedTab('');
    setMessage('');
    setConsent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category) {
      toast.error('Please select a category');
      return;
    }

    if (message.length < 20) {
      toast.error('Message must be at least 20 characters');
      return;
    }

    if (!consent) {
      toast.error('Please confirm the consent checkbox');
      return;
    }

    if (!canSubmit) {
      toast.error('Daily limit reached (5/day). Try again tomorrow.');
      return;
    }

    const success = await submitFeedback({
      category,
      severity,
      year_id: selectedYear || undefined,
      module_id: selectedModule || undefined,
      tab: selectedTab || undefined,
      message,
    });

    if (success) {
      toast.success('Thanks! Feedback submitted.');
      resetForm();
      onOpenChange(false);
    } else {
      toast.error('Failed to submit feedback. Please try again.');
    }
  };

  const content = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Privacy notice */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-primary">Your Privacy is Protected</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your feedback is completely anonymous. No one can see your identity.
          </p>
        </div>
      </div>

      {/* Rate limit warning */}
      {!isCheckingLimit && (
        <div className="flex items-center gap-2">
          <Badge variant={canSubmit ? 'secondary' : 'destructive'}>
            {remainingSubmissions} submissions remaining today
          </Badge>
        </div>
      )}

      {/* Category */}
      <div className="space-y-2">
        <Label>Category *</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as FeedbackCategory)}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Severity */}
      <div className="space-y-2">
        <Label>Severity *</Label>
        <Select value={severity} onValueChange={(v) => setSeverity(v as FeedbackSeverity)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEVERITIES.map(s => (
              <SelectItem key={s.value} value={s.value}>
                <div className="flex items-center gap-2">
                  {s.value === 'extreme' && <AlertTriangle className="w-4 h-4 text-destructive" />}
                  <span>{s.label}</span>
                  <span className="text-xs text-muted-foreground">- {s.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {severity === 'extreme' && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Extreme reports may require identity disclosure in serious cases.
          </p>
        )}
      </div>

      {/* Related area */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Year (optional)</Label>
          <Select value={selectedYear} onValueChange={(v) => {
            setSelectedYear(v);
            setSelectedModule('');
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {years.map(y => (
                <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Module (optional)</Label>
          <Select value={selectedModule} onValueChange={setSelectedModule}>
            <SelectTrigger>
              <SelectValue placeholder="Select module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {filteredModules.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tab (optional)</Label>
        <Select value={selectedTab} onValueChange={setSelectedTab}>
          <SelectTrigger>
            <SelectValue placeholder="Select tab" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {TABS.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Label>Message * <span className="text-xs text-muted-foreground">(min 20 characters)</span></Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your feedback in detail..."
          rows={4}
          required
          minLength={20}
        />
        <p className="text-xs text-muted-foreground text-right">
          {message.length}/20 min characters
        </p>
      </div>

      {/* Consent */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="consent"
          checked={consent}
          onCheckedChange={(checked) => setConsent(checked as boolean)}
        />
        <Label htmlFor="consent" className="text-sm font-normal cursor-pointer">
          I confirm this report is truthful and respectful.
        </Label>
      </div>

      {/* Submit */}
      <Button 
        type="submit" 
        className="w-full" 
        disabled={isSubmitting || !canSubmit || isCheckingLimit}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Submit Anonymous Feedback
          </>
        )}
      </Button>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Submit Feedback
            </DrawerTitle>
            <DrawerDescription>
              Share your feedback anonymously
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Submit Feedback
          </DialogTitle>
          <DialogDescription>
            Share your feedback anonymously
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
