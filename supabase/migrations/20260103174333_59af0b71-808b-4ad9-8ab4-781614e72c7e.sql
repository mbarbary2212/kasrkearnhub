-- Update module titles to remove "Part 1" suffix
UPDATE modules 
SET name = 'PED-424: Pediatrics', updated_at = now()
WHERE id = 'ab57fe78-01bc-4512-8c74-8137632f2443';

UPDATE modules 
SET name = 'OBG-425: Obstetrics & Gynecology', updated_at = now()
WHERE id = '39bc4889-faa8-488f-b42d-dfdab9b3ce60';