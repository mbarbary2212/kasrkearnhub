-- Step 1: Add module_id column to topics table
ALTER TABLE topics ADD COLUMN module_id uuid REFERENCES modules(id) ON DELETE CASCADE;

-- Step 2: Create index for better query performance
CREATE INDEX idx_topics_module_id ON topics(module_id);
CREATE INDEX idx_topics_dept_module ON topics(department_id, module_id);

-- Step 3: Delete old global Pharmacology topics (they don't have module_id)
DELETE FROM topics WHERE department_id = '71af9f4d-578c-45d9-bec7-9598e54728e6';

-- Step 4: Insert correct topics for INT-108 (Year 1)
-- Module ID: 6659cad7-0609-4d03-a513-60c19204c2ee
INSERT INTO topics (department_id, module_id, name, slug, description, display_order) VALUES
('71af9f4d-578c-45d9-bec7-9598e54728e6', '6659cad7-0609-4d03-a513-60c19204c2ee', 'Introduction to medical pharmacology', 'intro-medical-pharmacology', 'Lecture', 1),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '6659cad7-0609-4d03-a513-60c19204c2ee', 'Different routes of drug administration', 'routes-drug-admin', 'Lecture', 2),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '6659cad7-0609-4d03-a513-60c19204c2ee', 'Absorption', 'absorption', 'Lecture', 3),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '6659cad7-0609-4d03-a513-60c19204c2ee', 'Distribution', 'distribution', 'Lecture', 4),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '6659cad7-0609-4d03-a513-60c19204c2ee', 'Metabolism', 'metabolism', 'Lecture', 5),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '6659cad7-0609-4d03-a513-60c19204c2ee', 'Excretion', 'excretion', 'Lecture', 6),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '6659cad7-0609-4d03-a513-60c19204c2ee', 'Mechanism of action and dose-response', 'mechanism-dose-response', 'Lecture', 7),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '6659cad7-0609-4d03-a513-60c19204c2ee', 'Types of Receptors and Adverse Drug Reactions 1', 'receptors-adr-1', 'Lecture', 8),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '6659cad7-0609-4d03-a513-60c19204c2ee', 'Adverse drug reaction 2 and drug interaction', 'adr-2-interaction', 'Lecture', 9),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '6659cad7-0609-4d03-a513-60c19204c2ee', 'Skill lab', 'skill-lab', 'Practical', 10);

