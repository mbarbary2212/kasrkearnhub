
-- Delete existing lectures for these departments in this module to avoid duplicates
DELETE FROM lectures 
WHERE module_id = '77bc6e57-25d5-4396-8d42-2e69a7441316'
  AND contributing_department_id IN (
    '0e1bff2b-6737-46fa-8ac9-883157f8b614',  -- Anatomy
    '11ffa0b6-968e-4c9d-ba3b-264910a342f8',  -- Physiology
    'b951b17f-bdde-48b2-ba1d-6fa8bcc44999',  -- Histology
    '303755c1-f06a-4fcc-b30d-7bc759ae1753'   -- Biochemistry
  );

-- Insert Anatomy lectures
INSERT INTO lectures (module_id, contributing_department_id, title, display_order, is_deleted) VALUES
('77bc6e57-25d5-4396-8d42-2e69a7441316', '0e1bff2b-6737-46fa-8ac9-883157f8b614', 'The Thigh – Front & Medial Side', 1, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '0e1bff2b-6737-46fa-8ac9-883157f8b614', 'The Gluteal Region', 2, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '0e1bff2b-6737-46fa-8ac9-883157f8b614', 'Muscles of the Back of Thigh (Hamstrings)', 3, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '0e1bff2b-6737-46fa-8ac9-883157f8b614', 'Popliteal Fossa & Back of Leg', 4, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '0e1bff2b-6737-46fa-8ac9-883157f8b614', 'The Foot', 5, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '0e1bff2b-6737-46fa-8ac9-883157f8b614', 'The Tibiofibular Joints', 6, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '0e1bff2b-6737-46fa-8ac9-883157f8b614', 'Joints of the Lower Limb (Hip & Knee)', 7, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '0e1bff2b-6737-46fa-8ac9-883157f8b614', 'Lymphatics of the Lower Limb', 8, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '0e1bff2b-6737-46fa-8ac9-883157f8b614', 'Veins of the Lower Limb', 9, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '0e1bff2b-6737-46fa-8ac9-883157f8b614', 'Surface Anatomy of the Lower Limb', 10, false);

-- Insert Physiology lectures
INSERT INTO lectures (module_id, contributing_department_id, title, display_order, is_deleted) VALUES
('77bc6e57-25d5-4396-8d42-2e69a7441316', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', 'Transport through the Cell Membrane', 1, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', 'Intercellular Communication', 2, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', 'Physiology of the Nerve', 3, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', 'Membrane Potential', 4, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', 'Resting Membrane Potential', 5, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', 'Action Potential', 6, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', 'Conduction of Nerve Impulse', 7, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', 'Compound Action Potential', 8, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', 'Classification of Nerve Fibers', 9, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', 'Properties of Nerve Fibers', 10, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', 'Synapse', 11, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', 'Neuromuscular Junction', 12, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', 'Muscle Tension', 13, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', 'Skeletal Muscle Contraction', 14, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', 'Excitation-Contraction Coupling', 15, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', 'Sliding Filament Theory', 16, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', 'Types of Muscle Contractions', 17, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', 'Smooth Muscle', 18, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', 'Control of Contractions of Smooth Muscle', 19, false);

-- Insert Histology lectures
INSERT INTO lectures (module_id, contributing_department_id, title, display_order, is_deleted) VALUES
('77bc6e57-25d5-4396-8d42-2e69a7441316', 'b951b17f-bdde-48b2-ba1d-6fa8bcc44999', 'Hyaline Cartilage', 1, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', 'b951b17f-bdde-48b2-ba1d-6fa8bcc44999', 'Elastic Cartilage', 2, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', 'b951b17f-bdde-48b2-ba1d-6fa8bcc44999', 'White Fibrocartilage', 3, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', 'b951b17f-bdde-48b2-ba1d-6fa8bcc44999', 'Compact Bone', 4, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', 'b951b17f-bdde-48b2-ba1d-6fa8bcc44999', 'Cancellous (Spongy) Bone', 5, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', 'b951b17f-bdde-48b2-ba1d-6fa8bcc44999', 'Bone Ossification', 6, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', 'b951b17f-bdde-48b2-ba1d-6fa8bcc44999', 'Skeletal Muscle', 7, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', 'b951b17f-bdde-48b2-ba1d-6fa8bcc44999', 'Cardiac Muscle', 8, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', 'b951b17f-bdde-48b2-ba1d-6fa8bcc44999', 'Smooth Muscle', 9, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', 'b951b17f-bdde-48b2-ba1d-6fa8bcc44999', 'Skin (General)', 10, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', 'b951b17f-bdde-48b2-ba1d-6fa8bcc44999', 'Thick (Non-hairy) Skin', 11, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', 'b951b17f-bdde-48b2-ba1d-6fa8bcc44999', 'Thin (Hairy) Skin', 12, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', 'b951b17f-bdde-48b2-ba1d-6fa8bcc44999', 'Skin Appendages', 13, false);

-- Insert Biochemistry lectures
INSERT INTO lectures (module_id, contributing_department_id, title, display_order, is_deleted) VALUES
('77bc6e57-25d5-4396-8d42-2e69a7441316', '303755c1-f06a-4fcc-b30d-7bc759ae1753', 'Bioenergetics', 1, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '303755c1-f06a-4fcc-b30d-7bc759ae1753', 'Citric Acid Cycle', 2, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '303755c1-f06a-4fcc-b30d-7bc759ae1753', 'Carbohydrate Metabolism', 3, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '303755c1-f06a-4fcc-b30d-7bc759ae1753', 'Lipid Metabolism', 4, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '303755c1-f06a-4fcc-b30d-7bc759ae1753', 'General Protein Metabolism', 5, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '303755c1-f06a-4fcc-b30d-7bc759ae1753', 'Individual Amino Acid Metabolism', 6, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '303755c1-f06a-4fcc-b30d-7bc759ae1753', 'Nucleotide Metabolism', 7, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '303755c1-f06a-4fcc-b30d-7bc759ae1753', 'Integration of Metabolism', 8, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '303755c1-f06a-4fcc-b30d-7bc759ae1753', 'Vitamins', 9, false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '303755c1-f06a-4fcc-b30d-7bc759ae1753', 'Minerals', 10, false);
