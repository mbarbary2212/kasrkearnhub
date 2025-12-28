-- Fix existing matching questions that were imported without topic_id
-- They were imported for topic ce96099c-5c77-4d5f-b26c-f2eede04fbff
UPDATE matching_questions 
SET topic_id = 'ce96099c-5c77-4d5f-b26c-f2eede04fbff' 
WHERE module_id = '6659cad7-0609-4d03-a513-60c19204c2ee' 
AND topic_id IS NULL;