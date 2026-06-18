const SIDEBAR_COOKIE_NAME = 'sidebar_state';
const WORKBENCH_STORAGE_KEY = '{{kebabName}}.workbench.open';

export function readSidebarOpenPreference(): boolean {
  if (typeof document === 'undefined') {
    return true;
  }

  const cookies = document.cookie.split(';').map((part) => part.trim());
  const rawCookie = cookies.find((entry) =>
    entry.startsWith(`${SIDEBAR_COOKIE_NAME}=`)
  );

  if (!rawCookie) {
    return true;
  }

  return rawCookie.split('=')[1] !== 'false';
}

export function readWorkbenchOpenPreference(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(WORKBENCH_STORAGE_KEY) === 'true';
}

export function persistWorkbenchOpenPreference(open: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(WORKBENCH_STORAGE_KEY, String(open));
}