-- Step 5: Insert correct topics for INT-208 (Year 2)
-- Module ID: 64c5402c-4bbd-4758-bf08-544d3a2164cb
INSERT INTO topics (department_id, module_id, name, slug, description, display_order) VALUES
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Factors affecting action and dose and pharmacogenetics', 'factors-pharmacogenetics', 'Lecture', 1),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Posology and kinetic parameters', 'posology-kinetics', 'Lecture', 2),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Parasympathomimetics 1', 'parasympathomimetics-1', 'Lecture', 3),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Parasympathomimetics 2', 'parasympathomimetics-2', 'Lecture', 4),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Parasympathetic depressants', 'parasympathetic-depressants', 'Lecture', 5),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Myasthenia & organophosphorus', 'myasthenia-organophosphorus', 'Lecture', 6),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Sympathomimetic 1', 'sympathomimetic-1', 'Lecture', 7),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Sympathomimetic 2 and shock', 'sympathomimetic-2-shock', 'Lecture', 8),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Sympathetic depressants 1', 'sympathetic-depressants-1', 'Lecture', 9),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Sympathetic depressants 2', 'sympathetic-depressants-2', 'Lecture', 10),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Sympathetic depressants 3', 'sympathetic-depressants-3', 'Lecture', 11),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Glaucoma', 'glaucoma', 'Lecture', 12),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Muscle relaxants', 'muscle-relaxants', 'Lecture', 13),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Autacoids 1', 'autacoids-1', 'Lecture', 14),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Autacoids 2 / migraine', 'autacoids-2-migraine', 'Lecture', 15),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Angina 1', 'angina-1', 'Lecture', 16),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Angina 2', 'angina-2', 'Lecture', 17),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Angina 3', 'angina-3', 'Lecture', 18),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Diuretics 1', 'diuretics-1', 'Lecture', 19),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Diuretics 2', 'diuretics-2', 'Lecture', 20),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Hypertension 1', 'hypertension-1', 'Lecture', 21),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Hypertension 2', 'hypertension-2', 'Lecture', 22),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Hypertension 3', 'hypertension-3', 'Lecture', 23),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Heart failure 1', 'heart-failure-1', 'Lecture', 24),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Heart failure 2', 'heart-failure-2', 'Lecture', 25),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Heart failure 3', 'heart-failure-3', 'Lecture', 26),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Arrhythmia', 'arrhythmia', 'Lecture', 27),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Anti dyslipidemia 1', 'anti-dyslipidemia-1', 'Lecture', 28),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Anti dyslipidemia 2', 'anti-dyslipidemia-2', 'Lecture', 29),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Blood 1', 'blood-1', 'Lecture', 30),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Blood 2', 'blood-2', 'Lecture', 31),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Blood 3', 'blood-3', 'Lecture', 32),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Anemia', 'anemia', 'Lecture', 33),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Dosage forms 1', 'dosage-forms-1', 'Practical', 34),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Dosage forms 2', 'dosage-forms-2', 'Practical', 35),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'PK properties', 'pk-properties', 'Practical', 36),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Heart and intestine', 'heart-intestine', 'Practical', 37),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'BP and eye', 'bp-eye', 'Practical', 38),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Angina', 'angina-practical', 'Practical', 39),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'HTN', 'htn-practical', 'Practical', 40),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'HF', 'hf-practical', 'Practical', 41),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'DVT', 'dvt-practical', 'Practical', 42),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Pharmacovigilance', 'pharmacovigilance', 'Practical', 43),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Revision', 'revision-int208', 'Practical', 44),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '64c5402c-4bbd-4758-bf08-544d3a2164cb', 'Formative', 'formative-int208', 'Practical', 45);

-- Step 6: Insert correct topics for PAT-210 (Year 2)
-- Module ID: 224178d5-620a-47b6-a267-54e4257c7487
INSERT INTO topics (department_id, module_id, name, slug, description, display_order) VALUES
('71af9f4d-578c-45d9-bec7-9598e54728e6', '224178d5-620a-47b6-a267-54e4257c7487', 'Peptic ulcer 1', 'peptic-ulcer-1', 'Lecture', 1),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '224178d5-620a-47b6-a267-54e4257c7487', 'Peptic ulcer 2', 'peptic-ulcer-2', 'Lecture', 2),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '224178d5-620a-47b6-a267-54e4257c7487', 'Antiemetics & Prokinetic, Antidiarrheal', 'antiemetics-prokinetic', 'Lecture', 3),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '224178d5-620a-47b6-a267-54e4257c7487', 'Purgatives, IBS, IBD, Antispasmodics', 'purgatives-ibs-ibd', 'Lecture', 4),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '224178d5-620a-47b6-a267-54e4257c7487', 'Bronchial asthma 1', 'bronchial-asthma-1', 'Lecture', 5),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '224178d5-620a-47b6-a267-54e4257c7487', 'Bronchial asthma 2', 'bronchial-asthma-2', 'Lecture', 6),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '224178d5-620a-47b6-a267-54e4257c7487', 'Cough therapy', 'cough-therapy', 'Lecture', 7),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '224178d5-620a-47b6-a267-54e4257c7487', 'Peptic ulcer', 'peptic-ulcer-practical', 'Practical', 8),
('71af9f4d-578c-45d9-bec7-9598e54728e6', '224178d5-620a-47b6-a267-54e4257c7487', 'Bronchial asthma', 'bronchial-asthma-practical', 'Practical', 9);

