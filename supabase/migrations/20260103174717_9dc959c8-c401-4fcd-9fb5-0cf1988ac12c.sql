-- Update module descriptions to remove "Part 1" suffix
UPDATE modules 
SET description = 'Pediatric medicine', updated_at = now()
WHERE id = 'ab57fe78-01bc-4512-8c74-8137632f2443';

UPDATE modules 
SET description = 'Obstetrics and gynecology', updated_at = now()
WHERE id = '39bc4889-faa8-488f-b42d-dfdab9b3ce60';