import type { DriveStep } from 'driver.js';

export const adminTourSteps: DriveStep[] = [
  {
    element: '[data-tour="dashboard"]',
    popover: {
      title: 'Dashboard',
      description: 'Overview of activity and priorities.',
      side: 'right',
      align: 'center',
    },
  },
  {
    element: '[data-tour="learning"]',
    popover: {
      title: 'Modules',
      description: 'Manage and organize content.',
      side: 'right',
      align: 'center',
    },
  },
  {
    element: '[data-tour="overview"]',
    popover: {
      title: 'Analytics',
      description: 'Monitor engagement and performance.',
      side: 'right',
      align: 'center',
    },
  },
  {
    element: '[data-tour="admin-panel"]',
    popover: {
      title: 'Admin Panel',
      description: 'Full system control.',
      side: 'right',
      align: 'center',
    },
  },
  {
    popover: {
      title: 'You\'re ready! 🎉',
      description: 'Replay anytime from Settings.',
    },
  },
];
