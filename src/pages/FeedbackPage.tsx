import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, MessageSquare, Star, ShieldCheck, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Department, FeedbackTopic } from '@/types/database';

interface RatingInputProps {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}

function RatingInput({ label, value, onChange }: RatingInputProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`p-2 rounded-lg border transition-all ${
              value === rating
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-muted border-border'
            }`}
          >
            <Star className={`w-5 h-5 ${value && value >= rating ? 'fill-current' : ''}`} />
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {value === 1 && 'Poor'}
        {value === 2 && 'Below Average'}
        {value === 3 && 'Average'}
        {value === 4 && 'Good'}
        {value === 5 && 'Excellent'}
      </p>
    </div>
  );
}

export default function FeedbackPage() {
  const { user, isLoading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [feedbackTopics, setFeedbackTopics] = useState<FeedbackTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [contentQuality, setContentQuality] = useState<number | null>(null);
  const [teachingEffectiveness, setTeachingEffectiveness] = useState<number | null>(null);
  const [resourceAvailability, setResourceAvailability] = useState<number | null>(null);
  const [overallSatisfaction, setOverallSatisfaction] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  const [suggestions, setSuggestions] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: depts } = await supabase
          .from('departments')
          .select('*')
          .order('display_order');

        const { data: topics } = await supabase
          .from('feedback_topics')
          .select('*')
          .eq('is_active', true);

        setDepartments((depts as Department[]) || []);
        setFeedbackTopics((topics as FeedbackTopic[]) || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDepartment || !selectedTopic) {
      toast.error('Please select a department and feedback topic');
      return;
    }

    if (!contentQuality || !teachingEffectiveness || !resourceAvailability || !overallSatisfaction) {
      toast.error('Please provide all ratings');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('student_feedback').insert({
        department_id: selectedDepartment,
        feedback_topic_id: selectedTopic,
        content_quality: contentQuality,
        teaching_effectiveness: teachingEffectiveness,
        resource_availability: resourceAvailability,
        overall_satisfaction: overallSatisfaction,
        comments: comments.trim() || null,
        suggestions: suggestions.trim() || null,
        academic_year: new Date().getFullYear(),
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Feedback submitted anonymously');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTopics = feedbackTopics.filter(
    t => !t.department_id || t.department_id === selectedDepartment
  );

  if (authLoading || isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (submitted) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto text-center py-12 animate-fade-in">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-heading font-bold mb-2">Thank You!</h1>
          <p className="text-muted-foreground mb-6">
            Your feedback has been submitted anonymously. Your identity is protected and your response will only be shown in aggregated form.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setSubmitted(false)}>
              Submit Another Response
            </Button>
            <Button variant="outline" onClick={() => navigate('/')}>
              Return Home
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-heading font-bold">Student Feedback</h1>
            <p className="text-muted-foreground">Share your thoughts to help improve our courses</p>
          </div>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-primary">Your Privacy is Protected</p>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  <li>• Your feedback is completely anonymous</li>
                  <li>• No individual responses are ever visible to faculty</li>
                  <li>• Results are only shown in aggregated form</li>
                  <li>• A minimum of 5 responses is required before any data is visible</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Course Feedback Form</CardTitle>
            <CardDescription>
              Rate your experience with the course content and teaching
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Department *</Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Feedback Topic *</Label>
                  <Select 
                    value={selectedTopic} 
                    onValueChange={setSelectedTopic}
                    disabled={!selectedDepartment || filteredTopics.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !selectedDepartment 
                          ? "Select department first" 
                          : filteredTopics.length === 0 
                            ? "No topics available"
                            : "Select topic"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTopics.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <RatingInput
                  label="Content Quality *"
                  value={contentQuality}
                  onChange={setContentQuality}
                />
                <RatingInput
                  label="Teaching Effectiveness *"
                  value={teachingEffectiveness}
                  onChange={setTeachingEffectiveness}
                />
                <RatingInput
                  label="Resource Availability *"
                  value={resourceAvailability}
                  onChange={setResourceAvailability}
                />
                <RatingInput
                  label="Overall Satisfaction *"
                  value={overallSatisfaction}
                  onChange={setOverallSatisfaction}
                />
              </div>

              <div className="space-y-2">
                <Label>Comments (Optional)</Label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Share any additional thoughts about the course..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Suggestions for Improvement (Optional)</Label>
                <Textarea
                  value={suggestions}
                  onChange={(e) => setSuggestions(e.target.value)}
                  placeholder="How can we make this course better?"
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
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
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}