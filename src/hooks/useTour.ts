import { useCallback, useRef } from 'react';
import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

type TourRole = 'student' | 'admin';

const TOUR_KEYS: Record<TourRole, string> = {
  student: 'kalm_tour_student_done',
  admin: 'kalm_tour_admin_done',
};

export function useTour(role: TourRole, steps: DriveStep[]) {
  const hasSeen = localStorage.getItem(TOUR_KEYS[role]) === 'true';
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  const markDone = useCallback(() => {
    localStorage.setItem(TOUR_KEYS[role], 'true');
  }, [role]);

  const startTour = useCallback(() => {
    const validSteps = steps.filter((step) => {
      if (!step.element) return true;
      return document.querySelector(step.element as string);
    });

    if (validSteps.length < 2) return;

    const d = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: 'rgba(0, 0, 0, 0.3)',
      stagePadding: 12,
      stageRadius: 12,
      popoverClass: 'kalm-tour-popover',
      doneBtnText: 'Finish',
      steps: validSteps,
      onDestroyStarted: () => {
        markDone();
        d.destroy();
      },
      onDestroyed: () => {
        markDone();
      },
    });

    driverRef.current = d;
    d.drive();
  }, [steps, markDone]);

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_KEYS[role]);
  }, [role]);

  // Listen for manual trigger only
  // No auto-start — FirstLoginModal or sidebar menu controls this
  return { startTour, hasSeen, resetTour };
}
