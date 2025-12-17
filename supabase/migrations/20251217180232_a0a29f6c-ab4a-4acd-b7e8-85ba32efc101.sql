-- Clear existing years and modules to reseed
DELETE FROM modules;
DELETE FROM years;

-- Insert Year 1
INSERT INTO years (id, number, name, name_ar, subtitle, description, color, display_order, is_active)
VALUES (
  gen_random_uuid(),
  1,
  'Year 1',
  'السنة الأولى',
  'Basic Medical Sciences',
  'Foundation year covering basic medical sciences',
  'bg-blue-500',
  1,
  true
);

-- Insert Year 2
INSERT INTO years (id, number, name, name_ar, subtitle, description, color, display_order, is_active)
VALUES (
  gen_random_uuid(),
  2,
  'Year 2',
  'السنة الثانية',
  'Basic Medical Sciences',
  'Second year basic medical sciences',
  'bg-green-500',
  2,
  true
);

-- Insert Year 3
INSERT INTO years (id, number, name, name_ar, subtitle, description, color, display_order, is_active)
VALUES (
  gen_random_uuid(),
  3,
  'Year 3',
  'السنة الثالثة',
  'Basic & Clinical Sciences',
  'Transition year with basic and clinical modules',
  'bg-yellow-500',
  3,
  true
);

-- Insert Year 4
INSERT INTO years (id, number, name, name_ar, subtitle, description, color, display_order, is_active)
VALUES (
  gen_random_uuid(),
  4,
  'Year 4',
  'السنة الرابعة',
  'Clinical Sciences',
  'Clinical sciences year',
  'bg-orange-500',
  4,
  true
);

-- Insert Year 5
INSERT INTO years (id, number, name, name_ar, subtitle, description, color, display_order, is_active)
VALUES (
  gen_random_uuid(),
  5,
  'Year 5',
  'السنة الخامسة',
  'Clinical Sciences',
  'Final clinical sciences year',
  'bg-red-500',
  5,
  true
);

-- Now insert modules for each year
-- Year 1 Modules
INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'isk-101',
  'ISK-101: Normal Structure of the Human Body',
  'التركيب الطبيعي لجسم الإنسان',
  'Introduction to human anatomy and normal body structure',
  1,
  true
FROM years y WHERE y.number = 1;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'int-102',
  'INT-102: Introduction to Biomedical Sciences',
  'مقدمة في العلوم الطبية الحيوية',
  'Foundation concepts in biomedical sciences',
  2,
  true
FROM years y WHERE y.number = 1;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'bms-103',
  'BMS-103: Biomedical Sciences & Musculoskeletal System',
  'العلوم الطبية الحيوية والجهاز العضلي الهيكلي',
  'Study of biomedical sciences with focus on musculoskeletal system',
  3,
  true
FROM years y WHERE y.number = 1;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'cps-104',
  'CPS-104: Cardiopulmonary System',
  'الجهاز القلبي الرئوي',
  'Study of the cardiovascular and respiratory systems',
  4,
  true
FROM years y WHERE y.number = 1;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'int-108',
  'INT-108: Principles of Disease Mechanism & Pharmacological Basis of Drug Therapy-1',
  'مبادئ آليات المرض والأساس الدوائي للعلاج-1',
  'Introduction to disease mechanisms and pharmacology',
  5,
  true
FROM years y WHERE y.number = 1;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'epe-130',
  'EPE-130: Early Patient Encounter 1',
  'اللقاء المبكر بالمريض 1',
  'First exposure to patient interactions',
  6,
  true
FROM years y WHERE y.number = 1;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'mpc-126',
  'MPC-126: Medical Professionalism & Communication Skills 1',
  'الاحترافية الطبية ومهارات التواصل 1',
  'Development of professional and communication skills',
  7,
  true
FROM years y WHERE y.number = 1;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'crt-100',
  'CRT-100: Critical Thinking',
  'التفكير النقدي',
  'Critical thinking and problem solving skills',
  8,
  true
