-- Create badges table for badge definitions
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('practice', 'correctness', 'streak', 'progress')),
  icon_name TEXT NOT NULL DEFAULT 'award',
  tier INTEGER NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 3),
  threshold INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_badges table for earned badges
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB,
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Badges are readable by everyone
CREATE POLICY "Badges are viewable by everyone" 
ON public.badges FOR SELECT USING (true);

-- Users can view their own badges
CREATE POLICY "Users can view their own badges" 
ON public.user_badges FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own badges
CREATE POLICY "Users can insert their own badges" 
ON public.user_badges FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX idx_user_badges_earned_at ON public.user_badges(earned_at DESC);
CREATE INDEX idx_badges_category ON public.badges(category);

-- Seed badge definitions
INSERT INTO public.badges (code, name, description, category, icon_name, tier, threshold) VALUES
-- Practice badges
('first_question', 'First Steps', 'Answer your first practice question', 'practice', 'baby', 1, 1),
('questions_50', 'Getting Warmed Up', 'Answer 50 practice questions', 'practice', 'flame', 1, 50),
('questions_100', 'Century Club', 'Answer 100 practice questions', 'practice', 'target', 2, 100),
('questions_500', 'Question Master', 'Answer 500 practice questions', 'practice', 'crown', 3, 500),
('chapter_complete', 'Chapter Champion', 'Complete all questions in a chapter', 'practice', 'book-check', 2, NULL),

-- Correctness badges
('correct_streak_5', 'Hot Streak', 'Get 5 questions correct in a row', 'correctness', 'zap', 1, 5),
('correct_streak_10', 'On Fire', 'Get 10 questions correct in a row', 'correctness', 'flame', 2, 10),
('accuracy_80', 'Sharp Mind', 'Achieve 80% accuracy on a chapter', 'correctness', 'brain', 2, 80),
('perfect_score', 'Perfectionist', 'Score 100% on a chapter attempt', 'correctness', 'star', 3, 100),

-- Streak badges (daily login/practice)
('streak_3', 'Consistent', 'Practice 3 days in a row', 'streak', 'calendar', 1, 3),
('streak_7', 'Week Warrior', 'Practice 7 days in a row', 'streak', 'calendar-check', 2, 7),
('streak_30', 'Dedicated Learner', 'Practice 30 days in a row', 'streak', 'calendar-heart', 3, 30),

-- Progress badges
('first_video', 'Visual Learner', 'Watch your first lecture video', 'progress', 'play', 1, 1),
('videos_10', 'Video Enthusiast', 'Watch 10 lecture videos', 'progress', 'tv', 2, 10),
('coverage_50', 'Halfway There', 'Complete 50% of a module', 'progress', 'pie-chart', 2, 50),
('module_complete', 'Module Master', 'Complete 100% of a module', 'progress', 'graduation-cap', 3, 100);