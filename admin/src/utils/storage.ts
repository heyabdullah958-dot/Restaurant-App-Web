/**
 * Safe Persistent Storage Utilities
 * Protects application from hydration crashes, malformed JSON, and quota exceptions during page reloads.
 */

export const safeGetLocalStorage = (key: string, defaultValue: string = ''): string => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item !== null ? item : defaultValue;
  } catch (error) {
    console.warn(`[Storage] Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
};

export const safeSetLocalStorage = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`[Storage] Error writing localStorage key "${key}":`, error);
  }
};

export const safeRemoveLocalStorage = (key: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[Storage] Error removing localStorage key "${key}":`, error);
  }
};

export const safeGetJSON = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? (parsed as T) : fallback;
  } catch (error) {
    console.warn(`[Storage] Error parsing JSON for key "${key}":`, error);
    return fallback;
  }
};

export const safeSetJSON = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[Storage] Error setting JSON for key "${key}":`, error);
  }
};

export const safeGetSessionStorage = (key: string, defaultValue: string = ''): string => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.sessionStorage.getItem(key);
    return item !== null ? item : defaultValue;
  } catch (error) {
    console.warn(`[Storage] Error reading sessionStorage key "${key}":`, error);
    return defaultValue;
  }
};

export const safeSetSessionStorage = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch (error) {
    console.warn(`[Storage] Error writing sessionStorage key "${key}":`, error);
  }
};

export const safeClearSessionStorage = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.clear();
  } catch (error) {
    console.warn('[Storage] Error clearing sessionStorage:', error);
  }
};