-- Step 7: Insert correct topics for PAT-310 (Year 3)
-- Module ID: fd46d479-7be1-454c-aae4-eff7986102d2
INSERT INTO topics (department_id, module_id, name, slug, description, display_order) VALUES
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Treatment of Diabetes mellitus 1', 'diabetes-1', 'Lecture', 1),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Treatment of Diabetes mellitus 2', 'diabetes-2', 'Lecture', 2),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Treatment of Diabetes mellitus 3', 'diabetes-3', 'Lecture', 3),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Treatment of Thyroid disorders', 'thyroid-disorders', 'Lecture', 4),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Adrenocorticosteroid prep. 1', 'corticosteroid-1', 'Lecture', 5),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Adrenocorticosteroid prep. 2', 'corticosteroid-2', 'Lecture', 6),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Sex hormones & modulators 1', 'sex-hormones-1', 'Lecture', 7),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Sex hormones, modulators & contraception', 'sex-hormones-contraception', 'Lecture', 8),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Calcium homeostasis & Osteoporosis', 'calcium-osteoporosis', 'Lecture', 9),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Pituitary analogues', 'pituitary-analogues', 'Lecture', 10),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Sedatives & hypnotics', 'sedatives-hypnotics', 'Lecture', 11),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Opioids 1', 'opioids-1', 'Lecture', 12),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Opioids 2', 'opioids-2', 'Lecture', 13),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'NSAID 1', 'nsaid-1', 'Lecture', 14),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'NSAID 2', 'nsaid-2', 'Lecture', 15),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Gout', 'gout', 'Lecture', 16),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Antidepressants', 'antidepressants', 'Lecture', 17),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Antiparkinsonian drugs', 'antiparkinsonian', 'Lecture', 18),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Antipsychotics', 'antipsychotics', 'Lecture', 19),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Antiepileptics', 'antiepileptics', 'Lecture', 20),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'General anesthesia', 'general-anesthesia', 'Lecture', 21),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Local anesthesia', 'local-anesthesia', 'Lecture', 22),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'CNS stimulants & Doping agents', 'cns-stimulants-doping', 'Lecture', 23),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Cell wall synthesis inhibitors 1', 'cell-wall-inhibitors-1', 'Lecture', 24),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Cell wall synthesis inhibitors 2', 'cell-wall-inhibitors-2', 'Lecture', 25),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Protein synthesis inhibitors 1', 'protein-inhibitors-1', 'Lecture', 26),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Protein synthesis inhibitors 2', 'protein-inhibitors-2', 'Lecture', 27),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Nucleic acid synthesis inhibitors', 'nucleic-acid-inhibitors', 'Lecture', 28),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Treatment of tuberculosis', 'tuberculosis', 'Lecture', 29),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Antifungal drugs', 'antifungal', 'Lecture', 30),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Antiviral drugs 1', 'antiviral-1', 'Lecture', 31),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Antiviral drugs 2', 'antiviral-2', 'Lecture', 32),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Anti-protozoa & helminths', 'antiprotozoa-helminths', 'Lecture', 33),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Diabetes Mellitus', 'dm-practical', 'Practical', 34),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Endocrinal emergencies', 'endocrinal-emergencies', 'Practical', 35),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Obesity', 'obesity', 'Practical', 36),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Sleep disorders', 'sleep-disorders', 'Practical', 37),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Pain', 'pain-practical', 'Practical', 38),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Nutrition and IV fluids', 'nutrition-iv-fluids', 'Practical', 39),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Infection pharmacotherapy 1', 'infection-pharm-1', 'Practical', 40),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Infection pharmacotherapy 2', 'infection-pharm-2', 'Practical', 41),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Infection pharmacotherapy 3', 'infection-pharm-3', 'Practical', 42),
('71af9f4d-578c-45d9-bec7-9598e54728e6', 'fd46d479-7be1-454c-aae4-eff7986102d2', 'Formative', 'formative-pat310', 'Practical', 43);

-- Step 8: Add Pharmacology department to the relevant modules in module_departments
INSERT INTO module_departments (module_id, department_id, is_primary)
VALUES 
  ('6659cad7-0609-4d03-a513-60c19204c2ee', '71af9f4d-578c-45d9-bec7-9598e54728e6', false),
  ('64c5402c-4bbd-4758-bf08-544d3a2164cb', '71af9f4d-578c-45d9-bec7-9598e54728e6', false),
  ('224178d5-620a-47b6-a267-54e4257c7487', '71af9f4d-578c-45d9-bec7-9598e54728e6', false),
  ('fd46d479-7be1-454c-aae4-eff7986102d2', '71af9f4d-578c-45d9-bec7-9598e54728e6', false)
ON CONFLICT DO NOTHING;