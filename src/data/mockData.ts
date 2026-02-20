import { Department, Topic, VideoLesson, Quiz } from '@/types';

export const departments: Department[] = [
  // Basic Sciences
  {
    id: 'anatomy',
    name: 'Anatomy',
    description: 'Study of the structure of the human body',
    icon: 'Bone',
    years: [1, 2],
    category: 'basic',
  },
  {
    id: 'physiology',
    name: 'Physiology',
    description: 'Study of the functions of living organisms',
    icon: 'Heart',
    years: [1, 2],
    category: 'basic',
  },
  {
    id: 'biochemistry',
    name: 'Biochemistry',
    description: 'Chemical processes within living organisms',
    icon: 'FlaskConical',
    years: [1, 2],
    category: 'basic',
  },
  {
    id: 'pathology',
    name: 'Pathology',
    description: 'Study of disease causes and effects',
    icon: 'Microscope',
    years: [2, 3],
    category: 'basic',
  },
  {
    id: 'pharmacology',
    name: 'Pharmacology',
    description: 'Study of drugs and their effects',
    icon: 'Pill',
    years: [2, 3],
    category: 'basic',
  },
  {
    id: 'microbiology',
    name: 'Microbiology',
    description: 'Study of microorganisms',
    icon: 'Bug',
    years: [2, 3],
    category: 'basic',
  },
  // Clinical Departments
  {
    id: 'internal-medicine',
    name: 'Internal Medicine',
    description: 'Diagnosis and treatment of adult diseases',
    icon: 'Stethoscope',
    years: [3, 4, 5],
    category: 'clinical',
  },
  {
    id: 'surgery',
    name: 'Surgery',
    description: 'Operative treatment of diseases and injuries',
    icon: 'Scissors',
    years: [3, 4, 5],
    category: 'clinical',
  },
  {
    id: 'obgyn',
    name: 'OB/GYN',
    description: 'Obstetrics and Gynecology',
    icon: 'Baby',
    years: [4, 5],
    category: 'clinical',
  },
  {
    id: 'pediatrics',
    name: 'Pediatrics',
    description: 'Medical care of infants and children',
    icon: 'Baby',
    years: [4, 5],
    category: 'clinical',
  },
];

export const topics: Topic[] = [
  // Anatomy Topics
  { id: 'upper-limb', departmentId: 'anatomy', name: 'Upper Limb', description: 'Anatomy of the arm, forearm, and hand', order: 1 },
  { id: 'lower-limb', departmentId: 'anatomy', name: 'Lower Limb', description: 'Anatomy of the thigh, leg, and foot', order: 2 },
  { id: 'thorax', departmentId: 'anatomy', name: 'Thorax', description: 'Anatomy of the chest cavity', order: 3 },
  { id: 'abdomen', departmentId: 'anatomy', name: 'Abdomen', description: 'Anatomy of the abdominal cavity', order: 4 },
  { id: 'head-neck', departmentId: 'anatomy', name: 'Head & Neck', description: 'Anatomy of the head and neck region', order: 5 },
  
  // Physiology Topics
  { id: 'cardiovascular', departmentId: 'physiology', name: 'Cardiovascular System', description: 'Heart and blood vessel function', order: 1 },
  { id: 'respiratory', departmentId: 'physiology', name: 'Respiratory System', description: 'Breathing and gas exchange', order: 2 },
  { id: 'renal', departmentId: 'physiology', name: 'Renal System', description: 'Kidney function and fluid balance', order: 3 },
  { id: 'neurophysiology', departmentId: 'physiology', name: 'Neurophysiology', description: 'Nervous system function', order: 4 },
  
  // Biochemistry Topics
  { id: 'carbohydrates', departmentId: 'biochemistry', name: 'Carbohydrate Metabolism', description: 'Glucose and glycogen metabolism', order: 1 },
  { id: 'lipids', departmentId: 'biochemistry', name: 'Lipid Metabolism', description: 'Fat metabolism and cholesterol', order: 2 },
  { id: 'proteins', departmentId: 'biochemistry', name: 'Protein Metabolism', description: 'Amino acids and protein synthesis', order: 3 },
  
  // Pathology Topics
  { id: 'cell-injury', departmentId: 'pathology', name: 'Cell Injury', description: 'Cellular adaptations and death', order: 1 },
  { id: 'inflammation', departmentId: 'pathology', name: 'Inflammation', description: 'Acute and chronic inflammation', order: 2 },
  { id: 'neoplasia', departmentId: 'pathology', name: 'Neoplasia', description: 'Tumor biology and cancer', order: 3 },
  
  // Pharmacology Topics
  { id: 'pharmacokinetics', departmentId: 'pharmacology', name: 'Pharmacokinetics', description: 'Drug absorption, distribution, metabolism', order: 1 },
  { id: 'autonomic-drugs', departmentId: 'pharmacology', name: 'Autonomic Drugs', description: 'Drugs affecting the autonomic nervous system', order: 2 },
  { id: 'cardiovascular-drugs', departmentId: 'pharmacology', name: 'Cardiovascular Drugs', description: 'Drugs for heart and blood pressure', order: 3 },
  
  // Microbiology Topics
  { id: 'bacteriology', departmentId: 'microbiology', name: 'Bacteriology', description: 'Study of bacteria', order: 1 },
  { id: 'virology', departmentId: 'microbiology', name: 'Virology', description: 'Study of viruses', order: 2 },
  { id: 'parasitology', departmentId: 'microbiology', name: 'Parasitology', description: 'Study of parasites', order: 3 },
  
  // Internal Medicine Topics
  { id: 'cardiology', departmentId: 'internal-medicine', name: 'Cardiology', description: 'Heart diseases', order: 1 },
  { id: 'pulmonology', departmentId: 'internal-medicine', name: 'Pulmonology', description: 'Lung diseases', order: 2 },
  { id: 'gastroenterology', departmentId: 'internal-medicine', name: 'Gastroenterology', description: 'Digestive system diseases', order: 3 },
  { id: 'endocrinology', departmentId: 'internal-medicine', name: 'Endocrinology', description: 'Hormone disorders', order: 4 },
  
  // Surgery Topics
  { id: 'general-surgery', departmentId: 'surgery', name: 'General Surgery', description: 'Common surgical conditions', order: 1 },
  { id: 'orthopedics', departmentId: 'surgery', name: 'Orthopedics', description: 'Bone and joint surgery', order: 2 },
  { id: 'urology', departmentId: 'surgery', name: 'Urology', description: 'Urinary tract surgery', order: 3 },
  
  // OB/GYN Topics
  { id: 'normal-pregnancy', departmentId: 'obgyn', name: 'Normal Pregnancy', description: 'Physiological changes in pregnancy', order: 1 },
  { id: 'high-risk-pregnancy', departmentId: 'obgyn', name: 'High-Risk Pregnancy', description: 'Complications in pregnancy', order: 2 },
  { id: 'gynecological-disorders', departmentId: 'obgyn', name: 'Gynecological Disorders', description: 'Female reproductive disorders', order: 3 },
  
  // Pediatrics Topics
  { id: 'neonatology', departmentId: 'pediatrics', name: 'Neonatology', description: 'Newborn care', order: 1 },
  { id: 'pediatric-infections', departmentId: 'pediatrics', name: 'Pediatric Infections', description: 'Common childhood infections', order: 2 },
  { id: 'growth-development', departmentId: 'pediatrics', name: 'Growth & Development', description: 'Child development milestones', order: 3 },
];

