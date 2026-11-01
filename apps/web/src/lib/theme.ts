import { useCallback, useEffect, useSyncExternalStore } from "react";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "theme";
const ORDER: ThemePreference[] = ["system", "light", "dark"];
const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage blocked: fall back to the system setting.
  }
  return "system";
}

function writePreference(pref: ThemePreference): void {
  try {
    if (pref === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // Storage blocked: the choice lasts until the page is closed.
  }
  current = pref;
  listeners.forEach((notify) => notify());
}

let current: ThemePreference = typeof window === "undefined" ? "system" : readPreference();

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

export function resolveTheme(pref: ThemePreference, systemDark: boolean): "light" | "dark" {
  if (pref === "system") return systemDark ? "dark" : "light";
  return pref;
}

export function nextPreference(pref: ThemePreference): ThemePreference {
  return ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
}

/** Current theme preference plus a function that steps to the next one. */
export function useTheme(): { preference: ThemePreference; cycle: () => void } {
  const preference = useSyncExternalStore(
    subscribe,
    () => current,
    () => "system" as const,
  );

  useEffect(() => {
    const query = darkQuery();
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(preference, query.matches);
    };
    apply();
    if (preference !== "system") return;
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [preference]);

  const cycle = useCallback(() => writePreference(nextPreference(current)), []);
  return { preference, cycle };
}