FROM years y WHERE y.number = 1;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'ter-127',
  'TER-127: Medical Terminology',
  'المصطلحات الطبية',
  'Introduction to medical terminology',
  9,
  true
FROM years y WHERE y.number = 1;

-- Year 2 Modules
INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'neu-205',
  'NEU-205: Neuroscience',
  'علوم الأعصاب',
  'Study of the nervous system',
  1,
  true
FROM years y WHERE y.number = 2;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'dig-206',
  'DIG-206: Digestive System & Renal System',
  'الجهاز الهضمي والجهاز البولي',
  'Study of digestive and renal systems',
  2,
  true
FROM years y WHERE y.number = 2;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'end-207',
  'END-207: Endocrine & Reproductive System',
  'الجهاز الصماوي والتناسلي',
  'Study of endocrine and reproductive systems',
  3,
  true
FROM years y WHERE y.number = 2;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'int-208',
  'INT-208: Pharmacological Basis of Drug Therapy-2',
  'الأساس الدوائي للعلاج-2',
  'Advanced pharmacology concepts',
  4,
  true
FROM years y WHERE y.number = 2;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'psy-213',
  'PSY-213: Behavioral & Cognitive Sciences',
  'العلوم السلوكية والمعرفية',
  'Psychology and behavioral sciences in medicine',
  5,
  true
FROM years y WHERE y.number = 2;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'pat-210',
  'PAT-210: Systemic Pathology & Therapeutics-1',
  'علم الأمراض الجهازي والعلاجات-1',
  'Introduction to systemic pathology',
  6,
  true
FROM years y WHERE y.number = 2;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'res-234',
  'RES-234: Medical Research & EBM-1',
  'البحث الطبي والطب المبني على الأدلة-1',
  'Introduction to medical research and evidence-based medicine',
  7,
  true
FROM years y WHERE y.number = 2;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'epe-230',
  'EPE-230: Early Patient Encounter 2',
  'اللقاء المبكر بالمريض 2',
  'Continued patient interaction experience',
  8,
  true
FROM years y WHERE y.number = 2;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'mpc-227',
  'MPC-227: Medical Professionalism & Medical Ethics & Law',
  'الاحترافية الطبية وأخلاقيات الطب والقانون',
  'Medical ethics, law, and professionalism',
  9,
  true
FROM years y WHERE y.number = 2;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'cmp-235',
  'CMP-235: Computer',
  'الحاسب الآلي',
  'Computer skills for medical students',
  10,
  true
FROM years y WHERE y.number = 2;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'ssc-1',
  'SSC-1: Student Selected Component 1',
  'المكون الاختياري للطالب 1',
  'Student selected elective module',
  11,
  true
FROM years y WHERE y.number = 2;

-- Year 3 Modules (Basic - 30 credits)
INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'inf-309',
  'INF-309: Infectious Diseases',
  'الأمراض المعدية',
  'Study of infectious diseases and their management',
  1,
  true
FROM years y WHERE y.number = 3;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'pat-310',
  'PAT-310: Systemic Pathology & Therapeutics-2',
  'علم الأمراض الجهازي والعلاجات-2',
  'Advanced systemic pathology',
  2,
  true
FROM years y WHERE y.number = 3;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'imn-311',
  'IMN-311: Immunology',
  'علم المناعة',
  'Study of the immune system',
  3,
  true
FROM years y WHERE y.number = 3;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'inv-314',
  'INV-314: Investigative Medicine',
  'الطب التحقيقي',
  'Diagnostic investigations in medicine',
  4,
  true
FROM years y WHERE y.number = 3;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'ssc-2',
  'SSC-2: Student Selected Component 2',
  'المكون الاختياري للطالب 2',
  'Student selected elective module',
  5,
  true
FROM years y WHERE y.number = 3;

