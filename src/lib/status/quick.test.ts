import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getQuickStatuses, saveQuickStatuses } from './quick';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null)
  };
})();

Object.defineProperty(globalThis, 'window', {
  value: { localStorage: localStorageMock },
  writable: true
});
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('getQuickStatuses', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('returns default statuses when nothing is stored', () => {
    const statuses = getQuickStatuses();
    expect(statuses).toHaveLength(4);
    expect(statuses[0].status_text).toBe('Travelling');
    expect(statuses[1].status_text).toBe('Sleeping');
    expect(statuses[2].status_text).toBe('Working');
    expect(statuses[3].status_text).toBe('Lounging');
  });

  it('returns stored statuses when available', () => {
    const stored = [
      { id: 'a', status_text: 'Coding', display_order: 0 },
      { id: 'b', status_text: 'Gaming', display_order: 1 }
    ];
    localStorageMock.setItem('rez_quick_statuses', JSON.stringify(stored));

    const statuses = getQuickStatuses();
    expect(statuses).toHaveLength(2);
    expect(statuses[0].status_text).toBe('Coding');
    expect(statuses[1].status_text).toBe('Gaming');
  });

  it('returns defaults for invalid JSON', () => {
    localStorageMock.setItem('rez_quick_statuses', 'not json');
    const statuses = getQuickStatuses();
    expect(statuses).toHaveLength(4);
  });

  it('filters out malformed entries', () => {
    const stored = [
      { id: 'a', status_text: 'Valid', display_order: 0 },
      { id: 123, status_text: 'Bad ID', display_order: 1 },
      { status_text: 'No ID', display_order: 2 }
    ];
    localStorageMock.setItem('rez_quick_statuses', JSON.stringify(stored));

    const statuses = getQuickStatuses();
    expect(statuses).toHaveLength(1);
    expect(statuses[0].status_text).toBe('Valid');
  });
});

describe('saveQuickStatuses', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('saves non-empty statuses to localStorage', () => {
    saveQuickStatuses(['Working', 'Gaming', '']);

    const stored = JSON.parse(localStorageMock.getItem('rez_quick_statuses')!);
    expect(stored).toHaveLength(2);
    expect(stored[0].status_text).toBe('Working');
    expect(stored[1].status_text).toBe('Gaming');
  });

  it('trims whitespace from statuses', () => {
    saveQuickStatuses(['  Coding  ']);

    const stored = JSON.parse(localStorageMock.getItem('rez_quick_statuses')!);
    expect(stored[0].status_text).toBe('Coding');
  });

  it('filters out empty and whitespace-only statuses', () => {
    saveQuickStatuses(['', '   ', 'Valid']);

    const stored = JSON.parse(localStorageMock.getItem('rez_quick_statuses')!);
    expect(stored).toHaveLength(1);
    expect(stored[0].status_text).toBe('Valid');
  });
});
