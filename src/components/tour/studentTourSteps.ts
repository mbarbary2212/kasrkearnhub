import type { DriveStep } from 'driver.js';

export const studentTourSteps: DriveStep[] = [
  {
    element: '[data-tour="continue-card"]',
    popover: {
      title: 'Continue',
      description: 'Start here. This takes you back to exactly where you left off.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="flashcards-due"]',
    popover: {
      title: 'Daily reviews',
      description: 'Complete these first to keep knowledge fresh and maintain retention.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="today-plan"]',
    popover: {
      title: "Today's priorities",
      description: 'This shows what deserves your attention today.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="study-plan"]',
    popover: {
      title: 'Study path',
      description: 'Follow this step by step to stay organized.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="modules"]',
    popover: {
      title: 'Modules',
      description: 'Use this to explore topics or revise specific areas.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    popover: {
      title: "You're ready! 🎉",
      description: 'Start with your reviews, then follow today\'s plan.',
    },
  },
];
