import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  STORAGE_KEYS,
  isOnboardingInProgress,
  markManualNavNow,
  wasRecentManualNav,
  clearOnboardingState
} from './onboardingStorage';

const makeSessionStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
};

describe('onboardingStorage', () => {
  beforeEach(() => {
    globalThis.window = { sessionStorage: makeSessionStorage() };
  });

  afterEach(() => {
    delete globalThis.window;
    vi.restoreAllMocks();
  });

  it('marks manual nav and detects recent navigation', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    markManualNavNow();
    expect(wasRecentManualNav()).toBe(true);

    Date.now.mockReturnValue(3000);
    expect(wasRecentManualNav(1500)).toBe(false);
  });

  it('clears onboarding progress without removing manual nav marker', () => {
    window.sessionStorage.setItem(STORAGE_KEYS.inProgress, '1');
    window.sessionStorage.setItem(STORAGE_KEYS.stepIndex, '2');
    window.sessionStorage.setItem(STORAGE_KEYS.mode, 'auto');
    window.sessionStorage.setItem(STORAGE_KEYS.userNavAt, '123');

    clearOnboardingState();

    expect(window.sessionStorage.getItem(STORAGE_KEYS.inProgress)).toBe(null);
    expect(window.sessionStorage.getItem(STORAGE_KEYS.stepIndex)).toBe(null);
    expect(window.sessionStorage.getItem(STORAGE_KEYS.mode)).toBe(null);
    expect(window.sessionStorage.getItem(STORAGE_KEYS.userNavAt)).toBe('123');
  });

  it('detects in-progress state', () => {
    expect(isOnboardingInProgress()).toBe(false);
    window.sessionStorage.setItem(STORAGE_KEYS.inProgress, '1');
    expect(isOnboardingInProgress()).toBe(true);
  });
});
