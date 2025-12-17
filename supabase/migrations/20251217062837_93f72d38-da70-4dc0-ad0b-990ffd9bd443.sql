-- Insert default feedback topics
INSERT INTO public.feedback_topics (name, name_ar, description, is_active)
VALUES 
  ('Course Content Quality', 'جودة محتوى المقرر', 'Rate the overall quality of lecture materials and content', true),
  ('Teaching Methods', 'طرق التدريس', 'Feedback on teaching approaches and methods used', true),
  ('Assessment & Exams', 'التقييم والامتحانات', 'Feedback on examination methods and assessment criteria', true),
  ('Practical Sessions', 'الجلسات العملية', 'Rate the quality and effectiveness of practical sessions', true),
  ('Clinical Training', 'التدريب السريري', 'Feedback on clinical rotations and training experiences', true),
  ('Learning Resources', 'مصادر التعلم', 'Rate the availability and quality of learning materials', true),
  ('General Course Feedback', 'ملاحظات عامة على المقرر', 'Overall feedback about the course experience', true);