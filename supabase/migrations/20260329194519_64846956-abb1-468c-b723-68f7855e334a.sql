
CREATE TABLE public.assessment_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessment_structures(id) ON DELETE CASCADE,
  rule_key text NOT NULL,
  rule_value jsonb NOT NULL DEFAULT 'true'::jsonb,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, rule_key)
);

ALTER TABLE public.assessment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rules"
  ON public.assessment_rules FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage rules"
  ON public.assessment_rules FOR ALL
  TO authenticated USING (
    public.is_platform_admin_or_higher(auth.uid())
    OR public.is_any_module_admin(auth.uid())
  );

CREATE TRIGGER update_rules_updated_at
  BEFORE UPDATE ON public.assessment_rules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
