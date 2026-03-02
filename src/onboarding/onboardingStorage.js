const getSessionStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage || null;
};

export const STORAGE_KEYS = {
  restart: 'onboarding_restart',
  replay: 'onboarding_replay',
  stepIndex: 'onboarding_step_index',
  mode: 'onboarding_mode',
  inProgress: 'onboarding_in_progress',
  userNavAt: 'onboarding_user_nav_at',
};

export function isOnboardingInProgress() {
  const storage = getSessionStorage();
  if (!storage) return false;
  return storage.getItem(STORAGE_KEYS.inProgress) === '1';
}

export function markManualNavNow() {
  const storage = getSessionStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEYS.userNavAt, String(Date.now()));
}

export function wasRecentManualNav(ms = 1500) {
  const storage = getSessionStorage();
  if (!storage) return false;
  const raw = storage.getItem(STORAGE_KEYS.userNavAt);
  const t = raw ? Number(raw) : 0;
  if (!Number.isFinite(t) || t <= 0) return false;
  return Date.now() - t < ms;
}

export function clearOnboardingState() {
  const storage = getSessionStorage();
  if (!storage) return;
  storage.removeItem(STORAGE_KEYS.inProgress);
  storage.removeItem(STORAGE_KEYS.stepIndex);
  storage.removeItem(STORAGE_KEYS.mode);
}
