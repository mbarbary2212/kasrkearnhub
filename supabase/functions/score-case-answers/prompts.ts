/**
 * Build the scoring prompt for each section type.
 */
export function buildScoringPrompt(
  sectionType: string,
  studentAnswer: any,
  expectedData: any
): string {
  const base = `Section: ${sectionType}\nMax Score: ${expectedData.max_score}\n\nStudent Answer:\n${JSON.stringify(studentAnswer, null, 2)}\n\n`;

  const passRule = `\nIMPORTANT: If the student's answer is literally "pass" (case-insensitive) for any free-text field, award 0 points for that item with justification "Student chose to skip."\n`;

  switch (sectionType) {
    case 'history_taking':
      return (
        base +
        `History mode: ${expectedData.mode}\n` +
        `Comprehension Questions with correct answers:\n${JSON.stringify(expectedData.comprehension_questions, null, 2)}\n\n` +
        `Score based on: accuracy of comprehension answers compared to correct_answer fields.` +
        passRule
      );

    case 'physical_examination':
      return (
        base +
        `Available findings by region:\n${JSON.stringify(expectedData.findings || expectedData.regions, null, 2)}\n\n` +
        `Note: ${expectedData.note || 'N/A'}\n` +
        `The student examined some regions and wrote a findings_summary.\n` +
        `Score based on: how well the student's findings_summary identifies the key/abnormal findings from the revealed regions. ` +
        `Award credit for correctly identifying significant clinical signs. ` +
        `This section max_score is ${expectedData.max_score}.` +
        passRule
      );

    case 'investigations_labs':
      return (
        base +
        `Key tests (should be ordered): ${JSON.stringify(expectedData.key_tests)}\n` +
        `All available tests:\n${JSON.stringify(expectedData.available_tests, null, 2)}\n\n` +
        `Score based on: did the student order the key tests?\n` +
        `PENALTY: Deduct 1 point for each NON-KEY test ordered (to discourage selecting all tests). The final score cannot go below 0.` +
        passRule
      );

    case 'investigations_imaging':
      return (
        base +
        `Key investigations: ${JSON.stringify(expectedData.key_investigations)}\n` +
        `All available imaging:\n${JSON.stringify(expectedData.available_imaging, null, 2)}\n\n` +
        `Score based on: did the student select the key imaging studies?\n` +
        `PENALTY: Deduct 1 point for each NON-KEY imaging study ordered. Unnecessary imaging exposes patients to risk and cost. The final score cannot go below 0.` +
        passRule
      );

    case 'diagnosis':
      return (
        base +
        `Diagnosis Rubric:\n${JSON.stringify(expectedData.rubric, null, 2)}\n\n` +
        `Score based on: compare student's possible_diagnosis, differential_diagnosis, and final_diagnosis against the rubric's model_answer and expected values. Award points per rubric item.` +
        passRule
      );

    case 'medical_management':
    case 'surgical_management': {
      const questions = expectedData.questions || [];
      const correctAnswers = questions.map((q: any) => ({
        id: q.id,
        type: q.type,
        correct: q.correct,
        explanation: q.explanation,
        model_answer: q.rubric?.model_answer,
        expected_points: q.rubric?.expected_points,
        points: q.points || q.rubric?.points,
      }));
      return (
        base +
        `Questions with correct answers:\n${JSON.stringify(correctAnswers, null, 2)}\n\n` +
        `Score MCQs: award full points if student selected the correct letter, 0 otherwise.\n` +
        `Score free_text: compare against model_answer and expected_points.` +
        passRule
      );
    }

    case 'monitoring_followup':
    case 'patient_family_advice':
      return (
        base +
        `Question: ${expectedData.question}\n` +
        `Rubric:\n` +
        `  Expected points: ${JSON.stringify(expectedData.rubric?.expected_points)}\n` +
        `  Model answer: ${expectedData.rubric?.model_answer}\n\n` +
        `Score based on: how many expected points the student covered. Award partial credit.` +
        passRule
      );

    case 'conclusion': {
      const tasks = expectedData.tasks || [];
      return (
        base +
        `Conclusion Tasks:\n${JSON.stringify(tasks.map((t: any) => ({
          id: t.id,
          type: t.type,
          label: t.label,
          rubric: t.rubric,
        })), null, 2)}\n\n` +
        `Score each task against its rubric. Sum points across tasks.` +
        passRule
      );
    }

    default:
      return base + `Score this section. Max score: ${expectedData.max_score || 10}` + passRule;
  }
}
