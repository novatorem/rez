import { describe, it, expect } from 'vitest';
import {
	validateUsername,
	validateDisplayName,
	sanitizeUsername,
	sanitizeDisplayName,
	MIN_USERNAME_LENGTH,
	MAX_USERNAME_LENGTH,
	MAX_DISPLAY_NAME_LENGTH,
	ERROR_MESSAGES
} from './validation';

describe('validateUsername', () => {
	it('rejects empty username', () => {
		expect(validateUsername('')).toBe(ERROR_MESSAGES.USERNAME_EMPTY);
	});

	it('rejects username shorter than minimum', () => {
		expect(validateUsername('ab')).toBe(ERROR_MESSAGES.USERNAME_TOO_SHORT);
		expect(validateUsername('a')).toBe(ERROR_MESSAGES.USERNAME_TOO_SHORT);
	});

	it('accepts username at minimum length', () => {
		expect(validateUsername('abc')).toBeNull();
	});

	it('rejects username exceeding max length', () => {
		const long = 'a'.repeat(MAX_USERNAME_LENGTH + 1);
		expect(validateUsername(long)).toBe(ERROR_MESSAGES.USERNAME_TOO_LONG);
	});

	it('accepts username at max length', () => {
		const exact = 'a'.repeat(MAX_USERNAME_LENGTH);
		expect(validateUsername(exact)).toBeNull();
	});

	it('rejects username starting with a number', () => {
		expect(validateUsername('1user')).toBe(ERROR_MESSAGES.USERNAME_INVALID);
	});

	it('rejects username starting with a dot', () => {
		expect(validateUsername('.user')).toBe(ERROR_MESSAGES.USERNAME_INVALID);
	});

	it('rejects username with spaces', () => {
		expect(validateUsername('user name')).toBe(ERROR_MESSAGES.USERNAME_INVALID);
	});

	it('rejects username with special characters', () => {
		expect(validateUsername('user@name')).toBe(ERROR_MESSAGES.USERNAME_INVALID);
		expect(validateUsername('user!name')).toBe(ERROR_MESSAGES.USERNAME_INVALID);
	});

	it('accepts valid usernames', () => {
		expect(validateUsername('alice')).toBeNull();
		expect(validateUsername('Bob42')).toBeNull();
		expect(validateUsername('user.name')).toBeNull();
		expect(validateUsername('user-name')).toBeNull();
		expect(validateUsername('user_name')).toBeNull();
		expect(validateUsername('A.b-c_1')).toBeNull();
	});

	it('enforces documented length constants', () => {
		expect(MIN_USERNAME_LENGTH).toBe(3);
		expect(MAX_USERNAME_LENGTH).toBe(20);
	});
});

describe('validateDisplayName', () => {
	it('rejects empty display name', () => {
		expect(validateDisplayName('')).toBe(ERROR_MESSAGES.DISPLAY_NAME_EMPTY);
	});

	it('rejects display name exceeding max length', () => {
		const long = 'a'.repeat(MAX_DISPLAY_NAME_LENGTH + 1);
		expect(validateDisplayName(long)).toBe(ERROR_MESSAGES.DISPLAY_NAME_TOO_LONG);
	});

	it('accepts display name at max length', () => {
		const exact = 'a'.repeat(MAX_DISPLAY_NAME_LENGTH);
		expect(validateDisplayName(exact)).toBeNull();
	});

	it('accepts normal display names', () => {
		expect(validateDisplayName('Alice Smith')).toBeNull();
		expect(validateDisplayName('Bob')).toBeNull();
	});

	it('enforces documented max length constant', () => {
		expect(MAX_DISPLAY_NAME_LENGTH).toBe(50);
	});
});

describe('sanitizeUsername', () => {
	it('trims whitespace', () => {
		expect(sanitizeUsername('  alice  ')).toBe('alice');
	});

	it('returns trimmed value unchanged', () => {
		expect(sanitizeUsername('bob')).toBe('bob');
	});
});

describe('sanitizeDisplayName', () => {
	it('trims whitespace', () => {
		expect(sanitizeDisplayName('  Alice  ')).toBe('Alice');
	});

	it('returns trimmed value unchanged', () => {
		expect(sanitizeDisplayName('Bob')).toBe('Bob');
	});
});
