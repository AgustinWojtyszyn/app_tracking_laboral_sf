import { describe, expect, it } from 'vitest';
import { formatDate } from './formatters';

describe('formatDate', () => {
  it('keeps date-only calendar values on the same day', () => {
    expect(formatDate('2026-09-11')).toBe('11/09/2026');
  });

  it('formats timestamps in San Juan timezone', () => {
    expect(formatDate('2026-09-11T01:00:00.000Z')).toBe('10/09/2026');
  });

  it('rejects invalid calendar dates', () => {
    expect(formatDate('2026-02-31')).toBe('');
  });
});
