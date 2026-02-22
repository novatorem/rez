export const MAX_STATUS_LENGTH = 42;

export function validateStatus(status: string): string | null {
	if (status.length > MAX_STATUS_LENGTH) {
		return `Status must be ${MAX_STATUS_LENGTH} characters or less`;
	}
	return null;
}
