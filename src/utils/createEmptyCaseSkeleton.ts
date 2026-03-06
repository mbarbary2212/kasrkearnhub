import { SectionType, StructuredCaseData } from '@/types/structuredCase';

/**
 * Creates an empty but structurally valid StructuredCaseData skeleton
 * so admins can fill in each section manually via the inline editors.
 */
export function createEmptyCaseSkeleton(sections: SectionType[]): StructuredCaseData {
  const data: StructuredCaseData = {
    professional_attitude: {
      max_score: 10,
      items: [
        { key: 'introduction', label: 'Introduced themselves appropriately' },
        { key: 'consent', label: 'Obtained verbal consent' },
        { key: 'empathy', label: 'Showed empathy and active listening' },
        { key: 'communication', label: 'Used clear, jargon-free language' },
        { key: 'closure', label: 'Summarised and offered questions' },
      ],
      scoring_note: 'Scored holistically based on overall professional conduct',
    },
  };

  for (const s of sections) {
    switch (s) {
      case 'history_taking':
        data.history_taking = {
          mode: 'full_conversation',
          max_score: 30,
          checklist: [
            {
              key: 'presenting_complaint',
              label: 'Presenting Complaint',
              items: [{ key: 'pc_1', label: 'Onset, duration, character' }],
            },
            {
              key: 'associated_symptoms',
              label: 'Associated Symptoms',
              items: [{ key: 'as_1', label: 'Relevant positive/negative findings' }],
            },
          ],
          comprehension_questions: [],
        };
        break;

      case 'physical_examination':
        data.physical_examination = {
          max_score: 20,
          regions: {
            general: { label: 'General Appearance', finding: '' },
            vital_signs: { label: 'Vital Signs', finding: '' },
          },
        };
        break;

      case 'investigations_labs':
        data.investigations_labs = {
          max_score: 15,
          key_tests: [],
          available_tests: {
            cbc: { label: 'CBC', result: '', interpretation: '', is_key: false, points: 1 },
          },
        };
        break;

      case 'investigations_imaging':
        data.investigations_imaging = {
          max_score: 10,
          key_investigations: [],
          available_imaging: {
            xray_chest: { label: 'Chest X-ray', result: '', interpretation: '', is_key: false, points: 1 },
          },
        };
        break;

      case 'diagnosis':
        data.diagnosis = {
          max_score: 15,
          rubric: {
            possible_diagnosis: {
              label: 'Possible Diagnosis',
              expected: [],
              points: 3,
              model_answer: '',
            },
            differential_diagnosis: {
              label: 'Differential Diagnosis',
              expected: [],
              points: 5,
              model_answer: '',
            },
            final_diagnosis: {
              label: 'Final Diagnosis',
              expected_top: '',
              reasoning_points: [],
              points: 7,
              model_answer: '',
            },
          },
        };
        break;

      case 'medical_management':
        data.medical_management = {
          max_score: 15,
          questions: [
            {
              id: 'med_q1',
              type: 'free_text',
              question: '',
              points: 5,
              rubric: { expected_points: [], model_answer: '', points: 5 },
            },
          ],
        };
        break;

      case 'surgical_management':
        data.surgical_management = {
          max_score: 15,
          questions: [
            {
              id: 'surg_q1',
              type: 'free_text',
              question: '',
              points: 5,
              rubric: { expected_points: [], model_answer: '', points: 5 },
            },
          ],
        };
        break;

      case 'monitoring_followup':
        data.monitoring_followup = {
          max_score: 10,
          question: '',
          rubric: { expected_points: [], model_answer: '', points: 10 },
        };
        break;

      case 'patient_family_advice':
        data.patient_family_advice = {
          max_score: 10,
          question: '',
          rubric: { expected_points: [], model_answer: '', points: 10 },
        };
        break;

      case 'conclusion':
        data.conclusion = {
          max_score: 10,
          tasks: [
            {
              id: 'task_1',
              type: 'ward_round_presentation',
              label: 'Ward Round Presentation',
              instruction: '',
              rubric: { expected_structure: [], model_answer: '', points: 10 },
            },
          ],
        };
        break;
    }
  }

  return data;
}
