/**
 * Format datetime for display in a user-friendly format
 * @param updatedAt - ISO datetime string or null
 * @returns Formatted string like "2h ago" or "Dec 15"
 */
export const formatStatusUpdatedAt = (updatedAt: string | null): string => {
	if (!updatedAt) return '';

	const date = new Date(updatedAt);
	const now = new Date();
	const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

	if (diffInMinutes < 1) return 'just now';
	if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

	const diffInHours = Math.floor(diffInMinutes / 60);
	if (diffInHours < 24) return `${diffInHours}h ago`;

	const diffInDays = Math.floor(diffInHours / 24);
	if (diffInDays < 7) return `${diffInDays}d ago`;

	// For older dates, show the actual date
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {})
	});
};

/**
 * Format datetime for tooltip display with full date and time
 * @param updatedAt - ISO datetime string or null
 * @returns Formatted string like "Monday, December 15, 2024 at 2:30:45 PM EST"
 */
export const formatStatusUpdatedAtTooltip = (updatedAt: string | null): string => {
	if (!updatedAt) return '';

	const date = new Date(updatedAt);
	return date.toLocaleString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		second: '2-digit',
		timeZoneName: 'short'
	});
};
