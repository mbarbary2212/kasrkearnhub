-- Link Anatomy lectures to Anatomy chapter
UPDATE lectures SET chapter_id = 'c01c5316-f785-4287-ad69-2eb9b196dbf5'
WHERE module_id = '77bc6e57-25d5-4396-8d42-2e69a7441316'
  AND contributing_department_id = '0e1bff2b-6737-46fa-8ac9-883157f8b614'
  AND is_deleted = false;

-- Link Physiology lectures to Physiology chapter
UPDATE lectures SET chapter_id = '721f2d64-607b-44fd-8921-b3c685d2ea4a'
WHERE module_id = '77bc6e57-25d5-4396-8d42-2e69a7441316'
  AND contributing_department_id = '11ffa0b6-968e-4c9d-ba3b-264910a342f8'
  AND is_deleted = false;

-- Link Histology lectures to Histology chapter
UPDATE lectures SET chapter_id = 'af7f8a97-a271-4f7e-9a94-df3b082ebb7b'
WHERE module_id = '77bc6e57-25d5-4396-8d42-2e69a7441316'
  AND contributing_department_id = 'b951b17f-bdde-48b2-ba1d-6fa8bcc44999'
  AND is_deleted = false;

-- Link Biochemistry lectures to Biochemistry chapter
UPDATE lectures SET chapter_id = '9adf17d8-44e9-4b1a-9ddc-4771deb58be6'
WHERE module_id = '77bc6e57-25d5-4396-8d42-2e69a7441316'
  AND contributing_department_id = '303755c1-f06a-4fcc-b30d-7bc759ae1753'
  AND is_deleted = false;