-- Year 3 Modules (Clinical sciences - Module 19)
INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'oph-315',
  'OPH-315: Eye Disorders',
  'أمراض العيون',
  'Ophthalmology and eye disorders',
  6,
  true
FROM years y WHERE y.number = 3;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'ent-316',
  'ENT-316: Ear, Nose & Throat',
  'الأذن والأنف والحنجرة',
  'Otorhinolaryngology',
  7,
  true
FROM years y WHERE y.number = 3;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'tox-317',
  'TOX-317: Clinical Toxicology & Legal Medicine',
  'علم السموم السريري والطب الشرعي',
  'Toxicology and forensic medicine',
  8,
  true
FROM years y WHERE y.number = 3;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'ntr-319',
  'NTR-319: Nutrition',
  'التغذية',
  'Clinical nutrition',
  9,
  true
FROM years y WHERE y.number = 3;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'mpc-326',
  'MPC-326: Medical Professionalism & Communication Skills-2',
  'الاحترافية الطبية ومهارات التواصل-2',
  'Advanced professionalism and communication',
  10,
  true
FROM years y WHERE y.number = 3;

-- Year 4 Modules (Clinical sciences)
INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'psy-413',
  'PSY-413: Psychiatry',
  'الطب النفسي',
  'Clinical psychiatry',
  1,
  true
FROM years y WHERE y.number = 4;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'com-418',
  'COM-418: Community Medicine',
  'طب المجتمع',
  'Public health and community medicine',
  2,
  true
FROM years y WHERE y.number = 4;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'pll-421',
  'PLL-421: Palliative Medicine & Oncology',
  'الرعاية التلطيفية وعلم الأورام',
  'Palliative care and oncology',
  3,
  true
FROM years y WHERE y.number = 4;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'med-422',
  'MED-422: Medicine 1',
  'الباطنة 1',
  'Internal medicine - Part 1',
  4,
  true
FROM years y WHERE y.number = 4;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'sur-423',
  'SUR-423: Surgery 1',
  'الجراحة 1',
  'General surgery - Part 1',
  5,
  true
FROM years y WHERE y.number = 4;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'ped-424',
  'PED-424: Pediatrics 1',
  'طب الأطفال 1',
  'Pediatric medicine - Part 1',
  6,
  true
FROM years y WHERE y.number = 4;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'obg-425',
  'OBG-425: Obstetrics & Gynecology 1',
  'النساء والتوليد 1',
  'Obstetrics and gynecology - Part 1',
  7,
  true
FROM years y WHERE y.number = 4;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'mpc-426',
  'MPC-426: Medical Professionalism & Communication Skills 3',
  'الاحترافية الطبية ومهارات التواصل 3',
  'Advanced professionalism and communication',
  8,
  true
FROM years y WHERE y.number = 4;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'ssc-3',
  'SSC-3: Student Selected Component 3',
  'المكون الاختياري للطالب 3',
  'Student selected elective module',
  9,
  true
FROM years y WHERE y.number = 4;

-- Year 5 Modules (Clinical sciences)
INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'med-522',
  'MED-522: Medicine 2',
  'الباطنة 2',
  'Internal medicine - Part 2',
  1,
  true
FROM years y WHERE y.number = 5;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'sur-523',
  'SUR-523: Surgery 2',
  'الجراحة 2',
  'General surgery - Part 2',
  2,
  true
FROM years y WHERE y.number = 5;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'fml-520',
  'FML-520: Family Medicine',
  'طب الأسرة',
  'Family medicine and primary care',
  3,
  true
FROM years y WHERE y.number = 5;

INSERT INTO modules (id, year_id, slug, name, name_ar, description, display_order, is_published)
SELECT 
  gen_random_uuid(),
  y.id,
  'mpc-526',
  'MPC-526: Medical Professionalism & Communication Skills 4',
  'الاحترافية الطبية ومهارات التواصل 4',
  'Final professionalism and communication skills module',
  4,
  true
FROM years y WHERE y.number = 5;