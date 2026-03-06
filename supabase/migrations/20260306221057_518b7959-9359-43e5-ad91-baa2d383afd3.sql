CREATE POLICY "Students can update own section answers"
ON public.case_section_answers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM virtual_patient_attempts
    WHERE virtual_patient_attempts.id = case_section_answers.attempt_id
    AND virtual_patient_attempts.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM virtual_patient_attempts
    WHERE virtual_patient_attempts.id = case_section_answers.attempt_id
    AND virtual_patient_attempts.user_id = auth.uid()
  )
);