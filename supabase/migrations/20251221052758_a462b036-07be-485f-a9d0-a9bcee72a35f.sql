-- Add missing departments mentioned in the module mappings
INSERT INTO public.departments (name, slug, category, years, display_order) VALUES
('Anatomy & Embryology', 'anatomy-embryology', 'basic', ARRAY[1,2,3], 1),
('Clinical & Chemical Pathology', 'clinical-chemical-pathology', 'basic', ARRAY[3,4,5], 25),
('Medical Microbiology & Immunology', 'medical-microbiology-immunology', 'basic', ARRAY[3,4,5], 26),
('Anesthesia & Pain', 'anesthesia-pain', 'clinical', ARRAY[4,5], 27),
('Community Medicine & Public Health', 'community-public-health', 'basic', ARRAY[1,2,3,4,5], 28),
('Forensic and Toxicology', 'forensic-toxicology', 'basic', ARRAY[3,4,5], 29),
('Clinical Oncology', 'clinical-oncology', 'clinical', ARRAY[4,5], 30),
('Skill Lab', 'skill-lab', 'basic', ARRAY[1,2,3,4,5], 31),
('General Surgery', 'general-surgery', 'clinical', ARRAY[4,5], 32),
('Otorhinolaryngology', 'otorhinolaryngology', 'clinical', ARRAY[3,4,5], 33)
ON CONFLICT (slug) DO NOTHING;