export const videoLessons: VideoLesson[] = [
  {
    id: 'video-1',
    topicId: 'upper-limb',
    title: 'Introduction to Upper Limb Anatomy',
    description: 'Overview of bones, muscles, and nerves of the upper limb',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '15:30',
    order: 1,
  },
  {
    id: 'video-2',
    topicId: 'upper-limb',
    title: 'Brachial Plexus',
    description: 'Detailed anatomy of the brachial plexus',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '22:45',
    order: 2,
  },
  {
    id: 'video-3',
    topicId: 'cardiovascular',
    title: 'Cardiac Cycle',
    description: 'Understanding the phases of the cardiac cycle',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '18:20',
    order: 1,
  },
];

export const quizzes: Quiz[] = [
  {
    id: 'quiz-1',
    topicId: 'upper-limb',
    title: 'Upper Limb MCQs',
    description: 'Test your knowledge of upper limb anatomy',
    questions: [
      {
        id: 'q1',
        question: 'Which nerve is commonly affected in carpal tunnel syndrome?',
        options: ['Radial nerve', 'Ulnar nerve', 'Median nerve', 'Musculocutaneous nerve'],
        correctAnswer: 2,
        explanation: 'The median nerve passes through the carpal tunnel and is compressed in carpal tunnel syndrome.',
      },
      {
        id: 'q2',
        question: 'The deltoid muscle is innervated by which nerve?',
        options: ['Axillary nerve', 'Radial nerve', 'Suprascapular nerve', 'Long thoracic nerve'],
        correctAnswer: 0,
        explanation: 'The axillary nerve (C5, C6) innervates the deltoid muscle.',
      },
      {
        id: 'q3',
        question: 'Which muscle is the primary flexor of the elbow?',
        options: ['Triceps brachii', 'Biceps brachii', 'Brachioradialis', 'Pronator teres'],
        correctAnswer: 1,
        explanation: 'The biceps brachii is the primary flexor of the elbow joint.',
      },
    ],
  },
  {
    id: 'quiz-2',
    topicId: 'cardiovascular',
    title: 'Cardiovascular Physiology Quiz',
    description: 'Test your understanding of heart function',
    questions: [
      {
        id: 'q1',
        question: 'What is the normal resting heart rate for an adult?',
        options: ['40-60 bpm', '60-100 bpm', '100-120 bpm', '120-140 bpm'],
        correctAnswer: 1,
        explanation: 'Normal resting heart rate for adults is 60-100 beats per minute.',
      },
      {
        id: 'q2',
        question: 'Which valve is located between the left atrium and left ventricle?',
        options: ['Tricuspid valve', 'Mitral valve', 'Aortic valve', 'Pulmonary valve'],
        correctAnswer: 1,
        explanation: 'The mitral (bicuspid) valve is located between the left atrium and left ventricle.',
      },
    ],
  },
];

export const getTopicsByDepartment = (departmentId: string) => {
  return topics.filter(t => t.departmentId === departmentId).sort((a, b) => a.order - b.order);
};

export const getDepartmentsByYear = (year: number) => {
  return departments.filter(d => d.years.includes(year));
};

export const getVideosByTopic = (topicId: string) => {
  return videoLessons.filter(v => v.topicId === topicId).sort((a, b) => a.order - b.order);
};

export const getQuizzesByTopic = (topicId: string) => {
  return quizzes.filter(q => q.topicId === topicId);
};
