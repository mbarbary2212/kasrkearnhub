-- Insert module-department relationships based on user's mapping
-- Using is_primary = true for the first department in each module's list

-- Year 1 modules
-- ISK 101 → Histology / Anatomy & Embryology
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('fe1abaf2-6abd-4084-b188-fb4de5e50771', 'b951b17f-bdde-48b2-ba1d-6fa8bcc44999', true),
('fe1abaf2-6abd-4084-b188-fb4de5e50771', 'f2c2ad86-93a8-498b-81f4-ffc62cee76db', false);

-- INT 102 → Physiology / Biochemistry
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('e0db6c32-5069-422f-9012-0336556a0cd8', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', true),
('e0db6c32-5069-422f-9012-0336556a0cd8', '303755c1-f06a-4fcc-b30d-7bc759ae1753', false);

-- BMS 103 → Biochemistry / Histology / Physiology / Anatomy & Embryology
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('77bc6e57-25d5-4396-8d42-2e69a7441316', '303755c1-f06a-4fcc-b30d-7bc759ae1753', true),
('77bc6e57-25d5-4396-8d42-2e69a7441316', 'b951b17f-bdde-48b2-ba1d-6fa8bcc44999', false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', false),
('77bc6e57-25d5-4396-8d42-2e69a7441316', 'f2c2ad86-93a8-498b-81f4-ffc62cee76db', false);

-- CPS 104 → Histology / Physiology / Anatomy
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('0ed344f7-f237-4d3c-8637-4485cffcaf5c', 'b951b17f-bdde-48b2-ba1d-6fa8bcc44999', true),
('0ed344f7-f237-4d3c-8637-4485cffcaf5c', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', false),
('0ed344f7-f237-4d3c-8637-4485cffcaf5c', '0e1bff2b-6737-46fa-8ac9-883157f8b614', false);

-- INT 108 → Pathology / Pharmacology
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('6659cad7-0609-4d03-a513-60c19204c2ee', 'c17b2ef9-69da-4097-939a-3bf5d9a4c8fc', true),
('6659cad7-0609-4d03-a513-60c19204c2ee', '71af9f4d-578c-45d9-bec7-9598e54728e6', false);

-- MPC 126 → Community Medicine & Public Health
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('e2e6ed83-a8e6-4741-ba3e-78e2c04a9b57', '24b7fe48-2ef8-4484-a2d2-aec60ad4c06d', true);

-- EPE 130 → Family Medicine / Surgery / Skill Lab
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('062628a7-fcc7-45a5-a6c1-ee9c9508b4e4', '4915798b-c8cb-47d8-8a22-8c39c43b6a73', true),
('062628a7-fcc7-45a5-a6c1-ee9c9508b4e4', '07943035-848f-4609-858c-be5478e3806a', false),
('062628a7-fcc7-45a5-a6c1-ee9c9508b4e4', '1fe0d2a5-5410-47c9-8765-d35582b7c9ef', false);

-- Year 2 modules
-- NEU 205 → Histology / Anatomy & Embryology / Physiology
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('1a1b7347-712d-4754-8a7c-afac1cc75b62', 'b951b17f-bdde-48b2-ba1d-6fa8bcc44999', true),
('1a1b7347-712d-4754-8a7c-afac1cc75b62', 'f2c2ad86-93a8-498b-81f4-ffc62cee76db', false),
('1a1b7347-712d-4754-8a7c-afac1cc75b62', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', false);

-- DIG 206 → Anatomy & Embryology / Physiology / Histology / Biochemistry
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('5397c311-333f-469e-b8ca-ade315e31447', 'f2c2ad86-93a8-498b-81f4-ffc62cee76db', true),
('5397c311-333f-469e-b8ca-ade315e31447', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', false),
('5397c311-333f-469e-b8ca-ade315e31447', 'b951b17f-bdde-48b2-ba1d-6fa8bcc44999', false),
('5397c311-333f-469e-b8ca-ade315e31447', '303755c1-f06a-4fcc-b30d-7bc759ae1753', false);

-- END 207 → Anatomy & Embryology / Physiology / Histology
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('ecd6869f-98b2-465f-a99c-988ec5fad71e', 'f2c2ad86-93a8-498b-81f4-ffc62cee76db', true),
('ecd6869f-98b2-465f-a99c-988ec5fad71e', '11ffa0b6-968e-4c9d-ba3b-264910a342f8', false),
('ecd6869f-98b2-465f-a99c-988ec5fad71e', 'b951b17f-bdde-48b2-ba1d-6fa8bcc44999', false);

-- INT 208 → Pathology / Pharmacology
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('64c5402c-4bbd-4758-bf08-544d3a2164cb', 'c17b2ef9-69da-4097-939a-3bf5d9a4c8fc', true),
('64c5402c-4bbd-4758-bf08-544d3a2164cb', '71af9f4d-578c-45d9-bec7-9598e54728e6', false);

-- PAT 210 → Pharmacology / Pathology
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('224178d5-620a-47b6-a267-54e4257c7487', '71af9f4d-578c-45d9-bec7-9598e54728e6', true),
('224178d5-620a-47b6-a267-54e4257c7487', 'c17b2ef9-69da-4097-939a-3bf5d9a4c8fc', false);

-- PSY 213 → Psychiatry
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('66a62ecb-8b63-49b4-8f6d-eae21ddd7767', '009b2eb9-b40c-4433-86fd-17780d98d8fe', true);

-- MPE 227 → Community / Forensic
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('e739f574-21de-4e63-8bee-b90ca618712e', '60864c1c-8a20-4e2d-a845-331af52624ce', true),
('e739f574-21de-4e63-8bee-b90ca618712e', '98be1855-b2e4-49e4-a03c-a7896072a0aa', false);

-- EPE 230 → Family Medicine
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('1cc281d8-f64d-4075-bf5d-1d832a13d20b', '4915798b-c8cb-47d8-8a22-8c39c43b6a73', true);

-- RES 234 → Community Medicine & Public Health
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('476a9fd5-c582-48e7-bf81-8ce654a2100b', '24b7fe48-2ef8-4484-a2d2-aec60ad4c06d', true);

-- Year 3 modules
-- IMN 311 → Microbiology
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('c6afb2dc-3258-42a9-9c6c-2212877d3522', '17993ace-593a-48e2-b9e1-4838023b32af', true);

-- INF 309 → Microbiology / Parasitology
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('0cb955ad-8538-422f-929f-42a28cbad901', '17993ace-593a-48e2-b9e1-4838023b32af', true),
('0cb955ad-8538-422f-929f-42a28cbad901', 'b0718c97-e310-4bf8-ac13-958bc4fe4cbb', false);

-- INV 314 → Radiology / Clinical & Chemical Pathology / Medical Microbiology & Immunology
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('70b09f56-d6b7-4c6d-8ee3-470f158f6337', 'e56c0ba3-e778-4532-bddc-e104163fc600', true),
('70b09f56-d6b7-4c6d-8ee3-470f158f6337', '4169f3ab-1d64-4f97-9438-477ce3274d16', false),
('70b09f56-d6b7-4c6d-8ee3-470f158f6337', '152a2572-130f-4f4a-bd87-9f39f6ae8e1c', false);

-- PAT 310 → Pathology / Pharmacology
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('fd46d479-7be1-454c-aae4-eff7986102d2', 'c17b2ef9-69da-4097-939a-3bf5d9a4c8fc', true),
('fd46d479-7be1-454c-aae4-eff7986102d2', '71af9f4d-578c-45d9-bec7-9598e54728e6', false);

-- OPH 315 → Ophthalmology
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('fc7dfc5b-2a7e-4cf7-abfc-db8a81fb9c10', 'f27e98e3-8a74-45fc-84c0-a87761063e0b', true);

-- ENT 316 → Otorhinolaryngology
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('a3a30087-d7c6-46cc-b29b-b7427921503e', 'c67412d2-7cf3-431f-9260-48593bc2ccd0', true);

-- TOX 317 → Forensic and Toxicology
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('93bc546c-af98-415e-a88a-4c925abcf0e2', '69311a94-009d-4f6a-91b4-d2ac378b0b9e', true);

-- NTR 319 → Community / Family Medicine
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('18e48981-4355-4c9a-8a56-32ef2683e607', '60864c1c-8a20-4e2d-a845-331af52624ce', true),
('18e48981-4355-4c9a-8a56-32ef2683e607', '4915798b-c8cb-47d8-8a22-8c39c43b6a73', false);

-- MPC 326 → Forensic and Toxicology
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('90ff1b55-c569-4abd-bbfa-9fd52d2682b7', '69311a94-009d-4f6a-91b4-d2ac378b0b9e', true);

-- Year 4 modules
-- COM 418 → Community and Public Health
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('4b137436-88bf-4896-b586-447499817723', '24b7fe48-2ef8-4484-a2d2-aec60ad4c06d', true);

-- PSY 413 → Psychiatry
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('6631b016-8a9c-49d7-ab44-4d29caa14564', '009b2eb9-b40c-4433-86fd-17780d98d8fe', true);

-- PLL 421 → Clinical Oncology / Anesthesia & Pain / Pharmacology
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('e4f3f2ab-a02e-4b4a-9240-b2ec68fb7df9', '136cc573-4dc2-409d-a7ea-b52a8da9e0ec', true),
('e4f3f2ab-a02e-4b4a-9240-b2ec68fb7df9', '7fd76f0f-2010-42c3-a292-28ea115e26d0', false),
('e4f3f2ab-a02e-4b4a-9240-b2ec68fb7df9', '71af9f4d-578c-45d9-bec7-9598e54728e6', false);

-- MED 422 → Internal Medicine
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('a6c13735-4299-4c40-8a41-500c6edcf723', '109f101e-ffc2-49c1-8363-387a5708dc6c', true);

-- SUR 423 → General Surgery
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('153318ba-32b9-4f8e-9cbc-bdd8df9b9b10', '863207d4-2958-4429-9317-1841dfd220e2', true);

-- PED 424 → Pediatrics
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('ab57fe78-01bc-4512-8c74-8137632f2443', 'f6a0e136-bfa1-4d9b-9536-963aeb581089', true);

-- OBG 425 → Obstetrics and Gynecology
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('39bc4889-faa8-488f-b42d-dfdab9b3ce60', '0e58f76d-5c13-4746-a408-5fd2dea51514', true);

-- MPC 426 → Community and Public Health
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('40c34b9a-8cc4-4136-a5c0-4bb3c77ef280', '24b7fe48-2ef8-4484-a2d2-aec60ad4c06d', true);

-- Year 5 modules
-- MED 522 → Internal Medicine
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('3786823e-3d93-42fd-a0f0-cced6696009a', '109f101e-ffc2-49c1-8363-387a5708dc6c', true);

-- SUR 523 → General Surgery
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('7f5167dd-b746-4ac6-94f3-109d637df861', '863207d4-2958-4429-9317-1841dfd220e2', true);

-- MPC 526 → Forensic and Toxicology
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('a2320282-dd6f-4aa8-88a5-18e1051d88f2', '69311a94-009d-4f6a-91b4-d2ac378b0b9e', true);

-- FML 520 → Family Medicine
INSERT INTO module_departments (module_id, department_id, is_primary) VALUES
('02b022f1-089f-42be-bffe-6b4e83ef58c8', '4915798b-c8cb-47d8-8a22-8c39c43b6a73', true);