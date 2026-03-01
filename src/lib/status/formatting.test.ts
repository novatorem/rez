import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatStatusUpdatedAt, formatStatusUpdatedAtTooltip } from './formatting';

describe('formatStatusUpdatedAt', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-02-26T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns empty string for null', () => {
		expect(formatStatusUpdatedAt(null)).toBe('');
	});

	it('returns "just now" for less than a minute ago', () => {
		const thirtySecondsAgo = new Date('2026-02-26T11:59:35Z').toISOString();
		expect(formatStatusUpdatedAt(thirtySecondsAgo)).toBe('just now');
	});

	it('returns minutes ago', () => {
		const fiveMinAgo = new Date('2026-02-26T11:55:00Z').toISOString();
		expect(formatStatusUpdatedAt(fiveMinAgo)).toBe('5m ago');
	});

	it('returns hours ago', () => {
		const threeHoursAgo = new Date('2026-02-26T09:00:00Z').toISOString();
		expect(formatStatusUpdatedAt(threeHoursAgo)).toBe('3h ago');
	});

	it('returns days ago', () => {
		const twoDaysAgo = new Date('2026-02-24T12:00:00Z').toISOString();
		expect(formatStatusUpdatedAt(twoDaysAgo)).toBe('2d ago');
	});

	it('returns formatted date for older than a week', () => {
		const twoWeeksAgo = new Date('2026-02-10T12:00:00Z').toISOString();
		const result = formatStatusUpdatedAt(twoWeeksAgo);
		expect(result).toContain('Feb');
		expect(result).toContain('10');
	});

	it('includes year for dates in a different year', () => {
		const lastYear = new Date('2025-06-15T12:00:00Z').toISOString();
		const result = formatStatusUpdatedAt(lastYear);
		expect(result).toContain('2025');
	});
});

describe('formatStatusUpdatedAtTooltip', () => {
	it('returns empty string for null', () => {
		expect(formatStatusUpdatedAtTooltip(null)).toBe('');
	});

	it('returns full formatted date string', () => {
		const date = new Date('2026-02-26T14:30:45Z').toISOString();
		const result = formatStatusUpdatedAtTooltip(date);
		expect(result).toContain('2026');
		expect(result).toContain('February');
		expect(result).toContain('26');
	});
});
