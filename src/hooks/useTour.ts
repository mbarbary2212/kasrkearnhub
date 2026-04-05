import { useEffect, useCallback, useRef, useState } from 'react';
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
  const [tourReady, setTourReady] = useState(false);

  const markDone = useCallback(() => {
    localStorage.setItem(TOUR_KEYS[role], 'true');
  }, [role]);

  const startTour = useCallback(() => {
    // Filter steps to only include those with existing elements
    const validSteps = steps.filter((step) => {
      if (!step.element) return true; // final step with no element
      return document.querySelector(step.element as string);
    });

    if (validSteps.length < 2) return;

    const d = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: 'rgba(0, 0, 0, 0.6)',
      stagePadding: 8,
      stageRadius: 12,
      popoverClass: 'kalm-tour-popover',
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

  // Auto-start on first visit
  useEffect(() => {
    if (hasSeen) return;
    const timer = setTimeout(() => {
      setTourReady(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [hasSeen]);

  useEffect(() => {
    if (tourReady && !hasSeen) {
      startTour();
    }
  }, [tourReady, hasSeen, startTour]);

  // Listen for manual trigger
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.role === role) {
        startTour();
      }
    };
    window.addEventListener('kalm:start-tour', handler);
    return () => window.removeEventListener('kalm:start-tour', handler);
  }, [role, startTour]);

  return { startTour, hasSeen, resetTour };
}
