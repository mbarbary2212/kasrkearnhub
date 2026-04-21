import type { DriveStep } from 'driver.js';

export const studentTourSteps: DriveStep[] = [
  {
    popover: {
      title: 'The KALM workflow',
      description:
        'KALM is built around four steps you repeat for every chapter: <strong>Learn</strong> (videos, flashcards, visual explanations, Socratic documents) → <strong>Interact</strong> (cases) → <strong>Practice</strong> (MCQs, SBA, OSCE, short essays, case scenarios) → <strong>Test</strong> yourself in a controlled environment of your choice. This tour shows where each of those lives.',
    },
  },
  {
    element: '[data-tour="continue-card"]',
    popover: {
      title: 'Resume exactly where you stopped',
      description:
        'KALM tracks your last position — mid-video, mid-MCQ, mid-case — and drops you back in one click. No need to remember what you were doing.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="today-plan"]',
    popover: {
      title: 'Priorities built from your actual data',
      description:
        'This panel reads your weak chapters, your classification tier (Safe / At Risk / Critical), and your exam dates, and surfaces what to tackle today. A second opinion on what you think you should study.',
      side: 'left',
      align: 'center',
    },
  },
  {
    element: '[data-tour="flashcards-due"]',
    popover: {
      title: 'Spaced-repetition flashcards (FSRS)',
      description:
        'These are flashcards from chapters you have already learned, scheduled by FSRS to appear exactly when your brain is about to forget them. Reviewing them daily is what keeps last month\'s study alive next month.',
      side: 'left',
      align: 'center',
    },
  },
  {
    element: '[data-tour="study-plan"]',
    popover: {
      title: 'Your day, planned',
      description:
        'Fill in <strong>Coach → Plan</strong> (exam date, daily hours, ambition) and this panel shows today\'s tasks with time estimates. Skip the Plan inputs and the panel stays empty.',
      side: 'left',
      align: 'center',
    },
  },
  {
    element: '[data-tour="modules"]',
    popover: {
      title: 'The full curriculum',
      description:
        'Use Modules to revise a specific area or open a chapter the plan did not pick. Each module shows a readiness bar. It turns green only after Practice is cleared — not after videos alone.',
      side: 'top',
      align: 'center',
    },
  },
  {
    popover: {
      title: 'Every chapter has four tabs — do them in order',
      description:
        '<strong>Resources</strong> — Learn. Videos, flashcards, visual explanations, Socratic documents.<br><strong>Interactive</strong> — Interact. Clinical cases, structured cases, virtual patient.<br><strong>Practice</strong> — MCQs, SBA, OSCE, matching, short essays, case scenarios.<br><strong>Test Yourself</strong> — Chapter exam in the format and time you choose.<br><br>The four tabs map 1-to-1 to the four steps of the workflow.',
    },
  },
  {
    popover: {
      title: 'The Coach reads your chapter',
      description:
        'Open the Coach when something does not click. It reads the chapter PDF you are currently in and answers from that material. For best results, open a chapter first.',
    },
  },
  {
    popover: {
      title: 'The honest verdict — Coach → Progress',
      description:
        'Readiness by chapter, weakest topics, days to exam. Check it weekly to decide what next week looks like.',
    },
  },
  {
    popover: {
      title: 'Daily rhythm',
      description:
        'Morning: Daily Reviews (flashcards) → today\'s priorities or plan. In each chapter: Learn → Interact → Practice → Test.',
    },
  },
];