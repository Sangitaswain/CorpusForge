import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'cf-theme';

function readStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'dark' ? 'dark' : 'light';
}

// Module-level store so every component calling useTheme() shares one source
// of truth. Without this, each call site held its own useState copy and a
// toggle from (e.g.) the sidebar would not repaint the graph canvas, which
// reads the theme via a separate instance, until that instance remounted.
let currentTheme: Theme = readStoredTheme();
const listeners = new Set<() => void>();

function applyTheme(theme: Theme) {
  document.documentElement.className = theme === 'dark' ? 'dark' : '';
  localStorage.setItem(STORAGE_KEY, theme);
}

// Apply once at module load so the first paint is already consistent.
applyTheme(currentTheme);

function setTheme(theme: Theme) {
  if (theme === currentTheme) return;
  currentTheme = theme;
  applyTheme(currentTheme);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return currentTheme;
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot);
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  return { theme, toggleTheme };
}
