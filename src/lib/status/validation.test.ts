import { describe, it, expect } from 'vitest';
import { validateStatus, MAX_STATUS_LENGTH } from './validation';

describe('validateStatus', () => {
  it('accepts empty status', () => {
    expect(validateStatus('')).toBeNull();
  });

  it('accepts status within limit', () => {
    expect(validateStatus('Working')).toBeNull();
    expect(validateStatus('a'.repeat(MAX_STATUS_LENGTH))).toBeNull();
  });

  it('rejects status exceeding limit', () => {
    const long = 'a'.repeat(MAX_STATUS_LENGTH + 1);
    expect(validateStatus(long)).toBe(`Status must be ${MAX_STATUS_LENGTH} characters or less`);
  });

  it('enforces documented max length constant', () => {
    expect(MAX_STATUS_LENGTH).toBe(42);
  });
});
