export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 20;
export const MAX_DISPLAY_NAME_LENGTH = 50;
export const USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]*$/;

export const ERROR_MESSAGES = {
  USERNAME_EMPTY: 'Username cannot be empty',
  USERNAME_TOO_SHORT: `Username must be at least ${MIN_USERNAME_LENGTH} characters`,
  USERNAME_TOO_LONG: `Username must be ${MAX_USERNAME_LENGTH} characters or less`,
  USERNAME_INVALID:
    'Must start with a letter. Letters, numbers, dots, dashes, and underscores only.',
  USERNAME_TAKEN: 'Username is already taken',
  DISPLAY_NAME_TOO_LONG: `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or less`,
  DISPLAY_NAME_EMPTY: 'Display name cannot be empty'
} as const;

export function validateUsername(username: string): string | null {
  if (username.length === 0) {
    return ERROR_MESSAGES.USERNAME_EMPTY;
  }
  if (username.length < MIN_USERNAME_LENGTH) {
    return ERROR_MESSAGES.USERNAME_TOO_SHORT;
  }
  if (username.length > MAX_USERNAME_LENGTH) {
    return ERROR_MESSAGES.USERNAME_TOO_LONG;
  }
  if (!USERNAME_PATTERN.test(username)) {
    return ERROR_MESSAGES.USERNAME_INVALID;
  }
  return null;
}

export function validateDisplayName(displayName: string): string | null {
  if (displayName.length === 0) {
    return ERROR_MESSAGES.DISPLAY_NAME_EMPTY;
  }
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return ERROR_MESSAGES.DISPLAY_NAME_TOO_LONG;
  }
  return null;
}

export function sanitizeUsername(username: string): string {
  return username.trim();
}

export function sanitizeDisplayName(displayName: string): string {
  return displayName.trim();
}
