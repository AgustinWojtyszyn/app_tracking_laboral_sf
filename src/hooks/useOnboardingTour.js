import { useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { driver } from 'driver.js';
import { getPlanByRole } from '@/onboarding/tourPlan';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  STORAGE_KEYS,
  wasRecentManualNav,
  clearOnboardingState
} from '@/onboarding/onboardingStorage';

const normalizeRole = (role) => {
  if (role === 'admin' || role === 'trabajador' || role === 'solicitante') return role;
  return 'solicitante';
};

const waitForSelector = (selector, timeoutMs = 5000) => new Promise((resolve) => {
  const start = Date.now();
  const timer = setInterval(() => {
    const element = document.querySelector(selector);
    if (element) {
      clearInterval(timer);
      resolve(element);
      return;
    }
    if (Date.now() - start >= timeoutMs) {
      clearInterval(timer);
      resolve(null);
    }
  }, 100);
});

const parseStoredIndex = () => {
  const raw = window.sessionStorage.getItem(STORAGE_KEYS.stepIndex);
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

const clearProgress = () => {
  clearOnboardingState();
};

const isRouteInPlan = (route, plan) => (
  Array.isArray(plan) && plan.some((step) => step.route === route)
);

export const useOnboardingTour = () => {
  const driverRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const storedLanguage = typeof window !== 'undefined' ? window.localStorage.getItem('jt-lang') : null;
  const resolvedLanguage = storedLanguage === 'en' || storedLanguage === 'es' ? storedLanguage : language;

  const safeNavigate = useCallback((route, plan) => {
    if (wasRecentManualNav()) return false;

    if (!route || typeof route !== 'string' || !route.startsWith('/app/') || !isRouteInPlan(route, plan)) {
      clearProgress();
      return false;
    }

    if (route === location.pathname) return false;
    navigate(route, { replace: true });
    return true;
  }, [location.pathname, navigate]);

  const runSegment = useCallback(async ({ plan, startIndex, mode, onComplete }) => {
    try {
      const route = location.pathname;
      let index = startIndex;
      const segmentSteps = [];

      while (index < plan.length && plan[index].route === route) {
        const step = plan[index];
        const element = await waitForSelector(step.selector, step.timeoutMs ?? 5000);
        if (element) {
          segmentSteps.push(step);
        }
        index += 1;
      }
      const nextIndex = index;

      if (segmentSteps.length === 0) {
        if (index >= plan.length) {
          clearProgress();
          return;
        }
        window.sessionStorage.setItem(STORAGE_KEYS.stepIndex, String(index));
        safeNavigate(plan[index].route, plan);
        return;
      }

      if (driverRef.current) {
        try {
          driverRef.current.destroy();
        } catch {
          // noop
        }
        driverRef.current = null;
      }

      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      let shouldContinue = true;

      const handleStop = () => {
        shouldContinue = false;
        if (driverRef.current) {
          try {
            driverRef.current.destroy();
          } catch {
            // noop
          }
        }
      };

      const isEn = resolvedLanguage === 'en';
      const driverObj = driver({
        showProgress: true,
        nextBtnText: isEn ? 'Next' : 'Siguiente',
        prevBtnText: isEn ? 'Previous' : 'Anterior',
        doneBtnText: isEn ? 'Done' : 'Finalizar',
        closeBtnText: isEn ? 'Close' : 'Cerrar',
        progressText: isEn ? 'Step {{current}} of {{total}}' : 'Paso {{current}} de {{total}}',
        stagePadding: isMobile ? 16 : 20,
        allowClose: true,
        disableActiveInteraction: false,
        steps: segmentSteps.map((step) => ({
          element: step.selector,
          popover: {
            title: step.title,
            description: step.description,
            side: isMobile ? 'bottom' : 'right',
            align: 'center'
          }
        })),
        onHighlightStarted: (element) => {
          if (element && element.scrollIntoView) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        },
        onCloseClick: handleStop,
        onSkipClick: handleStop,
        onDestroyed: () => {
          if (!shouldContinue) {
            clearProgress();
            return;
          }

          if (nextIndex >= plan.length) {
            clearProgress();
            if (mode !== 'replay' && typeof onComplete === 'function') {
              onComplete();
            }
            return;
          }

          window.sessionStorage.setItem(STORAGE_KEYS.stepIndex, String(nextIndex));
          safeNavigate(plan[nextIndex].route, plan);
        }
      });

      driverRef.current = driverObj;
      driverObj.drive();
    } catch {
      clearProgress();
    }
  }, [location.pathname, resolvedLanguage, safeNavigate]);

  const startTour = useCallback(({ role = 'solicitante', mode = 'auto', stepIndex = null, onComplete } = {}) => {
    if (typeof window === 'undefined') return false;

    try {
      const normalizedRole = normalizeRole(role);
      const plan = getPlanByRole(normalizedRole, resolvedLanguage);
      if (!plan || plan.length === 0) return false;

      const index = Number.isFinite(stepIndex) ? stepIndex : parseStoredIndex();
      const target = plan[index];
      if (!target) {
        clearProgress();
        return false;
      }

      window.sessionStorage.setItem(STORAGE_KEYS.inProgress, '1');
      window.sessionStorage.setItem(STORAGE_KEYS.mode, mode);
      window.sessionStorage.setItem(STORAGE_KEYS.stepIndex, String(index));

      if (target.route !== location.pathname) {
        return safeNavigate(target.route, plan);
      }

      runSegment({ plan, startIndex: index, mode, onComplete });
      return true;
    } catch {
      return false;
    }
  }, [location.pathname, resolvedLanguage, runSegment, safeNavigate]);

  const resumeTourIfNeeded = useCallback(({ role = 'solicitante', onComplete } = {}) => {
    if (typeof window === 'undefined') return false;

    const shouldRestart = window.sessionStorage.getItem(STORAGE_KEYS.restart) === '1';
    const shouldReplay = window.sessionStorage.getItem(STORAGE_KEYS.replay) === '1';
    const inProgress = window.sessionStorage.getItem(STORAGE_KEYS.inProgress) === '1';

    if (shouldRestart) {
      window.sessionStorage.removeItem(STORAGE_KEYS.restart);
      return startTour({ role, mode: 'restart', stepIndex: 0, onComplete });
    }

    if (shouldReplay) {
      window.sessionStorage.removeItem(STORAGE_KEYS.replay);
      return startTour({ role, mode: 'replay', stepIndex: 0 });
    }

    if (inProgress) {
      const mode = window.sessionStorage.getItem(STORAGE_KEYS.mode) || 'auto';
      const index = parseStoredIndex();
      return startTour({ role, mode, stepIndex: index, onComplete });
    }

    return false;
  }, [startTour]);

  return { startTour, resumeTourIfNeeded };
};
