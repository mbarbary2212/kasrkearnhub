import type { DriveStep } from 'driver.js';

export const studentTourSteps: DriveStep[] = [
  {
    popover: {
      title: 'The KALM workflow',
      description:
        'Every chapter follows four steps: <strong>Learn</strong> (videos, flashcards, etc.) → <strong>Interact</strong> (cases) → <strong>Practice</strong> (MCQs, OSCE, etc.) → <strong>Test</strong> yourself.',
    },
  },
  {
    element: '[data-tour="continue-card"]',
    popover: {
      title: 'Resume where you stopped',
      description: 'One click and you\'re back — mid-video, mid-MCQ, mid-case. No remembering.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="today-plan"]',
    popover: {
      title: 'Your priorities',
      description: 'Built from your weak chapters, classification tier, and exam dates. A second opinion on what to study today.',
      side: 'left',
      align: 'center',
    },
  },
  {
    element: '[data-tour="flashcards-due"]',
    popover: {
      title: 'FSRS flashcards',
      description: 'Cards your brain is about to forget, scheduled by FSRS. Ten minutes daily keeps last month\'s study alive.',
      side: 'left',
      align: 'center',
    },
  },
  {
    element: '[data-tour="study-plan"]',
    popover: {
      title: 'Your day, planned',
      description: 'Fill <strong>Coach → Plan</strong> (exam date, hours, ambition) and your tasks appear here with time estimates.',
      side: 'left',
      align: 'center',
    },
  },
  {
    element: '[data-tour="modules"]',
    popover: {
      title: 'Full curriculum',
      description: 'Revise or jump to any chapter. Readiness bar turns green only after Practice — not just videos.',
      side: 'top',
      align: 'center',
    },
  },
  {
    popover: {
      title: 'Inside every chapter — four tabs',
      description:
        '<strong>Resources</strong> — Learn.<br><strong>Interactive</strong> — Apply.<br><strong>Practice</strong> — Stress-test.<br><strong>Test Yourself</strong> — Verify.',
    },
  },
  {
    element: '[data-tour="coach-icon"]',
    popover: {
      title: 'Ask the Coach',
      description: 'Stuck? Click the icon bottom-right. It reads your chapter PDF and answers from that. Open a chapter first.',
      side: 'left',
      align: 'center',
    },
  },
  {
    element: '[data-tour="coach"]',
    popover: {
      title: 'Coach page — plan and progress',
      description: 'The sidebar Coach holds your <strong>Goals</strong>, adaptive <strong>Plan</strong>, and honest <strong>Progress</strong>. Check Progress weekly.',
      side: 'right',
      align: 'center',
    },
  },
  {
    popover: {
      title: 'Daily rhythm',
      description: 'Morning: Daily Reviews → priorities or plan. In each chapter: Learn → Interact → Practice → Test.',
    },
  },
];
