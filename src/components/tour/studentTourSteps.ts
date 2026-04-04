import type { DriveStep } from 'driver.js';

export const studentTourSteps: DriveStep[] = [
  {
    element: '[data-tour="dashboard"]',
    popover: {
      title: 'Dashboard',
      description: 'Start here. Continue where you stopped and see today\'s focus.',
      side: 'right',
      align: 'center',
    },
  },
  {
    element: '[data-tour="learning"]',
    popover: {
      title: 'Learning',
      description: 'Study the material before testing yourself.',
      side: 'right',
      align: 'center',
    },
  },
  {
    element: '[data-tour="connect"]',
    popover: {
      title: 'Connect',
      description: 'Ask questions or contact your module lead.',
      side: 'right',
      align: 'center',
    },
  },
  {
    element: '[data-tour="coach"]',
    popover: {
      title: 'Coach',
      description: 'Track your readiness and weak points.',
      side: 'right',
      align: 'center',
    },
  },
  {
    element: '[data-tour="settings"]',
    popover: {
      title: 'Settings',
      description: 'Customize your experience and access additional tools.',
      side: 'right',
      align: 'center',
    },
  },
  {
    popover: {
      title: 'You\'re ready! 🎉',
      description: 'Use "Take a Tour" anytime from Settings to replay this guide.',
    },
  },
];
