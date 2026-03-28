export interface QuickStatus {
  id: string;
  status_text: string;
  display_order: number;
}

const QUICK_STATUS_STORAGE_KEY = 'rez_quick_statuses';

export function getQuickStatuses(): QuickStatus[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const stored = localStorage.getItem(QUICK_STATUS_STORAGE_KEY);
    if (!stored) {
      return getDefaultQuickStatuses();
    }

    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.status_text === 'string' &&
          typeof item.display_order === 'number'
      );
    }
    return getDefaultQuickStatuses();
  } catch (error) {
    console.warn('Failed to parse quick statuses from localStorage:', error);
    return getDefaultQuickStatuses();
  }
}

export function saveQuickStatuses(statuses: string[]): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    console.warn('localStorage not available');
    return;
  }

  try {
    const validStatuses: QuickStatus[] = statuses
      .map((text, index) => ({ text: text.trim(), order: index }))
      .filter((qs) => qs.text.length > 0)
      .map((qs) => ({
        id: `local_${qs.order}_${Date.now()}`,
        status_text: qs.text,
        display_order: qs.order
      }));

    localStorage.setItem(QUICK_STATUS_STORAGE_KEY, JSON.stringify(validStatuses));
  } catch (error) {
    console.error('Failed to save quick statuses to localStorage:', error);
  }
}

function getDefaultQuickStatuses(): QuickStatus[] {
  return [
    { id: 'default_0', status_text: 'Travelling', display_order: 0 },
    { id: 'default_1', status_text: 'Sleeping', display_order: 1 },
    { id: 'default_2', status_text: 'Working', display_order: 2 },
    { id: 'default_3', status_text: 'Lounging', display_order: 3 }
  ];
}
