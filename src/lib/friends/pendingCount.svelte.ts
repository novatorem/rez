import { browser } from '$app/environment';

const SEEN_KEY = 'rez_friend_requests_seen';

let _count = $state(0);
let _hasUnseen = $state(false);

export function getPendingCount(): number {
  return _count;
}

export function setPendingCount(n: number): void {
  _count = n;
  if (n === 0) _hasUnseen = false;
}

export function getHasUnseen(): boolean {
  return _hasUnseen;
}

export function markUnseen(): void {
  _hasUnseen = true;
  if (browser) localStorage.removeItem(SEEN_KEY);
}

export function markSeen(): void {
  _hasUnseen = false;
  if (browser) localStorage.setItem(SEEN_KEY, '1');
}

export function initFromStorage(): void {
  if (!browser) return;
  if (_count > 0 && !localStorage.getItem(SEEN_KEY)) {
    _hasUnseen = true;
  }
}
